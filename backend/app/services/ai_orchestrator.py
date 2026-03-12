import json
import time
import logging
from typing import Optional, List, Dict, Any, Callable
from openai import AsyncOpenAI

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


# Tool definitions for AI function calling
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
            "description": "Read and extract text content from a file for summarization. Supports PDF, DOCX, XLSX, TXT, CSV, MD, JSON, XML, and code files. Does NOT support images, videos, audio, or archives.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Full path to the file to read"
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to read (default 15000)"
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
    },
    {
        "type": "function",
        "function": {
            "name": "extract_search_filters",
            "description": "Extract structured search parameters from natural language query",
            "parameters": {
                "type": "object",
                "properties": {
                    "keyword": {
                        "type": "string",
                        "description": "Main search keyword extracted from query"
                    },
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "File extensions to filter (e.g., ['pdf', 'docx'])"
                    },
                    "modified_after": {
                        "type": "string",
                        "description": "Date filter for files modified after this date (ISO format or relative like 'yesterday')"
                    },
                    "modified_before": {
                        "type": "string",
                        "description": "Date filter for files modified before this date"
                    },
                    "size_min": {
                        "type": "integer",
                        "description": "Minimum file size in bytes"
                    },
                    "size_max": {
                        "type": "integer",
                        "description": "Maximum file size in bytes"
                    }
                }
            }
        }
    }
]


class AIOrchestrator:
    """Orchestrates AI-powered search using OpenAI-compatible APIs"""

    def __init__(
        self,
        file_search: FileSearchService,
        get_devices_callback,
        search_remote_callback=None,
    ):
        self.file_search = file_search
        self.get_devices = get_devices_callback
        self.search_remote = search_remote_callback

        # Default configuration from settings
        self.provider = settings.ai_provider
        self.api_key = settings.ai_api_key
        self.base_url = settings.ai_base_url
        self.model = settings.ai_model

        # Feature flags (from settings or default to enabled)
        self.nl_search_enabled = True

        # OpenAI client (initialized when needed)
        self._client = None

        # Settings callback for dynamic configuration
        self._get_settings_callback = None

    def set_settings_callback(self, callback: Callable):
        """Set callback to get user settings from database"""
        self._get_settings_callback = callback

    def _get_client(self) -> AsyncOpenAI:
        """Get or create OpenAI client with current configuration"""
        if self._client is None or (hasattr(self, '_last_config') and self._config_changed()):
            self._client = AsyncOpenAI(
                api_key=self.api_key or "dummy",
                base_url=self.base_url,
            )
            self._last_config = {
                "api_key": self.api_key,
                "base_url": self.base_url,
            }
        return self._client

    def _config_changed(self) -> bool:
        """Check if configuration has changed since last client creation"""
        current_config = {
            "api_key": self.api_key,
            "base_url": self.base_url,
        }
        last_config = getattr(self, '_last_config', {})
        return current_config != last_config

    async def _load_settings(self):
        """Load settings from database if callback is set"""
        logger.debug("Loading AI settings from database...")
        if self._get_settings_callback:
            try:
                user_settings = await self._get_settings_callback()
                logger.debug(f"Settings callback returned: {bool(user_settings)}")
                if user_settings:
                    self.provider = user_settings.get("ai_provider", self.provider)

                    # Get provider-specific model
                    if self.provider == "openai":
                        self.model = user_settings.get("openai_model", self.model)
                    elif self.provider == "anthropic":
                        self.model = user_settings.get("anthropic_model", self.model)
                    elif self.provider == "glm":
                        self.model = user_settings.get("glm_model", self.model)
                    else:
                        self.model = user_settings.get("model", self.model)

                    # Get decrypted API key
                    api_key = user_settings.get("api_key")
                    if api_key:
                        self.api_key = api_key
                        logger.debug(f"API key loaded successfully (length: {len(api_key)})")
                    else:
                        logger.warning("API key is empty or None after loading from database")

                    # Use custom base_url if provided, otherwise use preset
                    custom_base_url = user_settings.get("base_url")
                    if custom_base_url and custom_base_url.strip():
                        self.base_url = custom_base_url.strip()
                    else:
                        # Use preset base_url based on provider
                        base_url_map = {
                            "openai": settings.openai_base_url,
                            "anthropic": settings.anthropic_base_url,
                            "glm": settings.glm_base_url,
                        }
                        self.base_url = base_url_map.get(self.provider, settings.ai_base_url)

                    # Update feature flag
                    self.nl_search_enabled = user_settings.get("nl_search_enabled", True)
                    logger.debug(f"NL search enabled: {self.nl_search_enabled}, Provider: {self.provider}, Model: {self.model}")

                    # Reset client to force re-initialization with new config
                    self._client = None

            except Exception as e:
                logger.warning(f"Failed to load settings: {e}")

    async def search(self, request: SearchRequest) -> SearchResponse:
        """
        Process a natural language search query using AI.
        The AI will use tools to search files and return results.
        """
        start_time = time.time()
        tool_calls_log = []

        # Load settings from database
        await self._load_settings()

        # Check if natural language search is enabled and API key is configured
        if not self.nl_search_enabled or not self.api_key or self.api_key == "your_api_key_here":
            # Fallback to basic search without AI
            reason = []
            if not self.nl_search_enabled:
                reason.append("NL search disabled")
            if not self.api_key:
                reason.append("API key is empty")
            elif self.api_key == "your_api_key_here":
                reason.append("API key is placeholder")
            logger.info(f"Using basic search (no AI). Reason: {', '.join(reason)}")
            return await self._basic_search(request)

        try:
            # First, extract structured filters using AI
            filters = await self._extract_filters(request.query)

            # If filters extracted, use them for search
            if filters:
                logger.info(f"Extracted filters: {filters}")
                # Use filters to enhance search
                enhanced_request = SearchRequest(
                    query=filters.get("keyword", request.query),
                    file_types=filters.get("file_types", request.file_types),
                    max_results=request.max_results,
                )
                # Store original query for interpretation
                request._original_query = request.query
                request._extracted_filters = filters
                request = enhanced_request

            # Prepare messages
            messages = [
                {
                    "role": "system",
                    "content": self._get_system_prompt()
                },
                {
                    "role": "user",
                    "content": f"Search for: {getattr(request, '_original_query', request.query)}"
                }
            ]

            # Call AI API using OpenAI SDK
            client = self._get_client()
            result = await client.chat.completions.create(
                model=self.model,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
            )

            # Process the response
            message = result.choices[0].message

            # Handle tool calls
            if hasattr(message, 'tool_calls') and message.tool_calls:
                all_results = []

                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    arguments = json.loads(tool_call.function.arguments)

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

                # Include extracted filters in interpretation
                interpretation = message.content or ""
                if hasattr(request, '_extracted_filters') and request._extracted_filters:
                    filters_str = json.dumps(request._extracted_filters, indent=2)
                    interpretation = f"Filters applied:\n```json\n{filters_str}\n```\n\n{interpretation}"

                return SearchResponse(
                    query=getattr(request, '_original_query', request.query),
                    results=[SearchResult(**r) for r in all_results],
                    total_results=len(all_results),
                    devices_searched=[d.id for d in self.get_devices()],
                    ai_interpretation=interpretation,
                )

            # No tool calls - return AI response as interpretation
            return SearchResponse(
                query=getattr(request, '_original_query', request.query),
                results=[],
                total_results=0,
                devices_searched=[],
                ai_interpretation=message.content or "No files found matching your query.",
            )

        except Exception as e:
            logger.error(f"AI search error: {e}")
            return await self._basic_search(request)

    async def _extract_filters(self, query: str) -> Optional[dict]:
        """Extract structured filters from natural language query"""
        try:
            # Use a simple prompt to extract filters
            extract_messages = [
                {
                    "role": "system",
                    "content": """Extract search parameters from the user's query. Return a JSON object with:
- keyword: main search term
- file_types: array of file extensions (e.g., ["pdf", "docx"])
- modified_after: relative date like "yesterday", "last week", "today"
- size_min, size_max: file size hints in bytes

Only include fields that are clearly mentioned. Return only JSON, no explanation."""
                },
                {
                    "role": "user",
                    "content": query
                }
            ]

            # Call AI without tools for filter extraction
            client = self._get_client()
            result = await client.chat.completions.create(
                model=self.model,
                messages=extract_messages,
            )

            text = result.choices[0].message.content or ""

            # Parse JSON from response
            # Handle markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]

            filters = json.loads(text.strip())

            # Process relative dates
            if "modified_after" in filters:
                filters["modified_after"] = self._parse_relative_date(filters["modified_after"])

            return filters

        except Exception as e:
            logger.warning(f"Failed to extract filters: {e}")
            return None

    def _parse_relative_date(self, relative: str) -> Optional[str]:
        """Parse relative date expressions to ISO format"""
        from datetime import datetime, timedelta

        relative = relative.lower().strip()
        now = datetime.utcnow()

        date_map = {
            "today": now,
            "yesterday": now - timedelta(days=1),
            "last week": now - timedelta(weeks=1),
            "last month": now - timedelta(days=30),
            "this week": now - timedelta(days=now.weekday()),
            "this month": now.replace(day=1),
        }

        if relative in date_map:
            return date_map[relative].isoformat()

        return None

    async def _execute_tool(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool call and return the result"""
        try:
            if tool_name == "search_local_files":
                results = self.file_search.search(
                    query=arguments.get("query", ""),
                    file_types=arguments.get("file_types"),
                )
                return {
                    "results": [r.model_dump(mode='json') for r in results],
                    "count": len(results)
                }

            elif tool_name == "search_all_devices":
                all_results = []

                # Search local
                local_results = self.file_search.search(
                    query=arguments.get("query", ""),
                    file_types=arguments.get("file_types"),
                )
                all_results.extend([r.model_dump(mode='json') for r in local_results])

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
                return result.model_dump(mode='json')

            elif tool_name == "get_device_info":
                devices = self.get_devices()
                return {
                    "devices": [d.model_dump(mode='json') for d in devices],
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
2. Use of the available tools to find matching files
3. Return the results sorted by relevance

Guidelines:
- Be helpful and concise
- If user mentions a file type (like "pdf" or "image"), include it in file_types filter
- If you can't find exact matches, try broader searches
- Explain what you're searching for
"""
