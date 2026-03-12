import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .models.device import DeviceMode
from .core.discovery import DiscoveryService, get_local_ip
from .core.device_manager import DeviceManager
from .services.file_scanner import FileScanner
from .services.file_search import FileSearchService
from .services.ai_orchestrator import AIOrchestrator
from .services.file_transfer import FileTransferService
from .api import router
from .api import dependencies as deps
from .database import init_db, get_db
from .models.db_models import UserSettings
from .utils.encryption import decrypt_api_key
from .config import settings as app_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Generate a unique device ID
import uuid
DEVICE_ID = str(uuid.uuid4())[:8]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - initialize and cleanup resources"""
    logger.info(f"Starting Personal Assistant on device {DEVICE_ID}")
    logger.info(f"Mode: {settings.device_mode}")
    logger.info(f"Local IP: {get_local_ip()}")

    # Initialize database
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully")

    # Initialize device manager
    device_manager = DeviceManager(DEVICE_ID)
    await device_manager.start()
    deps.set_device_manager(device_manager)

    # Initialize file scanner
    file_scanner = FileScanner(DEVICE_ID)
    deps.set_file_scanner(file_scanner)

    # Initialize file search service
    file_search = FileSearchService(
        scanner=file_scanner,
        device_name=settings.device_name
    )
    deps.set_file_search(file_search)

    # Initialize file transfer service
    def get_device_url(device_id: str):
        device = device_manager.get_device(device_id)
        return device.url if device else None

    file_transfer = FileTransferService(get_device_url)
    deps.set_file_transfer(file_transfer)

    # Initialize AI orchestrator
    ai_orchestrator = AIOrchestrator(
        file_search=file_search,
        get_devices_callback=lambda: device_manager.get_all_devices(include_local=True),
        search_remote_callback=None,  # TODO: Implement remote search
    )

    # Set up settings callback to load user AI settings from database
    async def load_ai_settings():
        """Load AI settings from database for the orchestrator"""
        async for db in get_db():
            try:
                user_settings = await UserSettings.get_settings(db)

                # Decrypt API key if exists
                api_key = None
                if user_settings.api_key_encrypted:
                    encryption_key = app_settings.encryption_key or "default-key"
                    try:
                        api_key = decrypt_api_key(user_settings.api_key_encrypted, encryption_key)
                        logger.debug(f"API key decrypted successfully (length: {len(api_key) if api_key else 0})")
                    except Exception as e:
                        logger.warning(f"Failed to decrypt API key (key mismatch or corruption): {e}")
                        logger.debug(f"Encryption key used: '{encryption_key[:4]}...' (length: {len(encryption_key)})")
                else:
                    logger.debug("No encrypted API key found in database")

                # Get the appropriate model based on provider
                model = None
                if user_settings.ai_provider == "openai":
                    model = user_settings.openai_model
                elif user_settings.ai_provider == "anthropic":
                    model = user_settings.anthropic_model
                elif user_settings.ai_provider == "glm":
                    model = user_settings.glm_model
                else:
                    model = user_settings.model

                # Build settings dictionary for orchestrator
                return {
                    "ai_provider": user_settings.ai_provider,
                    "model": model,
                    "api_key": api_key,
                    "base_url": user_settings.base_url,
                    "nl_search_enabled": user_settings.nl_search_enabled,
                }
            except Exception as e:
                logger.error(f"Failed to load AI settings from database: {e}")
                return None

    ai_orchestrator.set_settings_callback(load_ai_settings)
    deps.set_ai_orchestrator(ai_orchestrator)

    # Initialize discovery service
    discovery = DiscoveryService(
        device_id=DEVICE_ID,
        device_name=settings.device_name,
        port=settings.port,
        mode=DeviceMode.PRIMARY if settings.is_primary else DeviceMode.AGENT,
        on_device_discovered=None,  # TODO: Auto-register discovered devices
    )
    await discovery.start()
    deps.set_discovery_service(discovery)

    # Start initial file scan in background
    async def initial_scan():
        logger.info("Starting initial file scan...")
        count = await file_scanner.scan_all()
        logger.info(f"Indexed {count} files")

    asyncio.create_task(initial_scan())

    logger.info("Startup complete!")

    yield

    # Cleanup
    logger.info("Shutting down...")
    await discovery.stop()
    await device_manager.stop()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Personal Assistant",
    description="Cross-device file search with AI",
    version="0.1.0",
    lifespan=lifespan,
    default=lambda: json.dumps(cls=DateTimeAwareEncoder),
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "device_id": DEVICE_ID,
        "device_name": settings.device_name,
        "mode": settings.device_mode,
    }


# QR code registration endpoint
@app.get("/register/qr")
async def get_registration_qr():
    """Get QR code data for device registration"""
    import qrcode
    from io import BytesIO
    import base64

    local_ip = get_local_ip()
    registration_url = f"http://{local_ip}:{settings.port}/api/devices/register?auto=1"

    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(registration_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return {
        "registration_url": registration_url,
        "qr_code_base64": img_str,
        "device_name": settings.device_name,
        "device_id": DEVICE_ID,
    }


# Serve static files (for frontend) - will be built later
# static_path = Path(__file__).parent.parent / "frontend" / "dist"
# if static_path.exists():
#     app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
