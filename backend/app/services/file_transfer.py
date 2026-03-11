import asyncio
import aiofiles
import httpx
from pathlib import Path
from typing import Optional, Callable
import logging

from ..models.file import FileCopyRequest, FileCopyResponse, FileInfo

logger = logging.getLogger(__name__)


class FileTransferService:
    """Service for transferring files between devices"""

    def __init__(self, get_device_url_callback):
        """
        Args:
            get_device_url_callback: Function to get device URL by device ID
        """
        self.get_device_url = get_device_url_callback
        self._active_transfers: dict[str, asyncio.Task] = {}
        self._transfer_progress: dict[str, float] = {}

    async def copy_file(
        self,
        request: FileCopyRequest,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> FileCopyResponse:
        """
        Copy a file from source device to target device.

        If source is local, upload to remote.
        If source is remote, download to local.
        If both are remote, this server acts as intermediary.
        """
        try:
            # Determine transfer type
            if request.source_device_id == "local":
                # Upload from local to remote
                return await self._upload_to_remote(request, progress_callback)

            elif request.target_device_id == "local":
                # Download from remote to local
                return await self._download_from_remote(request, progress_callback)

            else:
                # Remote to remote - transfer through this server
                return await self._remote_to_remote(request, progress_callback)

        except Exception as e:
            logger.error(f"File transfer error: {e}")
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=request.target_path or request.source_path,
                bytes_copied=0,
                error=str(e),
            )

    async def _upload_to_remote(
        self,
        request: FileCopyRequest,
        progress_callback: Optional[Callable] = None
    ) -> FileCopyResponse:
        """Upload a local file to a remote device"""
        target_url = self.get_device_url(request.target_device_id)
        if not target_url:
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=request.target_path or request.source_path,
                bytes_copied=0,
                error="Target device not found",
            )

        source_path = Path(request.source_path)
        if not source_path.exists():
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=request.target_path or request.source_path,
                bytes_copied=0,
                error="Source file does not exist",
            )

        target_path = request.target_path or source_path.name

        try:
            # Read the file
            file_size = source_path.stat().st_size
            bytes_read = 0

            async with aiofiles.open(source_path, "rb") as f:
                content = await f.read()
                bytes_read = len(content)

            # Upload to remote
            async with httpx.AsyncClient(timeout=300.0) as client:
                files = {"file": (source_path.name, content)}
                data = {"target_path": target_path}

                response = await client.post(
                    f"{target_url}/api/files/upload",
                    files=files,
                    data=data,
                )
                response.raise_for_status()

            if progress_callback:
                await progress_callback(1.0)

            return FileCopyResponse(
                success=True,
                source_path=request.source_path,
                target_path=target_path,
                bytes_copied=bytes_read,
            )

        except Exception as e:
            logger.error(f"Upload error: {e}")
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=target_path,
                bytes_copied=0,
                error=str(e),
            )

    async def _download_from_remote(
        self,
        request: FileCopyRequest,
        progress_callback: Optional[Callable] = None
    ) -> FileCopyResponse:
        """Download a file from a remote device"""
        source_url = self.get_device_url(request.source_device_id)
        if not source_url:
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=request.target_path or request.source_path,
                bytes_copied=0,
                error="Source device not found",
            )

        target_path = Path(request.target_path or request.source_path)

        try:
            # Download from remote
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.get(
                    f"{source_url}/api/files/download",
                    params={"path": request.source_path},
                    follow_redirects=True,
                )
                response.raise_for_status()

                content = response.content
                bytes_downloaded = len(content)

            # Ensure target directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Write to local file
            async with aiofiles.open(target_path, "wb") as f:
                await f.write(content)

            if progress_callback:
                await progress_callback(1.0)

            return FileCopyResponse(
                success=True,
                source_path=request.source_path,
                target_path=str(target_path),
                bytes_copied=bytes_downloaded,
            )

        except Exception as e:
            logger.error(f"Download error: {e}")
            return FileCopyResponse(
                success=False,
                source_path=request.source_path,
                target_path=str(target_path),
                bytes_copied=0,
                error=str(e),
            )

    async def _remote_to_remote(
        self,
        request: FileCopyRequest,
        progress_callback: Optional[Callable] = None
    ) -> FileCopyResponse:
        """Transfer file between two remote devices through this server"""
        # First download from source
        download_result = await self._download_from_remote(
            FileCopyRequest(
                source_device_id=request.source_device_id,
                source_path=request.source_path,
                target_device_id="local",
                target_path=f"/tmp/transfer_{request.source_device_id}_{Path(request.source_path).name}",
            ),
            lambda p: progress_callback(p * 0.5) if progress_callback else None
        )

        if not download_result.success:
            return download_result

        # Then upload to target
        upload_result = await self._upload_to_remote(
            FileCopyRequest(
                source_device_id="local",
                source_path=download_result.target_path,
                target_device_id=request.target_device_id,
                target_path=request.target_path,
            ),
            lambda p: progress_callback(0.5 + p * 0.5) if progress_callback else None
        )

        # Clean up temp file
        try:
            Path(download_result.target_path).unlink()
        except:
            pass

        return upload_result

    async def save_uploaded_file(
        self,
        file_content: bytes,
        filename: str,
        target_path: Optional[str] = None
    ) -> FileCopyResponse:
        """Save an uploaded file to local storage"""
        try:
            if target_path:
                save_path = Path(target_path)
            else:
                # Default to Downloads folder
                save_path = Path.home() / "Downloads" / filename

            # Ensure directory exists
            save_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            async with aiofiles.open(save_path, "wb") as f:
                await f.write(file_content)

            return FileCopyResponse(
                success=True,
                source_path=filename,
                target_path=str(save_path),
                bytes_copied=len(file_content),
            )

        except Exception as e:
            logger.error(f"Save uploaded file error: {e}")
            return FileCopyResponse(
                success=False,
                source_path=filename,
                target_path=target_path or filename,
                bytes_copied=0,
                error=str(e),
            )
