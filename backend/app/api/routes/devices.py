from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.device import (
    DeviceInfo,
    DeviceRegistration,
    DeviceHeartbeat,
    DeviceListResponse,
    DeviceMode,
    DeviceStatus,
    DeviceOS,
)
from ...core.device_manager import DeviceManager
from ...models.db_models import Device as DBDevice
from ...database import get_db

router = APIRouter(prefix="/devices", tags=["devices"])


def db_device_to_device_info(db_device: DBDevice) -> DeviceInfo:
    """Convert a database Device model to a DeviceInfo object"""
    # Map device_type string to DeviceOS enum
    os_mapping = {
        "windows": DeviceOS.WINDOWS,
        "linux": DeviceOS.LINUX,
        "mobile": DeviceOS.ANDROID,
    }
    device_os = os_mapping.get(db_device.device_type, DeviceOS.UNKNOWN)

    # Map status string to DeviceStatus enum
    status_mapping = {
        "online": DeviceStatus.ONLINE,
        "offline": DeviceStatus.OFFLINE,
        "syncing": DeviceStatus.SYNCING,
        "pending": DeviceStatus.ONLINE,  # Treat pending as online for display
    }
    device_status = status_mapping.get(db_device.status, DeviceStatus.ONLINE)

    # Map mode string to DeviceMode enum
    mode_mapping = {
        "primary": DeviceMode.PRIMARY,
        "agent": DeviceMode.AGENT,
    }
    device_mode = mode_mapping.get(db_device.mode, DeviceMode.AGENT)

    return DeviceInfo(
        id=db_device.id,
        name=db_device.name,
        mode=device_mode,
        os=device_os,
        ip_address=db_device.ip_address or "",
        port=db_device.port or 8000,
        url=db_device.url or "",
        status=device_status,
        last_heartbeat=db_device.last_heartbeat or db_device.registered_at,
        registered_at=db_device.registered_at,
        total_storage=db_device.total_storage,
        available_storage=db_device.available_storage,
        file_count=db_device.file_count or 0,
        scan_paths=[],
    )


def get_device_manager() -> DeviceManager:
    """Dependency to get device manager instance"""
    from ..dependencies import get_device_manager as _get
    return _get()


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    include_offline: bool = False,
    manager: DeviceManager = Depends(get_device_manager),
    db: AsyncSession = Depends(get_db)
):
    """List all registered devices from both DeviceManager and database"""
    from sqlalchemy import select

    # Get devices from DeviceManager (in-memory/JSON)
    devices = manager.get_all_devices(include_local=True)

    # Get paired devices from database
    result = await db.execute(select(DBDevice))
    db_devices = result.scalars().all()

    # Track existing device IDs to avoid duplicates
    existing_ids = {d.id for d in devices}

    # Convert and add database devices that aren't already in the list
    for db_device in db_devices:
        if db_device.id not in existing_ids:
            devices.append(db_device_to_device_info(db_device))

    if not include_offline:
        devices = [d for d in devices if d.status != DeviceStatus.OFFLINE]

    return DeviceListResponse(
        devices=devices,
        total=len(devices)
    )


@router.post("/register", response_model=DeviceInfo)
async def register_device(
    registration: DeviceRegistration,
    manager: DeviceManager = Depends(get_device_manager)
):
    """Register a new device"""
    device = manager.register_device(registration)
    return device


@router.delete("/{device_id}")
async def unregister_device(
    device_id: str,
    manager: DeviceManager = Depends(get_device_manager),
    db: AsyncSession = Depends(get_db)
):
    """Unregister a device"""
    from sqlalchemy import delete

    # First try to unregister from DeviceManager (in-memory devices)
    success = manager.unregister_device(device_id)

    if not success:
        # If not found in DeviceManager, try to delete from database
        from sqlalchemy import select

        db_device = await db.execute(
            select(DBDevice).where(DBDevice.id == device_id)
        )
        db_device = db_device.scalar_one_or_none()

        if db_device:
            await db.delete(db_device)
            await db.commit()
            return {"success": True, "message": f"Device {device_id} unregistered"}
        else:
            raise HTTPException(status_code=404, detail="Device not found")

    return {"success": True, "message": f"Device {device_id} unregistered"}


@router.post("/heartbeat")
async def device_heartbeat(
    heartbeat: DeviceHeartbeat,
    manager: DeviceManager = Depends(get_device_manager)
):
    """Receive heartbeat from a device"""
    success = manager.update_heartbeat(heartbeat)
    if not success:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"success": True}


@router.get("/local", response_model=DeviceInfo)
async def get_local_device(
    manager: DeviceManager = Depends(get_device_manager)
):
    """Get information about this device"""
    return manager.get_local_device_info()


@router.get("/discovered")
async def get_discovered_devices(
    manager: DeviceManager = Depends(get_device_manager)
):
    """Get devices discovered via UDP broadcast"""
    from ..dependencies import get_discovery_service
    discovery = get_discovery_service()
    if discovery:
        return {"devices": discovery.get_discovered_devices()}
    return {"devices": []}
