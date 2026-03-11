import re
from datetime import datetime
from typing import Optional
from pathlib import Path

from ..models.file import FileInfo, FileType, FileReadResponse
from ..models.search import SearchResult
from .file_scanner import FileScanner


class FileSearchService:
    """Service for searching and reading files"""

    def __init__(self, scanner: FileScanner, device_name: str):
        self.scanner = scanner
        self.device_name = device_name

    def search(
        self,
        query: str,
        file_types: Optional[list[str]] = None,
        max_results: int = 50
    ) -> list[SearchResult]:
        """
        Search files by query.

        Supports:
        - Filename matching
        - Path matching
        - File extension filtering
        - Basic content search for indexed text
        """
        results = []

        # Convert file type strings to FileType enums
        type_filter = None
        if file_types:
            type_filter = []
            for ft in file_types:
                ft_lower = ft.lower().lstrip(".")
                # Map common extensions to file types
                extension_to_type = {
                    "pdf": FileType.DOCUMENT,
                    "doc": FileType.DOCUMENT,
                    "docx": FileType.DOCUMENT,
                    "txt": FileType.DOCUMENT,
                    "jpg": FileType.IMAGE,
                    "jpeg": FileType.IMAGE,
                    "png": FileType.IMAGE,
                    "mp4": FileType.VIDEO,
                    "mp3": FileType.AUDIO,
                }
                if ft_lower in extension_to_type:
                    type_filter.append(extension_to_type[ft_lower])

        # Search the index
        matched_files = self.scanner.search(query, type_filter)

        # Score and rank results
        query_lower = query.lower()
        query_words = set(re.findall(r"\w+", query_lower))

        for file_info in matched_files:
            score = self._calculate_relevance_score(file_info, query_lower, query_words)
            match_reason = self._get_match_reason(file_info, query_lower)

            result = SearchResult(
                file_info=file_info,
                device_name=self.device_name,
                device_id=self.scanner.device_id,
                relevance_score=score,
                match_reason=match_reason,
            )
            results.append(result)

        # Sort by relevance score
        results.sort(key=lambda x: x.relevance_score, reverse=True)

        return results[:max_results]

    def _calculate_relevance_score(
        self,
        file_info: FileInfo,
        query: str,
        query_words: set
    ) -> float:
        """Calculate relevance score for a file (0.0 to 1.0)"""
        score = 0.0
        name_lower = file_info.name.lower()

        # Exact filename match (highest score)
        if query == name_lower:
            return 1.0

        # Filename starts with query
        if name_lower.startswith(query):
            score += 0.8
        # Filename contains query
        elif query in name_lower:
            score += 0.6

        # Word matches in filename
        name_words = set(re.findall(r"\w+", name_lower))
        word_overlap = len(query_words & name_words) / max(len(query_words), 1)
        score += word_overlap * 0.3

        # Extension match bonus
        if file_info.extension.lstrip(".") in query:
            score += 0.1

        # Recent file bonus
        if file_info.modified_time:
            days_since_modified = (datetime.now() - file_info.modified_time).days
            if days_since_modified < 7:
                score += 0.1
            elif days_since_modified < 30:
                score += 0.05

        return min(score, 1.0)

    def _get_match_reason(self, file_info: FileInfo, query: str) -> str:
        """Explain why this file matched the query"""
        reasons = []

        if query in file_info.name.lower():
            reasons.append(f"Filename contains '{query}'")

        if query in file_info.path.lower() and query not in file_info.name.lower():
            reasons.append(f"Path contains '{query}'")

        if file_info.preview_text and query in file_info.preview_text.lower():
            reasons.append("Content contains search terms")

        return "; ".join(reasons) if reasons else "Filename or path matches"

    async def read_file(
        self,
        file_path: str,
        max_chars: int = 10000
    ) -> FileReadResponse:
        """Read the contents of a file"""
        file_info = self.scanner.get_file(file_path)

        if not file_info:
            return FileReadResponse(
                file_info=None,
                content=None,
                error="File not found in index",
            )

        # Check if file is readable as text
        readable_extensions = [
            ".txt", ".md", ".json", ".xml", ".csv", ".log",
            ".py", ".js", ".ts", ".html", ".css", ".yaml", ".yml",
            ".sh", ".bash", ".zsh", ".conf", ".cfg", ".ini",
        ]

        if file_info.extension not in readable_extensions:
            return FileReadResponse(
                file_info=file_info,
                content=None,
                error=f"Cannot read {file_info.extension} files as text. Use download instead.",
            )

        try:
            path = Path(file_path)
            if not path.exists():
                return FileReadResponse(
                    file_info=file_info,
                    content=None,
                    error="File does not exist on disk",
                )

            import aiofiles
            async with aiofiles.open(path, "r", encoding="utf-8", errors="replace") as f:
                content = await f.read()

            truncated = len(content) > max_chars
            if truncated:
                content = content[:max_chars] + "\n\n... [truncated]"

            return FileReadResponse(
                file_info=file_info,
                content=content,
                encoding="utf-8",
                truncated=truncated,
            )

        except PermissionError:
            return FileReadResponse(
                file_info=file_info,
                content=None,
                error="Permission denied",
            )
        except Exception as e:
            return FileReadResponse(
                file_info=file_info,
                content=None,
                error=str(e),
            )

    def get_file_path(self, file_path: str) -> Optional[Path]:
        """Get the Path object for a file, with validation"""
        file_info = self.scanner.get_file(file_path)
        if not file_info:
            return None

        path = Path(file_path)
        if not path.exists():
            return None

        return path
