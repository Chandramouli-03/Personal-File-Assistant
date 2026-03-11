import json
import time
import logging
from typing import Optional
import httpx

from ..config import settings
from ..models.search import (
    SearchRequest,
    SearchResponse,
    SearchResult,
    AIToolCall,
    AIOrchestrationLog,
)
from ..models.device import DeviceInfo
from .file_search import FileSearchService

logger = logging.getLogger(__name__)


# Tool definitions for GLM API
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_local_files",
            "description": "Search for files on the local device using keywords",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (keywords from filename or path)"
                    },
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional file extensions to filter (e.g., ['pdf', 'docx'])"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_all_devices",
            "description": "Search for files across all connected devices",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (keywords from filename or path)"
                    },
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional file extensions to filter"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file_content",
            "description": "Read the content of a text file",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Full path to the file"
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to read (default 5000)"
                    }
                },
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_device_info",
            "description": "Get information about connected devices",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]


class AIOrchestrator:
    """Orchestrates AI-powered search using GLM API"""

    def __init__(
        self,
        file_search: FileSearchService,
        get_devices_callback,
        search_remote_callback=None,
    ):
        self.file_search = file_search
        self.get_devices = get_devices_callback
        self.search_remote = search_remote_callback
        self.api_key = settings.glm_api_key
        self.api_base = settings.glm_api_base_url
        self.model = settings.glm_model

    async def search(self, request: SearchRequest) -> SearchResponse:
        """
        Process a natural language search query using AI.
        The AI will use tools to search files and return results.
        """
        start_time = time.time()
        tool_calls_log = []

        # Check if API key is configured
        if not self.api_key or self.api_key == "your_glm_api_key_here":
            # Fallback to basic search without AI
            return await self._basic_search(request)

        try:
            # Prepare messages
            messages = [
                {
                    "role": "system",
                    "content": self._get_system_prompt()
                },
                {
                    "role": "user",
                    "content": f"Search for: {request.query}"
                }
            ]

            # Call GLM API with tools
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.api_base}chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "tools": TOOLS,
                        "tool_choice": "auto",
                    }
                )
                response.raise_for_status()
                result = response.json()

            # Process the response
            choice = result["choices"][0]
            message = choice["message"]

            # Handle tool calls
            if "tool_calls" in message and message["tool_calls"]:
                all_results = []

                for tool_call in message["tool_calls"]:
                    tool_name = tool_call["function"]["name"]
                    arguments = json.loads(tool_call["function"]["arguments"])

                    # Execute the tool
                    tool_result = await self._execute_tool(tool_name, arguments)
                    tool_calls_log.append(AIToolCall(
                        tool_name=tool_name,
                        arguments=arguments,
                        result=tool_result
                    ))

                    # Collect results
                    if tool_result and "results" in tool_result:
                        all_results.extend(tool_result["results"])

                # Sort by relevance and limit
                all_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
                all_results = all_results[:request.max_results]

                # Build response
                processing_time = int((time.time() - start_time) * 1000)

                return SearchResponse(
                    query=request.query,
                    results=[SearchResult(**r) for r in all_results],
                    total_results=len(all_results),
                    devices_searched=[d.id for d in self.get_devices()],
                    ai_interpretation=message.get("content", ""),
                )

            # No tool calls - return AI response as interpretation
            return SearchResponse(
                query=request.query,
                results=[],
                total_results=0,
                devices_searched=[],
                ai_interpretation=message.get("content", "No files found matching your query."),
            )

        except httpx.HTTPError as e:
            logger.error(f"GLM API error: {e}")
            # Fallback to basic search
            return await self._basic_search(request)
        except Exception as e:
            logger.error(f"AI search error: {e}")
            return await self._basic_search(request)

    async def _execute_tool(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool call and return the result"""
        try:
            if tool_name == "search_local_files":
                results = self.file_search.search(
                    query=arguments.get("query", ""),
                    file_types=arguments.get("file_types"),
                )
                return {
                    "results": [r.model_dump() for r in results],
                    "count": len(results)
                }

            elif tool_name == "search_all_devices":
                all_results = []

                # Search local
                local_results = self.file_search.search(
                    query=arguments.get("query", ""),
                    file_types=arguments.get("file_types"),
                )
                all_results.extend([r.model_dump() for r in local_results])

                # Search remote devices if callback provided
                if self.search_remote:
                    remote_results = await self.search_remote(
                        query=arguments.get("query", ""),
                        file_types=arguments.get("file_types"),
                    )
                    all_results.extend(remote_results)

                return {
                    "results": all_results,
                    "count": len(all_results)
                }

            elif tool_name == "read_file_content":
                result = await self.file_search.read_file(
                    file_path=arguments.get("file_path", ""),
                    max_chars=arguments.get("max_chars", 5000),
                )
                return result.model_dump()

            elif tool_name == "get_device_info":
                devices = self.get_devices()
                return {
                    "devices": [d.model_dump() for d in devices],
                    "count": len(devices)
                }

            else:
                return {"error": f"Unknown tool: {tool_name}"}

        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            return {"error": str(e)}

    async def _basic_search(self, request: SearchRequest) -> SearchResponse:
        """Fallback basic search without AI"""
        results = self.file_search.search(
            query=request.query,
            file_types=request.file_types,
            max_results=request.max_results,
        )

        return SearchResponse(
            query=request.query,
            results=results,
            total_results=len(results),
            devices_searched=[self.file_search.scanner.device_id],
            ai_interpretation=None,
        )

    def _get_system_prompt(self) -> str:
        """Get the system prompt for the AI"""
        devices = self.get_devices()
        device_list = ", ".join([d.name for d in devices]) if devices else "this device"

        return f"""You are a helpful file search assistant. Your job is to help users find files across their connected devices.

Available devices: {device_list}

When a user asks to find files:
1. Extract key search terms from their query
2. Use the search tools to find matching files
3. Return the results sorted by relevance

Guidelines:
- Be helpful and concise
- If the user mentions a file type (like "pdf" or "image"), include it in file_types filter
- If you can't find exact matches, try broader searches
- Explain what you're searching for
"""
