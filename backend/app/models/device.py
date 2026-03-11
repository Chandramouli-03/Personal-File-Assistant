from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class DeviceMode(str, Enum):
    PRIMARY = "primary"
    AGENT = "agent"


class DeviceStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    SYNCING = "syncing"


class DeviceOS(str, Enum):
    WINDOWS = "windows"
    LINUX = "linux"
    MACOS = "macos"
    ANDROID = "android"
    UNKNOWN = "unknown"


class DeviceInfo(BaseModel):
    """Device registration information"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    mode: DeviceMode = DeviceMode.AGENT
    os: DeviceOS = DeviceOS.UNKNOWN
    ip_address: str
    port: int = 8000
    url: str = ""  # Base URL for API calls
    status: DeviceStatus = DeviceStatus.ONLINE
    last_heartbeat: datetime = Field(default_factory=datetime.now)
    registered_at: datetime = Field(default_factory=datetime.now)

    # Device capabilities
    total_storage: Optional[int] = None  # in bytes
    available_storage: Optional[int] = None  # in bytes
    file_count: int = 0
    scan_paths: list[str] = []

    class Config:
        use_enum_values = True


class DeviceRegistration(BaseModel):
    """Request to register a new device"""
    name: str
    ip_address: str
    port: int = 8000
    os: DeviceOS = DeviceOS.UNKNOWN
    scan_paths: list[str] = []
    total_storage: Optional[int] = None
    available_storage: Optional[int] = None


class DeviceHeartbeat(BaseModel):
    """Heartbeat signal from a device"""
    device_id: str
    file_count: int = 0
    available_storage: Optional[int] = None
    status: DeviceStatus = DeviceStatus.ONLINE


class DeviceListResponse(BaseModel):
    """Response for listing all devices"""
    devices: list[DeviceInfo]
    total: int


class DiscoveryBroadcast(BaseModel):
    """UDP broadcast message for device discovery"""
    type: str = "discovery"
    name: str
    url: str
    device_id: str
    mode: DeviceMode = DeviceMode.PRIMARY
