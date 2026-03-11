import asyncio
import json
import platform
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import logging

from ..config import settings
from ..models.device import (
    DeviceInfo,
    DeviceRegistration,
    DeviceHeartbeat,
    DeviceStatus,
    DeviceOS,
    DeviceMode,
)

logger = logging.getLogger(__name__)


class DeviceManager:
    """Manages connected devices and their heartbeats"""

    def __init__(self, local_device_id: str):
        self.local_device_id = local_device_id
        self.devices: dict[str, DeviceInfo] = {}
        self._heartbeat_task: Optional[asyncio.Task] = None
        self._running = False

        # File to persist device list
        self.devices_file = Path.home() / ".personal-assistant" / "devices.json"
        self.devices_file.parent.mkdir(parents=True, exist_ok=True)

    def _get_os_type(self) -> DeviceOS:
        """Detect the current OS"""
        system = platform.system().lower()
        if system == "windows":
            return DeviceOS.WINDOWS
        elif system == "darwin":
            return DeviceOS.MACOS
        elif system == "linux":
            import os
            if "termux" in os.environ.get("PREFIX", "").lower():
                return DeviceOS.ANDROID
            return DeviceOS.LINUX
        return DeviceOS.UNKNOWN

    def _get_storage_info(self) -> tuple[Optional[int], Optional[int]]:
        """Get total and available storage in bytes"""
        try:
            total, used, free = shutil.disk_usage(Path.home())
            return total, free
        except Exception:
            return None, None

    def get_local_device_info(self) -> DeviceInfo:
        """Get info about this device"""
        total_storage, available_storage = self._get_storage_info()

        return DeviceInfo(
            id=self.local_device_id,
            name=settings.device_name,
            mode=DeviceMode.PRIMARY if settings.is_primary else DeviceMode.AGENT,
            os=self._get_os_type(),
            ip_address=self._get_local_ip(),
            port=settings.port,
            url=f"http://{self._get_local_ip()}:{settings.port}",
            status=DeviceStatus.ONLINE,
            total_storage=total_storage,
            available_storage=available_storage,
            scan_paths=[str(p) for p in settings.scan_paths_list],
        )

    def _get_local_ip(self) -> str:
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

    def register_device(self, registration: DeviceRegistration) -> DeviceInfo:
        """Register a new device"""
        device_id = registration.name.lower().replace(" ", "-")[:8]

        # Generate unique ID if collision
        base_id = device_id
        counter = 1
        while device_id in self.devices:
            device_id = f"{base_id}-{counter}"
            counter += 1

        device = DeviceInfo(
            id=device_id,
            name=registration.name,
            mode=DeviceMode.AGENT,
            os=registration.os,
            ip_address=registration.ip_address,
            port=registration.port,
            url=f"http://{registration.ip_address}:{registration.port}",
            status=DeviceStatus.ONLINE,
            total_storage=registration.total_storage,
            available_storage=registration.available_storage,
            scan_paths=registration.scan_paths,
        )

        self.devices[device_id] = device
        self._save_devices()

        logger.info(f"Registered device: {device.name} ({device_id})")
        return device

    def unregister_device(self, device_id: str) -> bool:
        """Unregister a device"""
        if device_id in self.devices:
            del self.devices[device_id]
            self._save_devices()
            logger.info(f"Unregistered device: {device_id}")
            return True
        return False

    def update_heartbeat(self, heartbeat: DeviceHeartbeat) -> bool:
        """Update device heartbeat"""
        if heartbeat.device_id not in self.devices:
            return False

        device = self.devices[heartbeat.device_id]
        device.last_heartbeat = datetime.now()
        device.status = heartbeat.status
        device.file_count = heartbeat.file_count
        device.available_storage = heartbeat.available_storage

        return True

    def get_device(self, device_id: str) -> Optional[DeviceInfo]:
        """Get a device by ID"""
        return self.devices.get(device_id)

    def get_all_devices(self, include_local: bool = True) -> list[DeviceInfo]:
        """Get all registered devices"""
        devices = list(self.devices.values())

        if include_local:
            devices.append(self.get_local_device_info())

        return devices

    def get_online_devices(self) -> list[DeviceInfo]:
        """Get all online devices"""
        now = datetime.now()
        timeout = timedelta(seconds=settings.heartbeat_timeout)

        online = []
        for device in self.devices.values():
            if device.status == DeviceStatus.ONLINE:
                if now - device.last_heartbeat.replace(tzinfo=None) < timeout:
                    online.append(device)

        return online

    async def check_device_health(self):
        """Check health of all devices and mark offline ones"""
        now = datetime.now()
        timeout = timedelta(seconds=settings.heartbeat_timeout)

        for device in self.devices.values():
            if now - device.last_heartbeat.replace(tzinfo=None) > timeout:
                if device.status != DeviceStatus.OFFLINE:
                    device.status = DeviceStatus.OFFLINE
                    logger.warning(f"Device {device.name} marked as offline")

    async def start_health_check(self):
        """Start periodic health check"""
        self._running = True

        while self._running:
            await self.check_device_health()
            await asyncio.sleep(settings.heartbeat_interval)

    async def start(self):
        """Start the device manager"""
        self._load_devices()
        self._heartbeat_task = asyncio.create_task(self.start_health_check())

    async def stop(self):
        """Stop the device manager"""
        self._running = False
        self._save_devices()

        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

    def _load_devices(self):
        """Load devices from file"""
        if self.devices_file.exists():
            try:
                with open(self.devices_file, "r") as f:
                    data = json.load(f)
                    for device_data in data.get("devices", []):
                        device = DeviceInfo(**device_data)
                        self.devices[device.id] = device
                logger.info(f"Loaded {len(self.devices)} devices from file")
            except Exception as e:
                logger.error(f"Error loading devices: {e}")

    def _save_devices(self):
        """Save devices to file"""
        try:
            data = {
                "devices": [d.model_dump() for d in self.devices.values()],
                "last_updated": datetime.now().isoformat(),
            }
            with open(self.devices_file, "w") as f:
                json.dump(data, f, default=str, indent=2)
        except Exception as e:
            logger.error(f"Error saving devices: {e}")
