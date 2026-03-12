"""
Chat models for the AI assistant conversation system.
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


class ChatMessage(BaseModel):
    """Single chat message"""
    id: Optional[str] = None
    role: str  # 'user' or 'assistant'
    content: str
    tool_calls: Optional[List[dict]] = None
    tool_results: Optional[List[dict]] = None
    file_references: Optional[List[dict]] = None
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    """Chat completion request"""
    message: str
    conversation_id: Optional[str] = None  # None for new conversation
    stream: bool = True  # Enable streaming by default


class ChatResponse(BaseModel):
    """Chat completion response (non-streaming)"""
    conversation_id: str
    message: ChatMessage
    tool_calls: Optional[List[dict]] = None
    file_results: Optional[List[dict]] = None


class StreamingChunk(BaseModel):
    """Streaming response chunk for SSE"""
    type: str  # 'content', 'tool_call', 'file_result', 'done', 'error'
    content: Optional[str] = None
    tool_call: Optional[dict] = None
    file_result: Optional[dict] = None
    conversation_id: Optional[str] = None
    message: Optional[str] = None  # For error messages


class ConversationInfo(BaseModel):
    """Conversation metadata"""
    id: str
    title: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    message_count: int = 0


class ConversationDetail(BaseModel):
    """Conversation with messages"""
    conversation: ConversationInfo
    messages: List[ChatMessage]


class ConversationListResponse(BaseModel):
    """List of conversations"""
    conversations: List[ConversationInfo]
