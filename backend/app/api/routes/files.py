from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path
from typing import Optional

from ...models.file import (
    FileInfo,
    FileReadRequest,
    FileReadResponse,
    FileCopyRequest,
    FileCopyResponse,
)
from ...services.file_search import FileSearchService
from ...services.file_transfer import FileTransferService

router = APIRouter(prefix="/files", tags=["files"])


def get_file_search() -> FileSearchService:
    """Dependency to get file search service"""
    from ..dependencies import get_file_search as _get
    return _get()


def get_file_transfer() -> FileTransferService:
    """Dependency to get file transfer service"""
    from ..dependencies import get_file_transfer as _get
    return _get()


@router.post("/read", response_model=FileReadResponse)
async def read_file(
    request: FileReadRequest,
    search: FileSearchService = Depends(get_file_search)
):
    """Read the contents of a file"""
    result = await search.read_file(
        file_path=request.file_path,
        max_chars=request.max_chars
    )

    if result.error:
        raise HTTPException(status_code=400, detail=result.error)

    return result


@router.get("/info")
async def get_file_info(
    path: str,
    search: FileSearchService = Depends(get_file_search)
):
    """Get information about a specific file"""
    file_info = search.scanner.get_file(path)
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")

    return file_info


@router.get("/download")
async def download_file(
    path: str,
    search: FileSearchService = Depends(get_file_search)
):
    """Download a file"""
    file_path = search.get_file_path(path)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File does not exist")

    return FileResponse(
        path=file_path,
        filename=file_path.name,
        media_type="application/octet-stream"
    )


@router.post("/copy", response_model=FileCopyResponse)
async def copy_file(
    request: FileCopyRequest,
    transfer: FileTransferService = Depends(get_file_transfer)
):
    """Copy a file between devices"""
    result = await transfer.copy_file(request)
    return result


@router.post("/upload", response_model=FileCopyResponse)
async def upload_file(
    file: UploadFile = File(...),
    target_path: Optional[str] = Form(None),
    transfer: FileTransferService = Depends(get_file_transfer)
):
    """Upload a file to this device"""
    content = await file.read()
    result = await transfer.save_uploaded_file(
        file_content=content,
        filename=file.filename or "uploaded_file",
        target_path=target_path
    )
    return result


@router.get("/preview/{file_id}")
async def preview_file(
    file_id: str,
    search: FileSearchService = Depends(get_file_search)
):
    """Get a preview of a file (for supported types)"""
    # Find file by ID
    for file_info in search.scanner.index.files.values():
        if file_info.id == file_id:
            # Check if it's an image
            from ...models.file import FileType
            if file_info.file_type == FileType.IMAGE:
                file_path = Path(file_info.path)
                if file_path.exists():
                    return FileResponse(
                        path=file_path,
                        media_type="image/jpeg"  # Will be adjusted by browser
                    )

            # For text files, return content
            if file_info.file_type == FileType.DOCUMENT:
                result = await search.read_file(file_info.path, max_chars=5000)
                return {
                    "content": result.content,
                    "truncated": result.truncated,
                    "file_info": file_info
                }

            raise HTTPException(
                status_code=400,
                detail="Preview not available for this file type"
            )

    raise HTTPException(status_code=404, detail="File not found")


@router.get("/stats")
async def get_file_stats(
    search: FileSearchService = Depends(get_file_search)
):
    """Get file scanning statistics"""
    return search.scanner.get_stats()


@router.post("/rescan")
async def rescan_files(
    search: FileSearchService = Depends(get_file_search)
):
    """Trigger a file rescan"""
    if search.scanner.is_scanning:
        return {
            "success": False,
            "message": "Scan already in progress",
            "progress": search.scanner.scan_progress
        }

    # Start async rescan
    import asyncio
    asyncio.create_task(search.scanner.scan_all())

    return {
        "success": True,
        "message": "Rescan started"
    }
