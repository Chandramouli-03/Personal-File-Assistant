Cross-Device File Search - 2-Day Product Plan
Context
Build a polished product that lets you search files across multiple devices (Windows, Linux, Android) on the same network using AI. Users can open a browser, easily register devices, and search with natural language queries.

Key Design Decisions:

Easy device registration via browser UI (no manual port/IP configuration)
React frontend with modern UI
FastAPI backend with auto-discovery
Skip iOS/Mac for now (Windows + Linux + Android)
Build for quality, not rushed MVP
Architecture Overview
┌─────────────────────────────────────────────────────────────────┐
│                         Browser UI (React)                       │
│  - Device registration with QR code / one-click                  │
│  - Natural language search input                                 │
│  - File results with preview                                     │
│  - File copy/download                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Primary Device Server                         │
│  (FastAPI - runs on one main device)                             │
│  ├── Device discovery (UDP broadcast)                            │
│  ├── Device registration management                              │
│  ├── AI search orchestration (GLM API)                           │
│  ├── File aggregation from all devices                          │
│  └── Web UI serving                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                    UDP Broadcast / HTTP
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Agent Device │     │  Agent Device │     │  Agent Device │
│  (FastAPI)    │     │  (FastAPI)    │     │  (FastAPI)    │
│               │     │               │     │               │
│ - File index  │     │ - File index  │     │ - File index  │
│ - Search API  │     │ - Search API  │     │ - Search API  │
│ - File read   │     │ - File read   │     │ - File read   │
└───────────────┘     └───────────────┘     └───────────────┘
Project Structure
personal-assistant/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── config.py               # Configuration management
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── devices.py      # Device registration endpoints
│   │   │   │   ├── search.py       # Search endpoints
│   │   │   │   └── files.py        # File read/copy endpoints
│   │   │   └── dependencies.py     # FastAPI dependencies
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── discovery.py        # UDP broadcast discovery
│   │   │   ├── device_manager.py   # Device registration & heartbeat
│   │   │   └── security.py         # Simple auth for devices
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── file_scanner.py     # File system indexing
│   │   │   ├── file_search.py      # Local file search
│   │   │   ├── ai_orchestrator.py  # GLM API + tool calling
│   │   │   └── file_transfer.py    # File copy between devices
│   │   │
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── device.py           # Device data models
│   │       ├── file.py             # File info models
│   │       └── search.py           # Search request/response
│   │
│   └── scripts/
│       ├── start_primary.py        # Start as primary device
│       └── start_agent.py          # Start as agent device
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── DeviceRegistration.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FileResults.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   ├── DeviceStatus.tsx
│   │   │   └── TransferProgress.tsx
│   │   ├── hooks/
│   │   │   ├── useDevices.ts
│   │   │   ├── useSearch.ts
│   │   │   └── useWebSocket.ts
│   │   ├── services/
│   │   │   └── api.ts              # Backend API client
│   │   └── types/
│   │       └── index.ts            # TypeScript types
│   └── ...
│
├── config.example.json
└── README.md
Easy Device Registration Flow
Option 1: QR Code Scan (Easiest for Mobile)
1. Primary device shows QR code in browser
2. Other devices scan QR code → auto-configure and connect
3. Confirmation shows in UI
Option 2: One-Click Registration
1. User opens http://device-ip:8000/register on device browser
2. Shows "Join [Primary Device Name] as Agent" button
3. Click → registered automatically
Option 3: Code Pairing
1. Primary device shows 6-digit code
2. Enter code on agent device
3. Connected
Recommend: Implement Option 1 (QR) + Option 2 (One-Click)

Day 1: Backend Core (6-8 hours)
Phase 1: Project Setup (1 hour)
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn httpx aiofiles pydantic pydantic-settings

# Frontend
cd frontend
npm create vite@latest . -- --template react-ts
npm install
Phase 2: Core Models & Config (1 hour)
Files:

app/models/device.py - Device registration model
app/models/file.py - File metadata model
app/models/search.py - Search request/response
app/config.py - Settings with pydantic-settings
Phase 3: File Scanner & Indexer (1.5 hours)
File: app/services/file_scanner.py

Features:

Async recursive directory walking
File metadata extraction (name, size, type, modified, preview)
Configurable scan paths
File type filtering
In-memory index (consider database for v2)
Phase 4: Device Discovery (1.5 hours)
File: app/core/discovery.py

Implementation:

UDP broadcast on port 8001 for device discovery
Primary device broadcasts "I'm here" every 30 seconds
Agent devices listen and can register
Automatic device detection when on same network
Phase 5: Device Manager (1 hour)
File: app/core/device_manager.py

Features:

Device registration with unique ID
Heartbeat monitoring (remove dead devices after 2 min)
Device capability reporting (OS, available space)
Persistent device list (JSON file)
Phase 6: API Routes (1.5 hours)
Files:

app/api/routes/devices.py - Registration, list, remove
app/api/routes/search.py - Search endpoint
app/api/routes/files.py - Read, copy, download
Phase 7: AI Service (1 hour)
File: app/services/ai_orchestrator.py

GLM API Integration:

Tool definitions for search, read, copy
Broadcast search to all devices
Aggregate and rank results
Handle context limits
Day 2: Frontend & Integration (6-8 hours)
Phase 1: React Setup & Types (1 hour)
Configure Vite + React + TypeScript
Define TypeScript types matching backend models
Setup API client with axios/fetch
Phase 2: Device Registration Flow (2 hours)
Component: components/DeviceRegistration.tsx

Features:

Show current device mode (Primary/Agent)
QR code generation (use qrcode.react)
One-click registration button
Device list with status indicators
Remove device button
Phase 3: Search UI (2 hours)
Components:

SearchBar.tsx - Natural language input with suggestions
FileResults.tsx - Results grid/list with file info
FilePreview.tsx - Modal to preview file content
Phase 4: Device Status & Management (1 hour)
Component: DeviceStatus.tsx

Features:

Show all connected devices
Online/offline status (heartbeat)
Device info (OS, storage, file count)
Last sync time
Phase 5: File Transfer (1.5 hours)
Component: TransferProgress.tsx

Features:

Copy file from device A to device B
Progress bar for large files
Cancel transfer option
Transfer history
Phase 6: Polish & Integration (1.5 hours)
WebSocket for real-time updates
Error handling and retry logic
Loading states and animations
Responsive design
GLM API Integration Details
Tool Definitions
tools = [
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
                        "description": "Natural language search query"
                    },
                    "file_types": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional file type filters (pdf, docx, jpg, etc.)"
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
            "description": "Read the content of a specific file",
            "parameters": {
                "type": "object",
                "properties": {
                    "device_id": {"type": "string"},
                    "file_path": {"type": "string"},
                    "max_chars": {
                        "type": "integer",
                        "description": "Max characters to return (default 10000)"
                    }
                },
                "required": ["device_id", "file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "copy_file_to_device",
            "description": "Copy a file from one device to another",
            "parameters": {
                "type": "object",
                "properties": {
                    "source_device_id": {"type": "string"},
                    "source_path": {"type": "string"},
                    "target_device_id": {"type": "string"},
                    "target_path": {"type": "string"}
                },
                "required": ["source_device_id", "source_path", "target_device_id"]
            }
        }
    }
]
Environment Variables
# .env.example
GLM_API_KEY=your_glm_api_key_here
GLM_API_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
GLM_MODEL=glm-4-flash

# Server settings
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File scan settings
SCAN_PATHS=~/Documents,~/Downloads,~/Desktop
MAX_INDEX_SIZE=100000
EXCLUDE_DIRS=.git,node_modules,__pycache__,.venv
Device Registration Implementation
UDP Discovery
# Primary device broadcasts every 30 seconds
import socket
import json

def broadcast_presence(device_name: str, port: int = 8000):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    message = json.dumps({
        "type": "discovery",
        "name": device_name,
        "url": f"http://{get_local_ip()}:{port}"
    })
    while True:
        sock.sendto(message.encode(), ('<broadcast>', 8001))
        time.sleep(30)

# Agent device listens and can register
def listen_for_discovery():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind(('0.0.0.0', 8001))
    while True:
        data, addr = sock.recvfrom(1024)
        device = json.loads(data.decode())
        # Show in UI for one-click registration
QR Code Registration (Frontend)
import { QRCodeSVG } from 'qrcode.react';

function DeviceRegistration() {
  const registrationUrl = `${API_URL}/register?token=${deviceToken}`;

  return (
    <div className="registration">
      <h2>Scan to Connect Device</h2>
      <QRCodeSVG value={registrationUrl} size={256} />
      <p>Or open on device: <a href={registrationUrl}>{registrationUrl}</a></p>
    </div>
  );
}
Android Support (Termux + Python)
For Android devices, use Termux:

# Install Termux from F-Droid (not Play Store for full features)

# In Termux:
pkg update && pkg upgrade
pkg install python python-pip

# Clone and run
git clone <your-repo>
cd personal-assistant/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run as agent
python scripts/start_agent.py --primary <primary-ip>:8000
Create Android wrapper script for easier launch.

Verification & Testing
Test Scenario 1: Desktop + Desktop
Start primary on Windows
Start agent on Linux
Open browser, verify both devices show
Search for files on both
Copy file from Windows to Linux
Test Scenario 2: Desktop + Android
Start primary on Windows
Run agent via Termux on Android
Scan QR code in Android browser
Verify Android files appear in search
Copy file from Android to Windows
Test Scenario 3: Multi-device Search
Connect 3+ devices
Search: "find my resume pdf"
Verify results from all devices
Verify AI ranks results appropriately
Success Criteria
Day 1 Complete:
✅ FastAPI server runs on primary mode
✅ FastAPI server runs on agent mode
✅ UDP device discovery working
✅ File scanning and indexing working
✅ GLM API integration with tool calling
✅ All API endpoints functional
Day 2 Complete:
✅ React UI renders correctly
✅ Device registration via QR code works
✅ Device registration via one-click works
✅ Search returns results from all devices
✅ File preview working
✅ File copy between devices working
✅ Real-time device status updates
Files to Create Summary
Backend (Day 1):
File	Purpose
requirements.txt	Dependencies
.env.example	Environment template
app/main.py	FastAPI app entry
app/config.py	Configuration
app/models/device.py	Device models
app/models/file.py	File models
app/models/search.py	Search models
app/core/discovery.py	UDP discovery
app/core/device_manager.py	Device management
app/services/file_scanner.py	File scanning
app/services/file_search.py	Local search
app/services/ai_orchestrator.py	GLM API + tools
app/services/file_transfer.py	File copying
app/api/routes/devices.py	Device endpoints
app/api/routes/search.py	Search endpoints
app/api/routes/files.py	File endpoints
scripts/start_primary.py	Start primary
scripts/start_agent.py	Start agent
Frontend (Day 2):
File	Purpose
package.json	Dependencies
src/main.tsx	React entry
src/App.tsx	Main app
src/types/index.ts	TypeScript types
src/services/api.ts	API client
src/components/DeviceRegistration.tsx	Registration UI
src/components/SearchBar.tsx	Search input
src/components/FileResults.tsx	Results display
src/components/FilePreview.tsx	File preview
src/components/DeviceStatus.tsx	Device list
src/components/TransferProgress.tsx	Copy progress
src/hooks/useDevices.ts	Device hook
src/hooks/useSearch.ts	Search hook
src/hooks/useWebSocket.ts	WebSocket hook
Next Steps After Approval
Create project structure
Set up backend with FastAPI
Implement core services
Set up React frontend
Connect frontend to backend
Test end-to-end flow