import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    # GLM API Configuration
    glm_api_key: str = ""
    glm_api_base_url: str = "https://open.bigmodel.cn/api/paas/v4/"
    glm_model: str = "glm-4-flash"

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
