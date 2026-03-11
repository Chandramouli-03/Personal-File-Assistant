from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from ...models.device import (
    DeviceInfo,
    DeviceRegistration,
    DeviceHeartbeat,
    DeviceListResponse,
)
from ...core.device_manager import DeviceManager

router = APIRouter(prefix="/devices", tags=["devices"])


def get_device_manager() -> DeviceManager:
    """Dependency to get device manager instance"""
    from ..dependencies import get_device_manager as _get
    return _get()


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    include_offline: bool = False,
    manager: DeviceManager = Depends(get_device_manager)
):
    """List all registered devices"""
    devices = manager.get_all_devices(include_local=True)

    if not include_offline:
        from ...models.device import DeviceStatus
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
    manager: DeviceManager = Depends(get_device_manager)
):
    """Unregister a device"""
    success = manager.unregister_device(device_id)
    if not success:
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
