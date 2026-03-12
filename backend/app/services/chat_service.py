"""
Chat service for AI-powered conversations with tool calling.
Handles conversation management, streaming responses, and tool execution.
"""
import json
import logging
from typing import Optional, List, AsyncGenerator
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from ..models.db_models import Conversation, Message
from ..models.chat import ChatRequest, ChatMessage, StreamingChunk
from .ai_orchestrator import AIOrchestrator, TOOLS

logger = logging.getLogger(__name__)


class ChatService:
    """Service for handling chat conversations with AI"""

    def __init__(self, ai_orchestrator: AIOrchestrator):
        self.ai_orchestrator = ai_orchestrator

    async def create_conversation(
        self,
        db: AsyncSession,
        title: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation"""
        conversation = Conversation(title=title)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        logger.info(f"Created conversation: {conversation.id}")
        return conversation

    async def get_conversation(
        self,
        db: AsyncSession,
        conversation_id: str
    ) -> Optional[Conversation]:
        """Get conversation by ID"""
        result = await db.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def get_conversation_history(
        self,
        db: AsyncSession,
        conversation_id: str,
        limit: int = 50
    ) -> List[Message]:
        """Get message history for a conversation"""
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def add_message(
        self,
        db: AsyncSession,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: Optional[List[dict]] = None,
        tool_results: Optional[List[dict]] = None,
        file_references: Optional[List[dict]] = None
    ) -> Message:
        """Add a message to conversation"""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=json.dumps(tool_calls) if tool_calls else None,
            tool_results=json.dumps(tool_results) if tool_results else None,
            file_references=json.dumps(file_references) if file_references else None
        )
        db.add(message)

        # Update conversation timestamp and message count
        await db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(
                updated_at=datetime.utcnow(),
                message_count=Conversation.message_count + 1
            )
        )

        await db.commit()
        await db.refresh(message)
        return message

    async def update_conversation_title(
        self,
        db: AsyncSession,
        conversation_id: str,
        title: str
    ):
        """Update conversation title"""
        await db.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(title=title[:200] if title else None)
        )
        await db.commit()

    async def chat(
        self,
        db: AsyncSession,
        request: ChatRequest
    ) -> AsyncGenerator[StreamingChunk, None]:
        """
        Process chat request with streaming response.
        Yields StreamingChunk objects as they're generated.
        """
        # Load AI settings
        await self.ai_orchestrator._load_settings()

        # Get or create conversation
        conversation_id = request.conversation_id
        is_new_conversation = not conversation_id

        if not conversation_id:
            conversation = await self.create_conversation(db)
            conversation_id = conversation.id
        else:
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                yield StreamingChunk(
                    type="error",
                    content=f"Conversation {conversation_id} not found"
                )
                return

        # Add user message
        user_message = await self.add_message(
            db, conversation_id, "user", request.message
        )

        # Update title for new conversation
        if is_new_conversation:
            title = request.message[:100] + ("..." if len(request.message) > 100 else "")
            await self.update_conversation_title(db, conversation_id, title)

        # Get conversation history for context
        history = await self.get_conversation_history(db, conversation_id)

        # Build messages for AI
        messages = self._build_ai_messages(history)

        # Check if AI is configured
        if not self.ai_orchestrator.api_key or self.ai_orchestrator.api_key == "your_api_key_here":
            # Fallback response when AI is not configured
            fallback_content = "I'm not configured yet. Please add an API key in Settings to enable AI-powered search."
            await self.add_message(db, conversation_id, "assistant", fallback_content)

            yield StreamingChunk(
                type="content",
                content=fallback_content,
                conversation_id=conversation_id
            )
            yield StreamingChunk(type="done", conversation_id=conversation_id)
            return

        # Collect tool calls and file results
        tool_calls = []
        file_results = []

        try:
            # Call AI with streaming - agentic loop
            client = self.ai_orchestrator._get_client()

            # Keep looping until AI is done (no more tool calls)
            max_iterations = 5  # Prevent infinite loops
            iteration = 0

            while iteration < max_iterations:
                iteration += 1
                logger.info(f"AI iteration {iteration}")

                stream = await client.chat.completions.create(
                    model=self.ai_orchestrator.model,
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    stream=True
                )

                assistant_content = ""
                current_tool_calls = {}  # Track tool calls being built

                async for chunk in stream:
                    delta = chunk.choices[0].delta

                    # Stream content
                    if delta.content:
                        content_chunk = delta.content
                        assistant_content += content_chunk
                        yield StreamingChunk(
                            type="content",
                            content=content_chunk,
                            conversation_id=conversation_id
                        )

                    # Handle tool calls (streaming)
                    if hasattr(delta, 'tool_calls') and delta.tool_calls:
                        for tool_call_chunk in delta.tool_calls:
                            idx = tool_call_chunk.index

                            # Initialize tool call if new
                            if idx not in current_tool_calls:
                                current_tool_calls[idx] = {
                                    "id": "",
                                    "name": "",
                                    "arguments": ""
                                }

                            # Accumulate tool call data
                            if tool_call_chunk.id:
                                current_tool_calls[idx]["id"] = tool_call_chunk.id
                            if tool_call_chunk.function:
                                if tool_call_chunk.function.name:
                                    current_tool_calls[idx]["name"] = tool_call_chunk.function.name
                                if tool_call_chunk.function.arguments:
                                    current_tool_calls[idx]["arguments"] += tool_call_chunk.function.arguments

                # Process completed tool calls
                iteration_tool_calls = []
                for idx in sorted(current_tool_calls.keys()):
                    tool_info = current_tool_calls[idx]
                    if tool_info["name"]:
                        iteration_tool_calls.append(tool_info)
                        tool_calls.append(tool_info)

                        yield StreamingChunk(
                            type="tool_call",
                            tool_call=tool_info,
                            conversation_id=conversation_id
                        )

                        # Execute the tool
                        try:
                            arguments = json.loads(tool_info["arguments"])
                            result = await self.ai_orchestrator._execute_tool(
                                tool_info["name"],
                                arguments
                            )

                            # Store tool result for sending back to AI
                            tool_info["result"] = result

                            # Check if result contains files
                            if result and "results" in result:
                                for file_result in result["results"]:
                                    # Format file result for frontend
                                    formatted_file = self._format_file_result(file_result)
                                    file_results.append(formatted_file)
                                    yield StreamingChunk(
                                        type="file_result",
                                        file_result=formatted_file,
                                        conversation_id=conversation_id
                                    )
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse tool arguments: {e}")
                            tool_info["result"] = {"error": str(e)}
                        except Exception as e:
                            logger.error(f"Tool execution error: {e}")
                            tool_info["result"] = {"error": str(e)}

                # If no tool calls, we're done
                if not iteration_tool_calls:
                    break

                # Add assistant message with tool calls to conversation
                messages.append({
                    "role": "assistant",
                    "content": assistant_content or None,
                    "tool_calls": [
                        {
                            "id": tc["id"],
                            "type": "function",
                            "function": {
                                "name": tc["name"],
                                "arguments": tc["arguments"]
                            }
                        }
                        for tc in iteration_tool_calls
                    ]
                })

                # Add tool results to conversation
                for tc in iteration_tool_calls:
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": json.dumps(tc.get("result", {}))
                    })

            # Save assistant message
            await self.add_message(
                db,
                conversation_id,
                "assistant",
                assistant_content,
                tool_calls=tool_calls if tool_calls else None,
                file_references=file_results if file_results else None
            )

            # Send done signal
            yield StreamingChunk(type="done", conversation_id=conversation_id)

        except Exception as e:
            logger.error(f"Chat error: {e}", exc_info=True)
            yield StreamingChunk(
                type="error",
                content=f"An error occurred: {str(e)}"
            )

    def _build_ai_messages(self, history: List[Message]) -> List[dict]:
        """Build messages array for AI from conversation history"""
        messages = [
            {"role": "system", "content": self._get_system_prompt()}
        ]

        # Add conversation history (limit to last 20 messages for context)
        recent_history = history[-20:] if len(history) > 20 else history

        for msg in recent_history:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })

        return messages

    def _get_system_prompt(self) -> str:
        """Get system prompt for the AI assistant"""
        try:
            devices = self.ai_orchestrator.get_devices()
            device_list = ", ".join([d.name for d in devices]) if devices else "this device"
        except Exception:
            device_list = "this device"

        return f"""You are a helpful personal assistant that helps users find and manage files across their devices.

Available devices: {device_list}

Your capabilities:
- Search for files by name, type, or content
- Read file contents and provide summaries
- Get device information
- Help organize and understand files

When a user asks to find files:
1. Use the search tools to find matching files
2. Present results clearly with file names, sizes, and locations
3. Offer to help with actions like reading, previewing, or organizing

Be conversational, helpful, and proactive. If you're unsure what the user wants, ask clarifying questions.

Important guidelines:
- If the user mentions a file type (like "pdf" or "image"), include it in the file_types filter
- If you can't find exact matches, try broader searches
- Always explain what you're doing when using tools
- Be concise but thorough in your responses"""

    def _format_file_result(self, file_data: dict) -> dict:
        """Format file result for frontend display"""
        # Handle both dict and object formats
        if hasattr(file_data, 'file_info'):
            # It's a SearchResult object
            file_info = file_data.file_info
            return {
                "id": getattr(file_info, 'id', ''),
                "name": getattr(file_info, 'name', ''),
                "path": getattr(file_info, 'path', ''),
                "relative_path": getattr(file_info, 'relative_path', ''),
                "extension": getattr(file_info, 'extension', ''),
                "file_type": getattr(file_info, 'file_type', ''),
                "size": getattr(file_info, 'size_bytes', 0),
                "modified_time": str(getattr(file_info, 'modified_time', '')),
                "device_name": getattr(file_data, 'device_name', ''),
                "device_id": getattr(file_data, 'device_id', ''),
                "relevance_score": getattr(file_data, 'relevance_score', 0),
                "match_reason": getattr(file_data, 'match_reason', ''),
            }
        else:
            # It's already a dict
            file_info = file_data.get('file_info', file_data)
            return {
                "id": file_info.get('id', ''),
                "name": file_info.get('name', ''),
                "path": file_info.get('path', ''),
                "relative_path": file_info.get('relative_path', ''),
                "extension": file_info.get('extension', ''),
                "file_type": file_info.get('file_type', ''),
                "size": file_info.get('size_bytes', 0),
                "modified_time": file_info.get('modified_time', ''),
                "device_name": file_data.get('device_name', ''),
                "device_id": file_data.get('device_id', ''),
                "relevance_score": file_data.get('relevance_score', 0),
                "match_reason": file_data.get('match_reason', ''),
            }

    async def list_conversations(
        self,
        db: AsyncSession,
        limit: int = 20
    ) -> List[Conversation]:
        """List recent conversations"""
        result = await db.execute(
            select(Conversation)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def delete_conversation(
        self,
        db: AsyncSession,
        conversation_id: str
    ):
        """Delete a conversation and all its messages"""
        from sqlalchemy import delete
        await db.execute(
            delete(Conversation).where(Conversation.id == conversation_id)
        )
        await db.commit()
        logger.info(f"Deleted conversation: {conversation_id}")
