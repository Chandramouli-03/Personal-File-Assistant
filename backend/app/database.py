"""
Database configuration and session management using SQLAlchemy with SQLite.
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from pathlib import Path
import os

from .config import settings

# Database path
# Use /app/data for Docker compatibility, fall back to home directory for local dev
if Path("/app").exists():
    # Running in Docker - use /app/data
    DB_DIR = Path("/app/data")
else:
    # Local development - use home directory
    DB_DIR = Path.home() / ".personal-assistant"

DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "database.db"

# Async engine for SQLite
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    future=True,
)

# Session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with engine.begin() as conn:
        # Import models to ensure they are registered
        from .models.db_models import Device, File, PairingSession, ScanLog, UserSettings, FileEmbedding

        # Create all tables with metadata
        await conn.run_sync(Base.metadata.create_all)

        # Enable foreign keys (for backwards compatibility)
        await conn.execute(text("PRAGMA foreign_keys=ON"))

        print(f"Database initialized at {DB_PATH}")


async def get_db_session():
    """Get a database session for use outside of FastAPI dependency injection."""
    # Return a factory - caller must use it in an async context
    return AsyncSessionLocal()
