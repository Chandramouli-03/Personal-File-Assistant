from fastapi import APIRouter
from .devices import router as devices_router
from .search import router as search_router
from .files import router as files_router
from .pairing import router as pairing_router
from .settings import router as settings_router

# Include all route modules
router = APIRouter()
router.include_router(devices_router)
router.include_router(search_router)
router.include_router(files_router)
router.include_router(pairing_router)
router.include_router(settings_router)

__all__ = ["router"]
