from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from ...models.search import SearchRequest, SearchResponse
from ...services.ai_orchestrator import AIOrchestrator

router = APIRouter(prefix="/search", tags=["search"])


def get_ai_orchestrator() -> AIOrchestrator:
    """Dependency to get AI orchestrator instance"""
    from ..dependencies import get_ai_orchestrator as _get
    return _get()


@router.post("", response_model=SearchResponse)
async def search_files(
    request: SearchRequest,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    """
    Search for files using natural language query.

    The AI will interpret the query and search across all connected devices.
    """
    try:
        response = await orchestrator.search(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/local")
async def search_local_only(
    request: SearchRequest,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    """Search only on this device (no AI interpretation)"""
    try:
        # Force local-only search
        request.devices = ["local"]
        response = await orchestrator.search(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_search_suggestions(
    query: str,
    limit: int = 5,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator)
):
    """Get search suggestions based on indexed files"""
    from ..dependencies import get_file_scanner
    scanner = get_file_scanner()
    if not scanner:
        return {"suggestions": []}

    # Get matching filenames for autocomplete
    suggestions = []
    query_lower = query.lower()

    for file_info in scanner.index.files.values():
        if query_lower in file_info.name.lower():
            suggestions.append({
                "name": file_info.name,
                "path": file_info.relative_path,
                "type": file_info.file_type,
            })
            if len(suggestions) >= limit:
                break

    return {"suggestions": suggestions}
