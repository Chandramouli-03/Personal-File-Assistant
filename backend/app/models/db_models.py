"""
SQLAlchemy ORM models for the Personal Assistant database.
"""

from datetime import datetime, timedelta
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, Text, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import enum
import uuid
import random
import string

from ..database import Base


class DeviceMode(str, enum.Enum):
    PRIMARY = "primary"
    AGENT = "agent"


class DeviceStatus(str, enum.Enum):
    PENDING = "pending"
    ONLINE = "online"
    OFFLINE = "offline"
    SYNCING = "syncing"


class DeviceType(str, enum.Enum):
    LINUX = "linux"
    WINDOWS = "windows"
    MOBILE = "mobile"


class Device(Base):
    """Device model for storing connected devices"""
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    name = Column(String(100), nullable=False)
    mode = Column(String(20), nullable=False, default=DeviceMode.AGENT.value)
    device_type = Column(String(20), nullable=True)  # linux, windows, mobile
    os_type = Column(String(50), nullable=True)  # OS detection

    # Network info
    ip_address = Column(String(50), nullable=True)
    port = Column(Integer, default=8000)
    url = Column(String(200), nullable=True)

    # Status
    status = Column(String(20), default=DeviceStatus.PENDING.value)
    last_heartbeat = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)

    # Capabilities
    total_storage = Column(BigInteger, nullable=True)
    available_storage = Column(BigInteger, nullable=True)
    file_count = Column(Integer, default=0)
    scan_paths = Column(Text, nullable=True)  # JSON array of paths

    # Pairing info
    pairing_code = Column(String(10), unique=True, nullable=True)
    pairing_expires = Column(DateTime, nullable=True)

    # Relationships
    files = relationship("File", back_populates="device", cascade="all, delete-orphan")
    pairing_sessions = relationship("PairingSession", back_populates="device", cascade="all, delete-orphan")
    scan_logs = relationship("ScanLog", back_populates="device", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Device(id={self.id}, name={self.name}, type={self.device_type})>"

    @classmethod
    def generate_pairing_code(cls):
        """Generate a 6-digit pairing code"""
        return ''.join(random.choices(string.digits, k=6))

    @classmethod
    async def get_by_id(cls, db: AsyncSession, device_id: str):
        """Get device by ID"""
        result = await db.execute(select(cls).where(cls.id == device_id))
        return result.scalar_one_or_none()

    @classmethod
    async def get_all(cls, db: AsyncSession, include_offline: bool = True):
        """Get all devices"""
        query = select(cls)
        if not include_offline:
            query = query.where(cls.status != DeviceStatus.OFFLINE.value)
        result = await db.execute(query)
        return result.scalars().all()

    @classmethod
    async def get_online(cls, db: AsyncSession):
        """Get all online devices"""
        result = await db.execute(select(cls).where(cls.status == DeviceStatus.ONLINE.value))
        return result.scalars().all()

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "mode": self.mode,
            "device_type": self.device_type,
            "os_type": self.os_type,
            "ip_address": self.ip_address,
            "port": self.port,
            "url": self.url,
            "status": self.status,
            "last_heartbeat": self.last_heartbeat.isoformat() if self.last_heartbeat else None,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "total_storage": self.total_storage,
            "available_storage": self.available_storage,
            "file_count": self.file_count,
            "scan_paths": self.scan_paths,
        }


class File(Base):
    """File index model for storing file metadata"""
    __tablename__ = "files"

    id = Column(String, primary_key=True)  # hash or UUID
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)

    # File info
    path = Column(Text, nullable=False)
    relative_path = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    extension = Column(String(50), nullable=True)
    file_type = Column(String(50), nullable=True)  # document, image, video, etc.

    # Metadata
    size_bytes = Column(BigInteger, default=0)
    modified_time = Column(DateTime, nullable=True)
    created_time = Column(DateTime, nullable=True)
    scan_root = Column(String(500), nullable=True)
    preview_text = Column(Text, nullable=True)

    # Relationship
    device = relationship("Device", back_populates="files")

    # Indexes
    __table_args__ = (
        Index("idx_files_device", "device_id"),
        Index("idx_files_filename", "filename"),
        Index("idx_files_type", "file_type"),
        Index("idx_files_modified", "modified_time"),
    )

    def __repr__(self):
        return f"<File(id={self.id}, filename={self.filename}, device={self.device_id})>"

    @classmethod
    async def get_by_device(cls, db: AsyncSession, device_id: str, limit: int = 100):
        """Get files by device ID"""
        result = await db.execute(
            select(cls).where(cls.device_id == device_id).limit(limit)
        )
        return result.scalars().all()

    @classmethod
    async def search(cls, db: AsyncSession, query: str, device_ids: list = None, limit: int = 50):
        """Search files by filename"""
        sql_query = select(cls).where(cls.filename.ilike(f"%{query}%"))

        if device_ids:
            sql_query = sql_query.where(cls.device_id.in_(device_ids))

        sql_query = sql_query.order_by(cls.modified_time.desc()).limit(limit)
        result = await db.execute(sql_query)
        return result.scalars().all()

    @classmethod
    async def delete_by_device(cls, db: AsyncSession, device_id: str):
        """Delete all files for a device"""
        from sqlalchemy import delete
        await db.execute(delete(cls).where(cls.device_id == device_id))

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "device_id": self.device_id,
            "path": self.path,
            "relative_path": self.relative_path,
            "filename": self.filename,
            "extension": self.extension,
            "file_type": self.file_type,
            "size_bytes": self.size_bytes,
            "modified_time": self.modified_time.isoformat() if self.modified_time else None,
            "created_time": self.created_time.isoformat() if self.created_time else None,
            "scan_root": self.scan_root,
            "preview_text": self.preview_text[:500] if self.preview_text else None,
        }


class PairingSession(Base):
    """Pairing session model for device registration flow"""
    __tablename__ = "pairing_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4())[:8])
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=True)
    device_type = Column(String(20), nullable=False)  # linux, windows, mobile
    pairing_code = Column(String(10), unique=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")  # pending, completed, expired

    # Relationship
    device = relationship("Device", back_populates="pairing_sessions")

    # Index
    __table_args__ = (
        Index("idx_pairing_code", "pairing_code"),
    )

    def __repr__(self):
        return f"<PairingSession(id={self.id}, code={self.pairing_code}, type={self.device_type})>"

    @classmethod
    def generate_code(cls):
        """Generate a 6-digit pairing code"""
        return ''.join(random.choices(string.digits, k=6))

    @classmethod
    async def get_by_code(cls, db: AsyncSession, code: str):
        """Get pairing session by code"""
        result = await db.execute(select(cls).where(cls.pairing_code == code))
        return result.scalar_one_or_none()

    @classmethod
    async def get_active(cls, db: AsyncSession, code: str):
        """Get active (pending, not expired) pairing session"""
        # Add 30 second buffer to handle clock skew between app and database
        result = await db.execute(
            select(cls).where(
                cls.pairing_code == code,
                cls.status == "pending",
                cls.expires_at > datetime.utcnow() - timedelta(seconds=30)
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def cleanup_expired(cls, db: AsyncSession):
        """Mark expired pairing sessions"""
        from sqlalchemy import update
        await db.execute(
            update(cls)
            .where(cls.expires_at < datetime.utcnow(), cls.status == "pending")
            .values(status="expired")
        )
        await db.commit()

    def is_expired(self):
        """Check if session is expired"""
        return self.expires_at < datetime.utcnow()

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "device_id": self.device_id,
            "device_type": self.device_type,
            "pairing_code": self.pairing_code,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "status": self.status,
        }


class ScanLog(Base):
    """Scan activity log model"""
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    scan_type = Column(String(20), nullable=False)  # full, incremental

    files_found = Column(Integer, default=0)
    scan_duration_seconds = Column(Integer, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationship
    device = relationship("Device", back_populates="scan_logs")

    def __repr__(self):
        return f"<ScanLog(id={self.id}, device={self.device_id}, files={self.files_found})>"

    def to_dict(self):
        """Convert to dictionary"""
        return {
            "id": self.id,
            "device_id": self.device_id,
            "scan_type": self.scan_type,
            "files_found": self.files_found,
            "scan_duration_seconds": self.scan_duration_seconds,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
