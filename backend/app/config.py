import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # AI Provider Configuration (supports OpenAI-compatible APIs)
    ai_provider: str = "openai"  # openai, anthropic, glm, custom
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_model: str = "gpt-4o-mini"

    # Pre-configured providers (can use custom base_url instead)
    openai_base_url: str = "https://api.openai.com/v1"
    anthropic_base_url: str = "https://api.anthropic.com/v1"
    glm_base_url: str = "https://open.bigmodel.cn/api/paas/v4"

    # Server Configuration
    port: int = 8000
    device_name: str = "My Device"
    device_mode: str = "primary"  # "primary" or "agent"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://localhost:8000"

    # File Scan Configuration
    scan_paths: str = "~/Documents,~/Downloads,~/Desktop"
    max_index_size: int = 100000
    exclude_dirs: str = ".git,node_modules,__pycache__,.venv,venv,.idea,.vscode"

    # Discovery Configuration
    discovery_port: int = 8001
    heartbeat_interval: int = 30
    heartbeat_timeout: int = 120

    # Database Configuration
    database_url: str = ""  # Empty = use default SQLite path
    database_echo: bool = False  # Set to True for SQL debugging

    # Pairing Configuration
    pairing_code_length: int = 6
    pairing_expiration_minutes: int = 15

    # Encryption Configuration (for API keys)
    encryption_key: str = ""  # Fernet key for encrypting API keys (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

    @property
    def scan_paths_list(self) -> List[Path]:
        """Convert comma-separated paths to list of expanded Path objects"""
        paths = []
        for path_str in self.scan_paths.split(","):
            path = Path(path_str.strip()).expanduser()
            if path.exists():
                paths.append(path)
        return paths

    @property
    def exclude_dirs_list(self) -> List[str]:
        """Convert comma-separated exclude dirs to list"""
        return [d.strip() for d in self.exclude_dirs.split(",")]

    @property
    def allowed_origins_list(self) -> List[str]:
        """Convert comma-separated origins to list"""
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def is_primary(self) -> bool:
        """Check if this device is the primary device"""
        return self.device_mode.lower() == "primary"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
