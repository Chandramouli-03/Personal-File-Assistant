from typing import Optional
from pydantic import BaseModel, Field
from .file import FileInfo


class SearchRequest(BaseModel):
    """Natural language search request"""
    query: str
    file_types: Optional[list[str]] = None  # e.g., ["pdf", "docx"]
    devices: Optional[list[str]] = None  # Specific device IDs to search, None = all
    max_results: int = 50


class SearchResult(BaseModel):
    """A single search result"""
    file_info: FileInfo
    device_name: str
    device_id: str
    relevance_score: float = 0.0  # 0.0 to 1.0
    match_reason: str = ""  # Why this file matched


class SearchResponse(BaseModel):
    """Response with search results"""
    query: str
    results: list[SearchResult]
    total_results: int
    devices_searched: list[str]
    ai_interpretation: Optional[str] = None  # AI's understanding of the query


class AISearchContext(BaseModel):
    """Context passed to AI for search orchestration"""
    query: str
    available_devices: list[str]
    file_types_hint: Optional[list[str]] = None
    previous_results: Optional[list[SearchResult]] = None


class AIToolCall(BaseModel):
    """Represents a tool call from the AI"""
    tool_name: str
    arguments: dict
    result: Optional[dict] = None
    error: Optional[str] = None


class AIOrchestrationLog(BaseModel):
    """Log of AI orchestration for debugging"""
    query: str
    tool_calls: list[AIToolCall] = []
    final_response: Optional[SearchResponse] = None
    processing_time_ms: int = 0
