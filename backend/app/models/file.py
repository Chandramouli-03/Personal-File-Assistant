from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from pathlib import Path


class FileType(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    ARCHIVE = "archive"
    CODE = "code"
    DATA = "data"
    OTHER = "other"


# File extension mappings
FILE_TYPE_EXTENSIONS = {
    FileType.DOCUMENT: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".xls", ".xlsx", ".ppt", ".pptx", ".md", ".csv"],
    FileType.IMAGE: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".ico", ".tiff"],
    FileType.VIDEO: [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
    FileType.AUDIO: [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"],
    FileType.ARCHIVE: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"],
    FileType.CODE: [".py", ".js", ".ts", ".java", ".cpp", ".c", ".h", ".go", ".rs", ".rb", ".php", ".html", ".css", ".json", ".xml", ".yaml", ".yml", ".sh"],
    FileType.DATA: [".sql", ".db", ".sqlite", ".parquet", ".pickle"],
}


def get_file_type(extension: str) -> FileType:
    """Determine file type from extension"""
    ext = extension.lower()
    for file_type, extensions in FILE_TYPE_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    return FileType.OTHER


class FileInfo(BaseModel):
    """Information about a file in the index"""
    id: str  # Unique identifier (hash or path-based)
    name: str
    path: str  # Absolute path
    relative_path: str  # Relative to scan root
    extension: str
    file_type: FileType
    size: int  # in bytes
    modified_time: datetime
    created_time: Optional[datetime] = None
    accessed_time: Optional[datetime] = None
    device_id: str  # Which device this file is on
    scan_root: str  # Which scan path this file was found in

    # Optional preview/thumbnail
    preview_text: Optional[str] = None  # First N characters of text files
    thumbnail_path: Optional[str] = None  # For images

    class Config:
        use_enum_values = True


class FileIndex(BaseModel):
    """In-memory file index"""
    device_id: str
    files: dict[str, FileInfo] = {}  # path -> FileInfo
    last_updated: datetime = Field(default_factory=datetime.now)
    total_size: int = 0
    scan_roots: list[str] = []

    def add_file(self, file_info: FileInfo):
        """Add a file to the index"""
        self.files[file_info.path] = file_info
        self.total_size += file_info.size
        if file_info.scan_root not in self.scan_roots:
            self.scan_roots.append(file_info.scan_root)

    def remove_file(self, path: str):
        """Remove a file from the index"""
        if path in self.files:
            self.total_size -= self.files[path].size
            del self.files[path]

    def get_file(self, path: str) -> Optional[FileInfo]:
        """Get a file by path"""
        return self.files.get(path)

    def search(self, query: str, file_types: Optional[list[FileType]] = None) -> list[FileInfo]:
        """Search files by name (simple substring match)"""
        query_lower = query.lower()
        results = []

        for file_info in self.files.values():
            # Check if query matches filename
            if query_lower in file_info.name.lower() or query_lower in file_info.path.lower():
                # Filter by file type if specified
                if file_types and file_info.file_type not in file_types:
                    continue
                results.append(file_info)

        return results

    def get_by_extension(self, extension: str) -> list[FileInfo]:
        """Get all files with a specific extension"""
        return [f for f in self.files.values() if f.extension.lower() == extension.lower()]

    @property
    def file_count(self) -> int:
        return len(self.files)


class FileReadRequest(BaseModel):
    """Request to read a file"""
    device_id: str
    file_path: str
    max_chars: int = 10000


class FileReadResponse(BaseModel):
    """Response with file content"""
    file_info: FileInfo
    content: Optional[str] = None
    encoding: str = "utf-8"
    truncated: bool = False
    error: Optional[str] = None


class FileCopyRequest(BaseModel):
    """Request to copy a file between devices"""
    source_device_id: str
    source_path: str
    target_device_id: str
    target_path: Optional[str] = None  # If None, uses same relative path


class FileCopyResponse(BaseModel):
    """Response for file copy operation"""
    success: bool
    source_path: str
    target_path: str
    bytes_copied: int
    error: Optional[str] = None


class FileDownloadResponse(BaseModel):
    """Response for file download"""
    file_info: FileInfo
    download_url: str
