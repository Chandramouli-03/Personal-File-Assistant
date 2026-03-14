# Personal Assistant Architecture Documentation

This document explains the internal architecture of the Personal Assistant application, focusing on how AI tools, structured output, agents, device pairing, and local network file sharing work.

---

## Table of Contents

1. [AI Tools Implementation](#1-ai-tools-implementation)
2. [Structured Output](#2-structured-output)
3. [Agents System](#3-agents-system)
4. [Device Pairing](#4-device-pairing)
5. [Local Network File Sharing](#5-local-network-file-sharing)

---

## 1. AI Tools Implementation

### Overview

The Personal Assistant uses **OpenAI-compatible function calling** to enable AI tools. Tools are defined as JSON schemas that the AI model can invoke to perform actions like searching files, reading content, and getting device information.

### Tool Definitions

**File:** `backend/app/services/ai_orchestrator.py` (lines 22-137)

```python
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
            "description": "Read and extract text content from a file for summarization",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Full path to the file to read"
                    },
                    "max_chars": {
                        "type": "integer",
                        "description": "Maximum characters to read (default: 15000)"
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
                        "description": "Main search keyword"
                    },
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "File type filters"
                    },
                    "modified_after": {
                        "type": "string",
                        "description": "Date filter (ISO format)"
                    },
                    "modified_before": {
                        "type": "string",
                        "description": "Date filter (ISO format)"
                    },
                    "size_min": {
                        "type": "integer",
                        "description": "Minimum file size in bytes"
                    },
                    "size_max": {
                        "type": "integer",
                        "description": "Maximum file size in bytes"
                    }
                },
                "required": ["keyword"]
            }
        }
    }
]
```

### AI Orchestrator

**File:** `backend/app/services/ai_orchestrator.py` (lines 140-527)

The `AIOrchestrator` class manages tool registration and execution:

```python
class AIOrchestrator:
    def __init__(
        self,
        file_search: FileSearchService,
        get_devices_callback,
        search_remote_callback=None,
    ):
        self.file_search = file_search
        self.get_devices = get_devices_callback
        self.search_remote = search_remote_callback

        # Configuration from settings
        self.provider = settings.ai_provider
        self.api_key = settings.ai_api_key
        self.base_url = settings.ai_base_url
        self.model = settings.ai_model
```

### Multi-Provider Support

The system supports multiple AI providers through OpenAI-compatible APIs:

| Provider | Base URL | Default Model |
|-----------|-----------|---------------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o-mini |
| Anthropic | `https://api.anthropic.com/v1` | claude-3-5-sonnet-20241022 |
| GLM (Zhipu AI) | `https://open.bigmodel.cn/api/paas/v4` | glm-4 |
| Custom | User-configurable | User-configurable |

### Tool Execution

**File:** `backend/app/services/ai_orchestrator.py` (lines 435-490)

```python
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
            # Search local + remote devices
            all_results = []
            local_results = self.file_search.search(
                query=arguments.get("query", ""),
                file_types=arguments.get("file_types"),
            )
            all_results.extend([r.model_dump(mode='json') for r in local_results])

            if self.search_remote:
                remote_results = await self.search_remote(
                    query=arguments.get("query", ""),
                    file_types=arguments.get("file_types"),
                )
                all_results.extend(remote_results)
            return {"results": all_results, "count": len(all_results)}

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
    except Exception as e:
        logger.error(f"Tool execution error: {e}")
        return {"error": str(e), "tool": tool_name}
```

### Agentic Loop with Streaming

**File:** `backend/app/services/chat_service.py` (lines 113-323)

The chat service implements an iterative agentic loop with Server-Sent Events (SSE) streaming:

```python
async def chat(self, db: AsyncSession, request: ChatRequest) -> AsyncGenerator[StreamingChunk, None]:
    # ... setup conversation ...

    max_iterations = 5  # Prevent infinite loops
    iteration = 0

    while iteration < max_iterations:
        iteration += 1

        # Call AI with streaming
        stream = await client.chat.completions.create(
            model=self.ai_orchestrator.model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            stream=True
        )

        assistant_content = ""
        current_tool_calls = {}

        # Process streaming response
        async for chunk in stream:
            delta = chunk.choices[0].delta

            # Stream content to client
            if delta.content:
                yield StreamingChunk(
                    type="content",
                    content=delta.content,
                    conversation_id=conversation_id
                )

            # Handle tool calls (streaming)
            if hasattr(delta, 'tool_calls') and delta.tool_calls:
                for tool_call_chunk in delta.tool_calls:
                    idx = tool_call_chunk.index
                    if idx not in current_tool_calls:
                        current_tool_calls[idx] = {
                            "id": "",
                            "name": "",
                            "arguments": ""
                        }
                    if tool_call_chunk.id:
                        current_tool_calls[idx]["id"] = tool_call_chunk.id
                    if tool_call_chunk.function:
                        if tool_call_chunk.function.name:
                            current_tool_calls[idx]["name"] = tool_call_chunk.function.name
                        if tool_call_chunk.function.arguments:
                            current_tool_calls[idx]["arguments"] += tool_call_chunk.function.arguments

        # Execute completed tool calls
        iteration_tool_calls = list(current_tool_calls.values())
        for tool_info in iteration_tool_calls:
            try:
                arguments = json.loads(tool_info["arguments"])
                result = await self.ai_orchestrator._execute_tool(
                    tool_info["name"],
                    arguments
                )
                tool_info["result"] = result

                # Send tool result to client
                yield StreamingChunk(
                    type="tool_call",
                    tool_call=tool_info,
                    conversation_id=conversation_id
                )

                # Send file results to client
                if result and "results" in result:
                    for file_data in result["results"]:
                        formatted_file = self._format_file_result(file_data)
                        yield StreamingChunk(
                            type="file_result",
                            file_result=formatted_file,
                            conversation_id=conversation_id
                        )
            except Exception as e:
                logger.error(f"Tool execution error: {e}")
                yield StreamingChunk(
                    type="error",
                    message=str(e),
                    conversation_id=conversation_id
                )

        # If no tool calls, we're done
        if not iteration_tool_calls:
            break

        # Add tool results to messages for next iteration
        messages.append({
            "role": "assistant",
            "content": assistant_content or None,
            "tool_calls": [self._tool_call_to_api_format(tc) for tc in iteration_tool_calls]
        })

        for tc in iteration_tool_calls:
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps(tc.get("result", {}), default=str)
            })

    yield StreamingChunk(type="done", conversation_id=conversation_id)
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                           │
│  ┌─────────────────┐    ┌──────────────────┐             │
│  │  ChatService    │───►│  AIOrchestrator │             │
│  │                 │    │                  │             │
│  │ - Agentic Loop  │    │ - Tools Defs    │             │
│  │ - Streaming     │    │ - Tool Router   │             │
│  └────────┬────────┘    └────────┬─────────┘             │
│           │                        │                          │
│           │                        │                          │
│           ▼                        ▼                          │
│  ┌─────────────────┐    ┌──────────────────┐             │
│  │ OpenAI API      │    │  FileSearch     │             │
│  │ (compatible)    │    │  Service        │             │
│  └─────────────────┘    └──────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         ▲                                        ▲
         │                                        │
         └──────────────── SSE Stream ───────────────┘
```

---

## 2. Structured Output

### Overview

The application uses **OpenAI function calling schemas** for structured output rather than raw JSON Schema response formats. Pydantic models provide runtime validation for all structured data.

### Tool Definitions as JSON Schemas

Tool parameters are defined using JSON Schema format that AI models understand:

```python
{
    "type": "function",
    "function": {
        "name": "search_local_files",
        "description": "Search for files on the local device using keywords",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "file_types": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "File type filters"
                }
            },
            "required": ["query"]
        }
    }
}
```

### Pydantic Models for Validation

**File:** `backend/app/models/search.py`

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SearchRequest(BaseModel):
    """Natural language search request"""
    query: str
    file_types: Optional[List[str]] = None
    devices: Optional[List[str]] = None
    max_results: int = 50


class FileInfo(BaseModel):
    """Information about a file in index"""
    id: str
    name: str
    path: str
    relative_path: str
    extension: str
    file_type: str
    size: int
    modified_time: datetime
    device_id: str
    scan_root: str
    preview_text: Optional[str] = None


class SearchResult(BaseModel):
    """A single search result"""
    file_info: FileInfo
    device_name: str
    device_id: str
    relevance_score: float = 0.0
    match_reason: str = ""


class SearchResponse(BaseModel):
    """Response with search results"""
    query: str
    results: List[SearchResult]
    total_results: int
    devices_searched: List[str]
    ai_interpretation: Optional[str] = None
```

### Streaming Chunk Model

**File:** `backend/app/models/chat.py` (lines 35-42)

```python
class StreamingChunk(BaseModel):
    """Streaming response chunk for SSE"""
    type: str  # 'content', 'tool_call', 'file_result', 'done', 'error'
    content: Optional[str] = None
    tool_call: Optional[dict] = None
    file_result: Optional[dict] = None
    conversation_id: Optional[str] = None
    message: Optional[str] = None
```

### Tool Call Parsing from Streaming

**File:** `backend/app/services/chat_service.py` (lines 198-231)

```python
async for chunk in stream:
    delta = chunk.choices[0].delta

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
```

### JSON Argument Parsing

```python
# Execute tool
try:
    arguments = json.loads(tool_info["arguments"])
    result = await self.ai_orchestrator._execute_tool(
        tool_info["name"],
        arguments
    )
```

### Filter Extraction from Natural Language

**File:** `backend/app/services/ai_orchestrator.py` (lines 365-412)

```python
async def _extract_filters(self, query: str) -> Optional[dict]:
    """Use AI to extract structured search parameters from natural language"""
    extract_messages = [
        {
            "role": "system",
            "content": """Extract search parameters from user's query. Return a JSON object with:
- keyword: main search term
- file_types: array of file extensions (e.g., ["pdf", "docx"])
- modified_after: ISO date string for minimum modification date
- modified_before: ISO date string for maximum modification date
- size_min: minimum file size in bytes
- size_max: maximum file size in bytes

Only include fields that are clearly mentioned. Return only JSON, no explanation."""
        },
        {"role": "user", "content": query}
    ]

    result = await client.chat.completions.create(
        model=self.model,
        messages=extract_messages,
        temperature=0.0  # Low temperature for consistent JSON
    )

    text = result.choices[0].message.content or ""

    # Parse JSON from response - Handle markdown code blocks
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]

    filters = json.loads(text.strip())
    return filters
```

### Response Formatting

**File:** `backend/app/services/chat_service.py` (lines 385-422)

```python
def _format_file_result(self, file_data: dict) -> dict:
    """Format file result for frontend display"""
    # Handle both dict and object formats
    if hasattr(file_data, 'file_info'):
        file_info = file_data.file_info
        return {
            "id": getattr(file_info, 'id', ''),
            "name": getattr(file_info, 'name', ''),
            "path": getattr(file_info, 'path', ''),
            "relative_path": getattr(file_info, 'relative_path', ''),
            "extension": getattr(file_info, 'extension', ''),
            "file_type": getattr(file_info, 'file_type', ''),
            "size": getattr(file_info, 'size', 0),
            "modified_time": getattr(file_info, 'modified_time', '').isoformat() if getattr(file_info, 'modified_time', '') else '',
            "device_id": getattr(file_info, 'device_id', ''),
            "device_name": file_data.get('device_name', ''),
            "match_reason": file_data.get('match_reason', ''),
        }
    else:
        # It's already a dict
        file_info = file_data.get('file_info', file_data)
        # Extract fields from dict...
```

---

## 3. Agents System

### Overview

The application uses "agent" in two distinct contexts:

1. **Device Agents** - Secondary devices that connect to a primary device
2. **AI Agent** - The AI-powered conversational agent that uses tool calling

### Device Mode Configuration

**File:** `backend/app/config.py`

```python
device_mode: str = "primary"  # "primary" or "agent"

@property
def is_primary(self) -> bool:
    """Check if this device is the primary device"""
    return self.device_mode.lower() == "primary"
```

**File:** `backend/app/models/device.py`

```python
from enum import Enum


class DeviceMode(str, Enum):
    PRIMARY = "primary"
    AGENT = "agent"


class DeviceStatus(str, Enum):
    PENDING = "pending"
    ONLINE = "online"
    OFFLINE = "offline"
    SYNCING = "syncing"
```

### AI Agent - AI Orchestrator

The `AIOrchestrator` class serves as the core AI agent:

```python
class AIOrchestrator:
    def __init__(
        self,
        file_search: FileSearchService,
        get_devices_callback,
        search_remote_callback=None,
    ):
        self.file_search = file_search
        self.get_devices = get_devices_callback
        self.search_remote = search_remote_callback

        # Configuration
        self.provider = settings.ai_provider
        self.api_key = settings.ai_api_key
        self.base_url = settings.ai_base_url
        self.model = settings.ai_model
```

### Agent Orchestration and Routing

Tool calls are routed to appropriate handlers:

```python
async def _execute_tool(self, tool_name: str, arguments: dict) -> dict:
    """Execute a tool call and return the result"""
    if tool_name == "search_local_files":
        results = self.file_search.search(
            query=arguments.get("query", ""),
            file_types=arguments.get("file_types"),
        )
        return {"results": [r.model_dump(mode='json') for r in results], "count": len(results)}

    elif tool_name == "search_all_devices":
        # Search local + remote devices
        all_results = []
        local_results = self.file_search.search(...)
        all_results.extend([r.model_dump(mode='json') for r in local_results])

        if self.search_remote:
            remote_results = await self.search_remote(...)
            all_results.extend(remote_results)
        return {"results": all_results, "count": len(all_results)}

    elif tool_name == "read_file_content":
        result = await self.file_search.read_file(...)
        return result.model_dump(mode='json')

    elif tool_name == "get_device_info":
        devices = self.get_devices()
        return {"devices": [d.model_dump(mode='json') for d in devices], "count": len(devices)}
```

### Agent Communication

Devices communicate via HTTP REST APIs:

```python
# From device.py model
class DeviceInfo(BaseModel):
    id: str
    name: str
    mode: DeviceMode
    os: str
    ip_address: str
    port: int = 8000
    url: str = ""  # Base URL for API calls
    status: DeviceStatus = DeviceStatus.OFFLINE
    last_heartbeat: datetime = None
```

**File:** `backend/app/core/device_manager.py` (lines 109-160)

```python
def register_device(self, registration: DeviceRegistration) -> DeviceInfo:
    """Register a new device"""
    device_id = registration.name.lower().replace(" ", "-")[:8]

    device = DeviceInfo(
        id=device_id,
        name=registration.name,
        mode=DeviceMode.AGENT,
        os=registration.os,
        ip_address=registration.ip_address,
        port=registration.port,
        url=f"http://{registration.ip_address}:{registration.port}",
        status=DeviceStatus.ONLINE,
    )

    self.devices[device_id] = device
    self._save_devices()
    return device


def update_heartbeat(self, heartbeat: DeviceHeartbeat) -> bool:
    """Update device heartbeat timestamp"""
    if heartbeat.device_id not in self.devices:
        return False

    self.devices[heartbeat.device_id].last_heartbeat = datetime.now()
    self.devices[heartbeat.device_id].status = DeviceStatus.ONLINE
    return True
```

### Agent State Management

#### Database State

**File:** `backend/app/models/db_models.py`

**Conversation State:**
```python
class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True)
    title = Column(String(200))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    message_count = Column(Integer, default=0)
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
```

**Message State:**
```python
class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20))  # 'user' or 'assistant'
    content = Column(Text)

    # Tool call data
    tool_calls = Column(Text)      # JSON array of tool calls
    tool_results = Column(Text)    # JSON array of tool results
    file_references = Column(Text) # JSON array of file info

    conversation = relationship("Conversation", back_populates="messages")
```

#### In-Memory State

**File:** `backend/app/api/dependencies.py`

```python
# Global instances - set by main.py during startup
_file_scanner = None
_file_search = None
_ai_orchestrator = None
_device_manager = None
_discovery_service = None
_file_transfer = None
```

#### Device State Persistence

```python
class DeviceManager:
    def __init__(self, local_device_id: str):
        self.devices: Dict[str, DeviceInfo] = {}
        self.devices_file = Path.home() / ".personal-assistant" / "devices.json"
        self._load_devices()

    def _load_devices(self):
        """Load devices from file"""
        if self.devices_file.exists():
            with open(self.devices_file, 'r') as f:
                data = json.load(f)
                for device_data in data:
                    device = DeviceInfo(**device_data)
                    device.last_heartbeat = datetime.fromisoformat(device_data['last_heartbeat'])
                    self.devices[device.id] = device

    def _save_devices(self):
        """Save devices to file"""
        data = []
        for device in self.devices.values():
            device_dict = device.model_dump(mode='json')
            device_dict['last_heartbeat'] = device.last_heartbeat.isoformat()
            data.append(device_dict)

        self.devices_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.devices_file, 'w') as f:
            json.dump(data, f, indent=2)
```

### Agent Execution Flow

**Application Startup -** `backend/app/main.py` (lines 73-124)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize database
    await init_db()

    # 2. Initialize device manager
    device_manager = DeviceManager(DEVICE_ID)
    await device_manager.start()

    # 3. Initialize file scanner
    file_scanner = FileScanner(DEVICE_ID)

    # 4. Initialize file search service
    file_search = FileSearchService(scanner=file_scanner, device_name=settings.device_name)

    # 5. Initialize AI orchestrator
    ai_orchestrator = AIOrchestrator(
        file_search=file_search,
        get_devices_callback=lambda: device_manager.get_all_devices(include_local=True),
    )

    # 6. Initialize discovery service
    discovery = DiscoveryService(
        device_id=DEVICE_ID,
        device_name=settings.device_name,
        device_mode=settings.device_mode,
        is_primary=settings.is_primary,
    )
    await discovery.start()

    # 7. Start initial file scan
    asyncio.create_task(initial_scan())

    yield  # Application runs...

    # Cleanup
    await discovery.stop()
    await device_manager.stop()
```

**Chat Request Flow:**

```
1. User sends POST /api/chat
   |
2. ChatService.chat() receives request
   |
3. Creates/loads conversation from database
   |
4. Adds user message to conversation
   |
5. Builds messages array with history + system prompt
   |
6. AGENTIC LOOP (max 5 iterations):
   |-- a. Call OpenAI-compatible API with tools
   |-- b. Stream response content to user
   |-- c. If tool calls present:
   |      |-- Execute each tool via AIOrchestrator._execute_tool()
   |      |-- Stream tool results to user
   |      |-- Add tool results to messages
   |      |-- Continue loop
   |-- d. If no tool calls, exit loop
   |
7. Save assistant message to database
   |
8. Send "done" chunk
```

### Agents Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  AIOrchestrator (AI Agent)                           │  │
│  │  - Tools Definitions                                    │  │
│  │  - Tool Execution Router                                │  │
│  │  - Multi-Provider Support                               │  │
│  └───────────────┬───────────────────────────────────────────┘  │
│                  │                                          │
│  ┌───────────────┴───────────────────────────────────────────┐  │
│  │  ChatService                                           │  │
│  │  - Agentic Loop                                       │  │
│  │  - Conversation Management                               │  │
│  └───────────────┬───────────────────────────────────────────┘  │
│                  │                                          │
│  ┌───────────────┴────────────────┐    ┌────────────────┐  │
│  │  DeviceManager                    │    │  FileSearch   │  │
│  │  - Device Registry              │    │  Service      │  │
│  │  - Heartbeat Tracking           │    │              │  │
│  └─────────────────────────────────┘    └───────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Device Agents (Remote Devices)                        │  │
│  │  - HTTP REST API Client                              │  │
│  │  - Heartbeat Sender                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Device Pairing

### Overview

Device pairing allows secondary devices (agents) to connect to a primary device. The system uses a **6-digit pairing code** with time-limited expiration for secure registration.

### Pairing Code Flow

**File:** `backend/app/api/routes/pairing.py` (lines 109-162)

```python
@router.post("", response_model=PairingResponse)
async def create_pairing(request: CreatePairingRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a new pairing session.
    Generates a 6-digit code that secondary device must use to complete pairing.
    """
    # 1. Validate device type
    valid_types = ["linux", "windows", "mobile"]
    if request.device_type.lower() not in valid_types:
        raise HTTPException(status_code=400, detail="Invalid device type")

    # 2. Generate unique pairing code
    code = PairingSession.generate_code()

    # 3. Set expiration time (15 minutes default)
    expires_at = datetime.utcnow() + timedelta(minutes=settings.pairing_expiration_minutes)

    # 4. Create session in database
    session = PairingSession(
        device_type=request.device_type.lower(),
        pairing_code=code,
        expires_at=expires_at,
        status="pending",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # 5. Generate pairing URL for frontend
    pairing_url = f"http://{frontend_url}/pair/{code}"

    return PairingResponse(
        pairing_code=code,
        pairing_url=pairing_url,
        expires_at=expires_at,
    )
```

**Code Generation -** `backend/app/models/db_models.py` (lines 227-229)

```python
@classmethod
def generate_code(cls):
    """Generate a 6-digit pairing code"""
    return ''.join(random.choices(string.digits, k=6))
```

**Configuration -** `backend/app/config.py`

```python
pairing_code_length: int = 6
pairing_expiration_minutes: int = 15
```

### Pairing Status Check (Polling)

```python
@router.get("/{code}", response_model=PairingStatusResponse)
async def get_pairing_status(code: str, db: AsyncSession = Depends(get_db)):
    """
    Get pairing session status.
    Used by frontend to poll for completion.
    """
    session = await PairingSession.get_active(db, code)
    if not session:
        raise HTTPException(status_code=404, detail="Pairing session not found or expired")

    return PairingStatusResponse(
        status=session.status,
        device_type=session.device_type,
        expires_at=session.expires_at,
    )
```

### Complete Pairing

```python
@router.post("/{code}", response_model=CompletePairingResponse)
async def complete_pairing(
    code: str,
    request: CompletePairingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Complete pairing from secondary device.
    Creates a device record linked to the pairing session.
    """
    # 1. Validate active pairing session
    session = await PairingSession.get_active(db, code)
    if not session:
        raise HTTPException(status_code=404, detail="Invalid or expired pairing code")

    if session.status != "pending":
        raise HTTPException(status_code=400, detail="Pairing already completed")

    # 2. Create device record
    device = Device(
        name=request.name,
        mode=DeviceMode.AGENT.value,
        device_type=session.device_type,
        os_type=request.os_type,
        ip_address=request.ip_address,
        port=request.port or 8000,
        status=DeviceStatus.PENDING.value,
        scan_paths=",".join(request.scan_paths),
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    # 3. Link device to pairing session
    session.device_id = device.id
    session.status = "completed"
    await db.commit()

    # 4. Register device in DeviceManager
    device_manager = deps.get_device_manager()
    device_manager.register_device(
        DeviceRegistration(
            name=device.name,
            os=device.os_type,
            ip_address=device.ip_address,
            port=device.port,
        )
    )

    # 5. Return primary server URL for future communication
    primary_url = f"http://{local_ip}:{settings.port}"

    return CompletePairingResponse(
        device_id=device.id,
        device_name=device.name,
        primary_url=primary_url,
    )
```

### Cancel Pairing

```python
@router.delete("/{code}")
async def cancel_pairing(code: str, db: AsyncSession = Depends(get_db)):
    """Cancel a pending pairing session"""
    session = await PairingSession.get_active(db, code)
    if not session:
        raise HTTPException(status_code=404, detail="Pairing session not found")

    session.status = "cancelled"
    await db.commit()

    return {"message": "Pairing cancelled"}
```

### Database Models

**File:** `backend/app/models/db_models.py`

**Device Model (lines 36-121):**
```python
class Device(Base):
    __tablename__ = "devices"

    id = Column(String(8), primary_key=True)  # UUID-based (8 chars)
    name = Column(String(100), nullable=False)
    mode = Column(String(20), default="agent")  # "primary" or "agent"
    device_type = Column(String(20))  # "linux", "windows", "mobile"
    os_type = Column(String(50))  # Detected OS
    ip_address = Column(String(50))
    port = Column(Integer, default=8000)
    status = Column(String(20), default="offline")  # "pending", "online", "offline", "syncing"
    last_heartbeat = Column(DateTime)
    scan_paths = Column(Text)  # Comma-separated paths
    created_at = Column(DateTime, default=datetime.utcnow)
```

**PairingSession Model (lines 202-275):**
```python
class PairingSession(Base):
    __tablename__ = "pairing_sessions"

    id = Column(String, primary_key=True)
    device_id = Column(String(8), ForeignKey("devices.id"), nullable=True)
    device_type = Column(String(20))  # "linux", "windows", "mobile"
    pairing_code = Column(String(10), unique=True, nullable=False)  # 6-digit code
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")  # "pending", "completed", "expired", "cancelled"
    created_at = Column(DateTime, default=datetime.utcnow)

    @classmethod
    async def get_active(cls, db: AsyncSession, code: str):
        """Get active pending pairing session by code"""
        result = await db.execute(
            select(cls).where(
                cls.pairing_code == code,
                cls.status == "pending",
                cls.expires_at > datetime.utcnow() - timedelta(seconds=30)
            )
        )
        return result.scalar_one_or_none()
```

### UDP Discovery Service

**File:** `backend/app/core/discovery.py`

**Broadcast (for primary devices):**
```python
async def start_broadcast(self):
    """Start broadcasting presence (for primary devices)"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    message = self._create_broadcast_message()

    while self._running:
        try:
            sock.sendto(message.encode(), ("<broadcast>", self.discovery_port))
            await asyncio.sleep(settings.heartbeat_interval)
        except Exception as e:
            logger.error(f"Broadcast error: {e}")


def _create_broadcast_message(self):
    """Create JSON broadcast message"""
    return json.dumps({
        "type": "discovery",
        "device_id": self.device_id,
        "device_name": self.device_name,
        "device_mode": self.device_mode,
        "url": self.url,
        "timestamp": datetime.now().isoformat()
    })
```

**Listen (for agent devices):**
```python
async def start_listening(self):
    """Start listening for discovery broadcasts (for agent devices)"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(("0.0.0.0", self.discovery_port))
    sock.setblocking(False)

    loop = asyncio.get_event_loop()

    while self._running:
        try:
            data, addr = await loop.sock_recvfrom(sock, 4096)
            message = json.loads(data.decode())

            if message.get("type") == "discovery":
                device_url = message.get("url")
                device_name = message.get("name")
                device_id = message.get("device_id")

                # Store discovered device
                self._discovered_devices[device_id] = {
                    "name": device_name,
                    "url": device_url,
                    "discovered_at": datetime.now()
                }

                logger.info(f"Discovered device: {device_name} at {device_url}")

                # Callback for UI updates
                if self.on_discovery:
                    self.on_discovery(message)
        except Exception as e:
            if self._running:
                logger.error(f"Discovery listen error: {e}")
```

### Authentication Notes

**Current Implementation:**
- **Pairing Code Only** - The only authentication during pairing is possession of the valid 6-digit code
- **No Token-Based Auth** - No JWT, OAuth, or API token exchange
- **No Encryption** - Pairing codes transmitted in plain HTTP
- **CORS Protection** - Limited to configured origins

**Configuration -** `backend/app/config.py`

```python
allowed_origins: List[str] = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
]
```

### Device Pairing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIMARY DEVICE                          │
│  ┌─────────────────┐    ┌──────────────────┐             │
│  │  FastAPI Server │    │  DeviceManager  │             │
│  │  (port 8000)   │    │                │             │
│  └────────┬────────┘    └────────┬─────────┘             │
│           │                      │                           │
│           │ POST /api/pairing    │                           │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌─────────────────┐    ┌──────────────────┐             │
│  │ PairingSession  │    │  SQLite DB     │             │
│  │ - 6-digit code │    │  - sessions     │             │
│  │ - 15 min expire│    │  - devices      │             │
│  └─────────────────┘    └──────────────────┘             │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐             │
│  │DiscoveryService │    │  UDP Broadcast  │             │
│  │ (port 8001)    │◄───┤  (Auto-find)    │             │
│  └─────────────────┘    └──────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. User opens http://primary:5173/pair/{code}
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SECONDARY DEVICE                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  POST /api/pairing/{code}                         │  │
│  │  {                                                │  │
│  │    "name": "My Laptop",                            │  │
│  │    "os_type": "Linux",                              │  │
│  │    "ip_address": "192.168.1.100",                  │  │
│  │    "port": 8000,                                    │  │
│  │    "scan_paths": ["/home/user/Documents"]              │  │
│  │  }                                                │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Device Registered as AGENT                         │  │
│  │  - Starts heartbeats to POST /api/devices/heartbeat  │  │
│  │  - Listens for discovery broadcasts                  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Local Network File Sharing

### Overview

The application uses a **client-server architecture** for local network file sharing between paired devices. Each device runs a FastAPI server accessible on the local network.

### Network Configuration

**File:** `backend/app/main.py` (lines 227-233)

```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",  # Bind to all network interfaces
        port=settings.port,    # Default: 8000
        reload=True,
    )
```

**Configuration -** `backend/app/config.py`

```python
port: int = 8000
device_name: str = "My Device"
device_mode: str = "primary"

# Discovery Configuration
discovery_port: int = 8001
heartbeat_interval: int = 30  # seconds
heartbeat_timeout: int = 120  # seconds before marking offline
```

### File Serving Endpoints

**File:** `backend/app/api/routes/files.py`

**Download File:**
```python
@router.get("/download")
async def download_file(
    path: str,
    search: FileSearchService = Depends(get_file_search)
):
    """Download a file from local storage"""
    file_path = search.get_file_path(path)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        filename=file_path.name,
        media_type="application/octet-stream"
    )
```

**Upload File:**
```python
@router.post("/upload")
async def upload_file(
    file: UploadFile,
    target_path: str = Form(...),
    search: FileSearchService = Depends(get_file_search)
):
    """Upload a file to local storage"""
    # Validate target path
    target = Path(target_path)
    if not search.is_valid_path(target):
        raise HTTPException(status_code=400, detail="Invalid target path")

    # Ensure parent directory exists
    target.parent.mkdir(parents=True, exist_ok=True)

    # Write file
    with open(target, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update file index
    await search.index_file(target)

    return {"message": "File uploaded successfully", "path": str(target)}
```

### File Transfer Service

**File:** `backend/app/services/file_transfer.py` (lines 25-225)

```python
class FileTransferService:
    def __init__(self, device_manager: DeviceManager):
        self.device_manager = device_manager

    async def copy_file(
        self,
        request: FileCopyRequest,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> FileCopyResponse:
        """
        Copy a file from source device to target device.

        If source is local, upload to remote.
        If source is remote, download to local.
        If both are remote, this server acts as intermediary.
        """
        # Determine transfer type
        if request.source_device_id == "local":
            return await self._upload_to_remote(request, progress_callback)
        elif request.target_device_id == "local":
            return await self._download_from_remote(request, progress_callback)
        else:
            # Remote to remote - transfer through this server
            return await self._remote_to_remote(request, progress_callback)
```

**Download from Remote:**
```python
async def _download_from_remote(
    self,
    request: FileCopyRequest,
    progress_callback: Optional[Callable[[float], None]] = None
) -> FileCopyResponse:
    """Download a file from a remote device"""
    source_device = self.device_manager.get_device(request.source_device_id)
    if not source_device:
        raise ValueError(f"Source device not found: {request.source_device_id}")

    source_url = source_device.url
    target_path = Path(request.target_path)

    if progress_callback:
        progress_callback(0.0)

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(
            f"{source_url}/api/files/download",
            params={"path": request.source_path},
            follow_redirects=True,
        )
        content = response.content

    # Write to local file
    target_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(target_path, "wb") as f:
        await f.write(content)

    if progress_callback:
        progress_callback(1.0)

    return FileCopyResponse(
        success=True,
        source_path=request.source_path,
        target_path=str(target_path),
        bytes_transferred=len(content),
    )
```

**Upload to Remote:**
```python
async def _upload_to_remote(
    self,
    request: FileCopyRequest,
    progress_callback: Optional[Callable[[float], None]] = None
) -> FileCopyResponse:
    """Upload a local file to a remote device"""
    source_path = Path(request.source_path)
    target_device = self.device_manager.get_device(request.target_device_id)

    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    target_url = target_device.url

    if progress_callback:
        progress_callback(0.0)

    # Read file
    async with aiofiles.open(source_path, "rb") as f:
        content = await f.read()

    # Upload to remote
    async with httpx.AsyncClient(timeout=300.0) as client:
        files = {"file": (source_path.name, content)}
        data = {
            "target_path": request.target_path,
        }

        response = await client.post(
            f"{target_url}/api/files/upload",
            files=files,
            data=data,
        )

    if progress_callback:
        progress_callback(1.0)

    return FileCopyResponse(
        success=True,
        source_path=str(source_path),
        target_path=request.target_path,
        bytes_transferred=len(content),
    )
```

**Remote-to-Remote (Intermediary):**
```python
async def _remote_to_remote(
    self,
    request: FileCopyRequest,
    progress_callback: Optional[Callable[[float], None]] = None
) -> FileCopyResponse:
    """Transfer file between two remote devices through this server"""
    # Create temp file path
    temp_path = Path(f"/tmp/transfer_{uuid.uuid4()}_{Path(request.source_path).name}")

    try:
        # First download from source to this server
        download_result = await self._download_from_remote(
            FileCopyRequest(
                source_device_id=request.source_device_id,
                source_path=request.source_path,
                target_device_id="local",
                target_path=str(temp_path),
            ),
            lambda p: progress_callback(p * 0.5) if progress_callback else None
        )

        # Then upload to target device
        upload_result = await self._upload_to_remote(
            FileCopyRequest(
                source_device_id="local",
                source_path=str(temp_path),
                target_device_id=request.target_device_id,
                target_path=request.target_path,
            ),
            lambda p: progress_callback(0.5 + p * 0.5) if progress_callback else None
        )

        return upload_result
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()
```

### File Discovery

#### Local File Indexing

**File:** `backend/app/services/file_scanner.py` (lines 120-160)

```python
async def scan_directory(self, root_path: Path, progress_callback=None) -> int:
    """Recursively scan a directory and add files to index"""
    count = 0

    for dirpath, dirnames, filenames in os.walk(root_path):
        # Filter out excluded directories
        dirnames[:] = [d for d in dirnames if not self._should_skip_dir(d)]

        for filename in filenames:
            file_path = Path(dirpath) / filename

            # Skip excluded files
            if self._should_skip_file(filename):
                continue

            # Get file metadata
            file_info = await self._get_file_metadata(file_path, root_path)

            if file_info:
                self.index.add_file(file_info)
                count += 1

                if progress_callback and count % 100 == 0:
                    progress_callback(count)

    return count
```

**File Index Model -** `backend/app/models/file.py` (lines 63-109)

```python
class FileIndex(BaseModel):
    """In-memory file index for fast searching"""
    device_id: str
    files: Dict[str, FileInfo] = {}  # path -> FileInfo
    last_updated: datetime = Field(default_factory=datetime.now)
    total_size: int = 0
    scan_roots: List[str] = []

    def add_file(self, file_info: FileInfo):
        """Add or update a file in the index"""
        self.files[file_info.path] = file_info
        self.total_size += file_info.size

    def get_file(self, path: str) -> Optional[FileInfo]:
        """Get a file by path"""
        return self.files.get(path)

    def remove_file(self, path: str):
        """Remove a file from the index"""
        if path in self.files:
            self.total_size -= self.files[path].size
            del self.files[path]
```

#### Heartbeat System

**File:** `backend/app/core/device_manager.py` (lines 188-206)

```python
async def check_device_health(self):
    """Check health of all devices and mark offline ones"""
    now = datetime.now()
    timeout = timedelta(seconds=settings.heartbeat_timeout)

    offline_devices = []

    for device_id, device in self.devices.items():
        if device_id == "local":
            continue

        if device.last_heartbeat:
            age = now - device.last_heartbeat.replace(tzinfo=None)
            if age > timeout:
                device.status = DeviceStatus.OFFLINE
                offline_devices.append(device_id)
                logger.warning(f"Device {device.name} went offline")

    return offline_devices
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              LOCAL NETWORK                               │
│                                                                        │
│  ┌──────────────────────────┐         ┌──────────────────────────┐      │
│  │   PRIMARY DEVICE         │         │   AGENT DEVICE          │      │
│  │                         │         │                         │      │
│  │  ┌────────────────────┐ │  HTTP   │  ┌────────────────────┐ │      │
│  │  │  FastAPI Server   │◄────────┼─►│  FastAPI Server   │ │      │
│  │  │  0.0.0.0:8000   │ │         │  │  0.0.0.0:8000   │ │      │
│  │  └────────┬─────────┘ │         │  └────────┬─────────┘ │      │
│  │           │             │         │           │             │      │
│  │  ┌────────┴─────────┐ │         │  ┌────────┴─────────┐ │      │
│  │  │  FileScanner     │ │         │  │  FileScanner     │ │      │
│  │  │  (Local Index)   │ │         │  │  (Local Index)   │ │      │
│  │  └────────┬─────────┘ │         │  └────────┬─────────┘ │      │
│  │           │             │         │           │             │      │
│  │  ┌────────┴─────────┐ │         │  ┌────────┴─────────┐ │      │
│  │  │  File System     │ │         │  │  File System     │ │      │
│  │  │  ~/Documents     │ │         │  │  ~/Documents     │ │      │
│  │  └─────────────────┘ │         │  └─────────────────┘ │      │
│  │                         │         │                         │      │
│  │  ┌────────────────────┐ │  UDP    │  ┌────────────────────┐ │      │
│  │  │DiscoveryService   │◄────────┼─►│DiscoveryService   │ │      │
│  │  │ port 8001        │ │Broadcast│  │ port 8001        │ │      │
│  │  └────────────────────┘ │         │  └────────────────────┘ │      │
│  └──────────────────────────┘         └──────────────────────────┘      │
│                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
1. UDP Broadcast (port 8001): Device discovery
2. HTTP REST API (port 8000): File operations, heartbeats
3. Local File Index: In-memory dictionary for fast searching
4. Heartbeat Polling: Device health monitoring
```

### Key Files Summary

| Component | File Path |
|-----------|-----------|
| AI Orchestrator | `backend/app/services/ai_orchestrator.py` |
| Chat Service | `backend/app/services/chat_service.py` |
| Device Manager | `backend/app/core/device_manager.py` |
| Discovery Service | `backend/app/core/discovery.py` |
| File Transfer | `backend/app/services/file_transfer.py` |
| File Scanner | `backend/app/services/file_scanner.py` |
| File Search | `backend/app/services/file_search.py` |
| Pairing Routes | `backend/app/api/routes/pairing.py` |
| Chat Routes | `backend/app/api/routes/chat.py` |
| File Routes | `backend/app/api/routes/files.py` |
| Device Routes | `backend/app/api/routes/devices.py` |
| Database Models | `backend/app/models/db_models.py` |
| Chat Models | `backend/app/models/chat.py` |
| Search Models | `backend/app/models/search.py` |
| File Models | `backend/app/models/file.py` |
| Device Models | `backend/app/models/device.py` |
| Configuration | `backend/app/config.py` |
| Main Application | `backend/app/main.py` |

---

## Summary

This Personal Assistant application implements a sophisticated multi-device file search system with AI capabilities:

1. **AI Tools** - Uses OpenAI-compatible function calling with 5 tools for file operations
2. **Structured Output** - JSON schemas for tool parameters, Pydantic models for validation
3. **Agents** - Two types: Device Agents (secondary devices) and AI Agent (orchestrator)
4. **Device Pairing** - 6-digit code system with UDP discovery, SQLite persistence
5. **Local Network Sharing** - Client-server model with HTTP transfers, in-memory indexing

The system is built on FastAPI with SQLite for persistence and supports multiple AI providers (OpenAI, Anthropic, GLM, Custom).
