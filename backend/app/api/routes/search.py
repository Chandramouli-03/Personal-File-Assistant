from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ...models.search import SearchRequest, SearchResponse
from ...services.ai_orchestrator import AIOrchestrator
from ...services.embedding_service import EmbeddingService
from ...database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


# Request/Response models for semantic search
class SemanticSearchRequest(BaseModel):
    """Request model for semantic search"""
    query: str
    limit: int = 10
    threshold: float = 0.7


class SemanticSearchResult(BaseModel):
    """Result model for semantic search"""
    file_id: str
    similarity: float
    content_preview: Optional[str]


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


@router.post("/semantic", response_model=List[SemanticSearchResult])
async def semantic_search(
    request: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Search for files using semantic similarity.

    Uses vector embeddings to find files that are semantically similar
    to the query, even if they don't have similar names.
    """
    try:
        embedding_service = EmbeddingService(db)

        # Initialize with user settings
        await embedding_service.initialize()

        # Search for similar embeddings
        results = await embedding_service.search_similar(
            query=request.query,
            limit=request.limit,
            threshold=request.threshold
        )

        # Get file info for each result
        # For now, return just the similarity info
        # TODO: Could enrich with full file info
        return [
            {
                "file_id": r["file_id"],
                "similarity": r["similarity"],
                "content_preview": r.get("content_preview"),
            }
            for r in results
        ]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
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
