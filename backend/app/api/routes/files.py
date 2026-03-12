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
    FileBrowseRequest,
    FileBrowseResponse,
    FolderInfo,
    FileType,
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


@router.post("/browse", response_model=FileBrowseResponse)
async def browse_files(
    request: FileBrowseRequest,
    search: FileSearchService = Depends(get_file_search)
):
    """Browse files on a device with folder navigation - simple file explorer style"""

    # Get all files from the in-memory index
    all_files = list(search.scanner.index.files.values())

    # Normalize folder path
    folder_path = request.folder_path.strip("/") if request.folder_path else ""

    # SEARCH MODE: When search term is provided, search across ALL files
    if request.search:
        search_lower = request.search.lower()
        filtered_files = []

        for file_info in all_files:
            # Check if file name matches search
            if search_lower in file_info.name.lower():
                # Apply file type filter if provided
                if request.file_type:
                    try:
                        filter_type = FileType(request.file_type)
                        if file_info.file_type != filter_type:
                            continue
                    except ValueError:
                        pass
                filtered_files.append(file_info)

        # No folders shown in search results - just files with their full paths
        filtered_files.sort(key=lambda f: f.name.lower())

        # Pagination
        total = len(filtered_files)
        offset = (request.page - 1) * request.page_size
        paginated_files = filtered_files[offset:offset + request.page_size]

        return FileBrowseResponse(
            files=paginated_files,
            folders=[],  # No folders in search results
            total=total,
            page=request.page,
            page_size=request.page_size,
            current_path="",  # No specific folder in search mode
            has_more=(offset + len(paginated_files)) < total,
        )

    # BROWSE MODE: Navigate through folders
    # Collect folders and files separately
    folder_map = {}  # path -> {name, file_count, total_size}
    filtered_files = []

    for file_info in all_files:
        rel_path = file_info.relative_path or ""

        # Files at root (no folder) - skip for now
        if not rel_path or "/" not in rel_path:
            continue

        # Split path into parts
        parts = rel_path.split("/")

        # Determine if this file is relevant to current folder
        if folder_path:
            # Browsing a specific folder
            folder_prefix = folder_path + "/"

            if rel_path.startswith(folder_prefix):
                # File is under current folder
                remaining = rel_path[len(folder_prefix):]

                if "/" in remaining:
                    # This is in a subfolder - extract subfolder name
                    subfolder_name = remaining.split("/")[0]
                    subfolder_path = folder_path + "/" + subfolder_name

                    if subfolder_path not in folder_map:
                        folder_map[subfolder_path] = {
                            "name": subfolder_name,
                            "path": subfolder_path,
                            "file_count": 0,
                            "total_size": 0,
                        }
                    folder_map[subfolder_path]["file_count"] += 1
                    folder_map[subfolder_path]["total_size"] += file_info.size
                else:
                    # File is directly in current folder
                    filtered_files.append(file_info)
        else:
            # At root level
            first_folder = parts[0]

            if len(parts) == 1:
                # File at root level (shouldn't happen since we checked "/" above)
                continue
            elif len(parts) == 2:
                # File in first-level folder - show the folder
                if first_folder not in folder_map:
                    folder_map[first_folder] = {
                        "name": first_folder,
                        "path": first_folder,
                        "file_count": 0,
                        "total_size": 0,
                    }
                folder_map[first_folder]["file_count"] += 1
                folder_map[first_folder]["total_size"] += file_info.size

    # Apply file type filter to files only
    if request.file_type:
        try:
            filter_type = FileType(request.file_type)
            filtered_files = [f for f in filtered_files if f.file_type == filter_type]
        except ValueError:
            pass

    # Sort folders first, then files
    folders = [
        FolderInfo(
            name=data["name"],
            path=data["path"],
            file_count=data["file_count"],
            total_size=data["total_size"],
        )
        for data in folder_map.values()
    ]
    folders.sort(key=lambda f: f.name.lower())

    filtered_files.sort(key=lambda f: f.name.lower())

    # Pagination for files only
    total = len(filtered_files)
    offset = (request.page - 1) * request.page_size
    paginated_files = filtered_files[offset:offset + request.page_size]

    return FileBrowseResponse(
        files=paginated_files,
        folders=folders,
        total=total,
        page=request.page,
        page_size=request.page_size,
        current_path=folder_path,
        has_more=(offset + len(paginated_files)) < total,
    )
