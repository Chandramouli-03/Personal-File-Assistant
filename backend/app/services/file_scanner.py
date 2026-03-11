import asyncio
import hashlib
import os
import platform
from datetime import datetime
from pathlib import Path
from typing import Optional
import aiofiles

from ..config import settings
from ..models.file import FileInfo, FileIndex, FileType, get_file_type


class FileScanner:
    """Async file system scanner that builds and maintains a file index"""

    def __init__(self, device_id: str):
        self.device_id = device_id
        self.index = FileIndex(device_id=device_id)
        self._scanning = False
        self._scan_progress = 0.0

    @property
    def is_scanning(self) -> bool:
        return self._scanning

    @property
    def scan_progress(self) -> float:
        return self._scan_progress

    def _generate_file_id(self, path: Path) -> str:
        """Generate a unique ID for a file based on path and device"""
        unique_str = f"{self.device_id}:{path.absolute()}"
        return hashlib.md5(unique_str.encode()).hexdigest()[:12]

    def _get_os_type(self) -> str:
        """Get the current OS type"""
        system = platform.system().lower()
        if system == "windows":
            return "windows"
        elif system == "darwin":
            return "macos"
        elif system == "linux":
            # Check if running on Android via Termux
            if "termux" in os.environ.get("PREFIX", "").lower():
                return "android"
            return "linux"
        return "unknown"

    def _should_skip_dir(self, dir_path: Path) -> bool:
        """Check if directory should be skipped"""
        dir_name = dir_path.name.lower()

        # Skip hidden directories
        if dir_name.startswith("."):
            return True

        # Skip excluded directories
        if dir_name in [d.lower() for d in settings.exclude_dirs_list]:
            return True

        # Skip system directories
        system_dirs = {
            "windows": ["windows", "program files", "program files (x86)", "$recycle.bin"],
            "linux": ["proc", "sys", "dev", "run", "tmp", "var", "usr", "bin", "sbin", "lib"],
            "macos": ["library", "system", "applications", ".trash"],
            "android": ["system", "data", "proc", "dev"],
        }

        os_type = self._get_os_type()
        if dir_name in system_dirs.get(os_type, []):
            return True

        return False

    async def _get_file_metadata(self, file_path: Path, scan_root: Path) -> Optional[FileInfo]:
        """Extract metadata from a file"""
        try:
            stat = file_path.stat()

            # Get file extension
            extension = file_path.suffix.lower()

            # Calculate relative path
            try:
                relative_path = str(file_path.relative_to(scan_root))
            except ValueError:
                relative_path = file_path.name

            # Get file type
            file_type = get_file_type(extension)

            # Get preview for text files (first 500 chars)
            preview_text = None
            if file_type == FileType.DOCUMENT and extension in [".txt", ".md", ".csv", ".json", ".xml"]:
                try:
                    async with aiofiles.open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        preview_text = await f.read(500)
                except:
                    pass

            return FileInfo(
                id=self._generate_file_id(file_path),
                name=file_path.name,
                path=str(file_path.absolute()),
                relative_path=relative_path,
                extension=extension,
                file_type=file_type,
                size=stat.st_size,
                modified_time=datetime.fromtimestamp(stat.st_mtime),
                created_time=datetime.fromtimestamp(stat.st_ctime) if stat.st_ctime else None,
                accessed_time=datetime.fromtimestamp(stat.st_atime) if stat.st_atime else None,
                device_id=self.device_id,
                scan_root=str(scan_root),
                preview_text=preview_text,
            )
        except (PermissionError, FileNotFoundError, OSError) as e:
            return None

    async def scan_directory(self, root_path: Path, progress_callback=None) -> int:
        """Recursively scan a directory and add files to index"""
        files_added = 0

        try:
            # Walk the directory tree
            for dirpath, dirnames, filenames in os.walk(root_path):
                # Filter out directories we want to skip
                dirnames[:] = [
                    d for d in dirnames
                    if not self._should_skip_dir(Path(dirpath) / d)
                ]

                current_dir = Path(dirpath)

                # Process files in this directory
                for filename in filenames:
                    file_path = current_dir / filename

                    # Skip hidden files
                    if filename.startswith("."):
                        continue

                    # Get file metadata
                    file_info = await self._get_file_metadata(file_path, root_path)
                    if file_info:
                        self.index.add_file(file_info)
                        files_added += 1

                        # Update progress
                        if progress_callback and files_added % 100 == 0:
                            await progress_callback(files_added)

                        # Check max index size
                        if self.index.file_count >= settings.max_index_size:
                            return files_added

        except (PermissionError, OSError) as e:
            pass

        return files_added

    async def scan_all(self, progress_callback=None) -> int:
        """Scan all configured paths"""
        if self._scanning:
            return 0

        self._scanning = True
        self._scan_progress = 0.0
        total_files = 0

        # Clear existing index
        self.index = FileIndex(device_id=self.device_id)

        scan_paths = settings.scan_paths_list
        total_paths = len(scan_paths)

        for i, scan_path in enumerate(scan_paths):
            if not scan_path.exists():
                continue

            async def path_progress(files_added):
                if progress_callback:
                    await progress_callback({
                        "path": str(scan_path),
                        "files_added": files_added,
                        "total_files": total_files + files_added,
                        "path_progress": (i + 1) / total_paths,
                    })

            files_added = await self.scan_directory(scan_path, path_progress)
            total_files += files_added

        self.index.last_updated = datetime.now()
        self._scanning = False
        self._scan_progress = 1.0

        return total_files

    async def rescan(self, progress_callback=None) -> int:
        """Rescan and update the index"""
        return await self.scan_all(progress_callback)

    def search(self, query: str, file_types: Optional[list[FileType]] = None) -> list[FileInfo]:
        """Search the local index"""
        return self.index.search(query, file_types)

    def get_file(self, path: str) -> Optional[FileInfo]:
        """Get a file from the index by path"""
        return self.index.get_file(path)

    def get_stats(self) -> dict:
        """Get scanning statistics"""
        return {
            "device_id": self.device_id,
            "file_count": self.index.file_count,
            "total_size": self.index.total_size,
            "scan_roots": self.index.scan_roots,
            "last_updated": self.index.last_updated.isoformat() if self.index.last_updated else None,
            "is_scanning": self._scanning,
            "scan_progress": self._scan_progress,
        }
