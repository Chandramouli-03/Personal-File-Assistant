"""
Chat API routes for AI-powered conversations.
"""
import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ...models.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    ConversationInfo,
    ConversationDetail,
    ConversationListResponse,
)
from ...services.chat_service import ChatService
from ...database import get_db
from ..dependencies import get_ai_orchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


def get_chat_service(ai_orchestrator = Depends(get_ai_orchestrator)) -> ChatService:
    """Dependency to get ChatService instance"""
    return ChatService(ai_orchestrator)


@router.post("")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Chat endpoint with streaming support.

    Returns Server-Sent Events (SSE) stream for real-time responses.

    The stream sends different chunk types:
    - content: Text content increment
    - tool_call: AI invoked a tool
    - file_result: File found from search
    - done: Response complete
    - error: An error occurred
    """
    async def generate():
        try:
            async for chunk in chat_service.chat(db, request):
                # Format as SSE
                chunk_dict = chunk.model_dump()
                yield f"data: {json.dumps(chunk_dict)}\n\n"
        except Exception as e:
            logger.error(f"Chat streaming error: {e}", exc_info=True)
            error_chunk = {
                "type": "error",
                "content": str(e)
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    """List all recent conversations"""
    conversations = await chat_service.list_conversations(db, limit)

    return ConversationListResponse(
        conversations=[
            ConversationInfo(
                id=c.id,
                title=c.title,
                created_at=c.created_at.isoformat() if c.created_at else None,
                updated_at=c.updated_at.isoformat() if c.updated_at else None,
                message_count=c.message_count
            )
            for c in conversations
        ]
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get conversation with messages"""
    conversation = await chat_service.get_conversation(db, conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await chat_service.get_conversation_history(db, conversation_id)

    return ConversationDetail(
        conversation=ConversationInfo(
            id=conversation.id,
            title=conversation.title,
            created_at=conversation.created_at.isoformat() if conversation.created_at else None,
            updated_at=conversation.updated_at.isoformat() if conversation.updated_at else None,
            message_count=conversation.message_count
        ),
        messages=[
            ChatMessage(
                id=m.id,
                role=m.role,
                content=m.content,
                tool_calls=json.loads(m.tool_calls) if m.tool_calls else None,
                file_references=json.loads(m.file_references) if m.file_references else None,
                created_at=m.created_at.isoformat() if m.created_at else None
            )
            for m in messages
        ]
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Delete a conversation"""
    conversation = await chat_service.get_conversation(db, conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await chat_service.delete_conversation(db, conversation_id)

    return {"status": "deleted", "conversation_id": conversation_id}
