from fastapi import APIRouter
from .devices import router as devices_router
from .search import router as search_router
from .files import router as files_router

# Include all route modules
router = APIRouter()
router.include_router(devices_router)
router.include_router(search_router)
router.include_router(files_router)

__all__ = ["router"]
