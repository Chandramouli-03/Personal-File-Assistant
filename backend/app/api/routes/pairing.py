"""
Pairing API routes for device registration flow.
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from ...database import get_db
from ...models.db_models import Device, PairingSession, DeviceStatus, DeviceMode
from ...config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pairing", tags=["pairing"])


# ============================================
# Request/Response Models
# ============================================

class CreatePairingRequest(BaseModel):
    """Request to create a new pairing session"""
    device_type: str  # linux, windows, mobile


class PairingResponse(BaseModel):
    """Response with pairing details"""
    pairing_id: str
    pairing_code: str
    device_type: str
    expires_at: str
    pairing_url: str


class CompletePairingRequest(BaseModel):
    """Request to complete pairing from secondary device"""
    name: str
    scan_paths: list[str] = []
    os_type: str = "unknown"


class CompletePairingResponse(BaseModel):
    """Response after successful pairing"""
    device_id: str
    device_name: str
    message: str
    primary_url: str


class PairingStatusResponse(BaseModel):
    """Response for pairing status check"""
    pairing_id: str
    status: str
    device_type: str
    device: dict | None = None


# ============================================
# Helper Functions
# ============================================

def get_local_ip():
    """Get local IP address"""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_frontend_url():
    """Get the frontend URL for pairing links.
    When running in development with frontend on localhost, return localhost.
    Otherwise, return the local IP.
    """
    # Check if running in Docker and frontend is likely on localhost
    # If running in Docker, use localhost for the pairing URL since
    # the user's browser is accessing the frontend via localhost:5173
    # and can't reach the Docker container's internal IP
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()

        # If we got an IP like 172.x.x.x or 10.x.x.x (Docker/internal),
        # use localhost since the frontend is likely running locally
        if ip.startswith('172.') or ip.startswith('10.') or ip.startswith('192.168.'):
            return "localhost:5173"
        return f"{ip}:5173"
    except Exception:
        return "localhost:5173"


# ============================================
# API Endpoints
# ============================================

@router.post("", response_model=PairingResponse)
async def create_pairing(
    request: CreatePairingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new pairing session.

    Called by primary device when user clicks "Add Device" and selects device type.
    """
    # Validate device type
    valid_types = ["linux", "windows", "mobile"]
    if request.device_type.lower() not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid device type. Must be one of: {valid_types}"
        )

    # Generate pairing code
    code = PairingSession.generate_code()

    # Check if code already exists (very unlikely but safe)
    existing = await PairingSession.get_by_code(db, code)
    while existing:
        code = PairingSession.generate_code()
        existing = await PairingSession.get_by_code(db, code)

    # Create pairing session
    expires_at = datetime.utcnow() + timedelta(minutes=settings.pairing_expiration_minutes)

    session = PairingSession(
        device_type=request.device_type.lower(),
        pairing_code=code,
        expires_at=expires_at,
        status="pending",
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Generate pairing URL
    frontend_url = get_frontend_url()
    pairing_url = f"http://{frontend_url}/pair/{code}"

    logger.info(f"Created pairing session: {session.id} for {request.device_type}")

    return PairingResponse(
        pairing_id=session.id,
        pairing_code=code,
        device_type=request.device_type,
        expires_at=expires_at.isoformat(),
        pairing_url=pairing_url,
    )


@router.get("/{code}", response_model=PairingStatusResponse)
async def get_pairing_status(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get pairing session status.

    Used by frontend to poll for pairing completion.
    """
    session = await PairingSession.get_active(db, code)

    if not session:
        # Check if it exists but expired
        session = await PairingSession.get_by_code(db, code)
        if session:
            raise HTTPException(status_code=410, detail="Pairing code expired")
        raise HTTPException(status_code=404, detail="Invalid pairing code")

    device_info = None
    if session.device_id:
        device = await Device.get_by_id(db, session.device_id)
        if device:
            device_info = device.to_dict()

    return PairingStatusResponse(
        pairing_id=session.id,
        status=session.status,
        device_type=session.device_type,
        device=device_info,
    )


@router.post("/{code}", response_model=CompletePairingResponse)
async def complete_pairing(
    code: str,
    request: CompletePairingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Complete pairing from secondary device.

    Called when secondary device opens the pairing link and submits device info.
    """
    # Get active pairing session
    session = await PairingSession.get_active(db, code)

    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired pairing code")

    # Create device record
    local_ip = get_local_ip()

    device = Device(
        name=request.name,
        mode=DeviceMode.AGENT.value,
        device_type=session.device_type,
        os_type=request.os_type,
        ip_address=request.ip_address if hasattr(request, 'ip_address') else None,
        status=DeviceStatus.PENDING.value,
        scan_paths=",".join(request.scan_paths) if request.scan_paths else None,
    )

    db.add(device)
    await db.commit()
    await db.refresh(device)

    # Update pairing session
    session.device_id = device.id
    session.status = "completed"
    await db.commit()

    primary_url = f"http://{local_ip}:8000"

    logger.info(f"Device paired: {device.id} ({device.name})")

    return CompletePairingResponse(
        device_id=device.id,
        device_name=device.name,
        message="Device paired successfully! You can now close this page.",
        primary_url=primary_url,
    )


@router.get("/{code}/page", response_class=HTMLResponse)
async def get_pairing_page(code: str, request: Request):
    """
    Serve the pairing page HTML.

    This is a simple HTML page that will load the React app.
    """
    # Validate code exists
    from ...database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        session = await PairingSession.get_by_code(db, code)
        if not session:
            return HTMLResponse(
                content="<h1>Invalid pairing code</h1><p>This pairing link is invalid.</p>",
                status_code=404
            )
        if session.is_expired():
            return HTMLResponse(
                content="<h1>Pairing code expired</h1><p>Please generate a new pairing code on your primary device.</p>",
                status_code=410
            )

    # Redirect to React app with code parameter
    # The React app will handle the pairing UI
    frontend_url = f"/pair/{code}"
    return HTMLResponse(
        content=f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta http-equiv="refresh" content="0; url={frontend_url}" />
            <title>Pairing Device...</title>
        </head>
        <body>
            <p>Redirecting to pairing page...</p>
            <p>If not redirected, <a href="{frontend_url}">click here</a></p>
        </body>
        </html>
        """
    )


@router.delete("/{code}")
async def cancel_pairing(
    code: str,
    db: AsyncSession = Depends(get_db)
):
    """Cancel a pending pairing session"""
    session = await PairingSession.get_by_code(db, code)

    if not session:
        raise HTTPException(status_code=404, detail="Pairing session not found")

    session.status = "cancelled"
    await db.commit()

    return {"success": True, "message": "Pairing session cancelled"}


@router.post("/cleanup")
async def cleanup_expired_sessions(db: AsyncSession = Depends(get_db)):
    """Cleanup expired pairing sessions (can be called by cron job)"""
    await PairingSession.cleanup_expired(db)
    return {"success": True, "message": "Expired sessions cleaned up"}
