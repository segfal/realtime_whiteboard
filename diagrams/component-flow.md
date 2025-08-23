# Component Communication Flow

## Simple Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        REALTIME WHITEBOARD                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    WebSocket    ┌─────────────────┐        │
│  │                 │◄──────────────►│                 │        │
│  │   FRONTEND      │    (Port 9000)  │ WEBSOCKET       │        │
│  │   React/TS      │                 │ SERVER          │        │
│  │   + Canvas      │                 │ C++/Docker      │        │
│  │   + WebGPU      │                 │ + uWebSockets   │        │
│  │                 │                 │                 │        │
│  └─────────────────┘                 └─────────────────┘        │
│           │                                   │                  │
│           │                                   │                  │
│           ▼                                   ▼                  │
│  ┌─────────────────┐                 ┌─────────────────┐        │
│  │                 │                 │                 │        │
│  │   BACKEND       │                 │   SHARED        │        │
│  │   WASM/WebGPU   │                 │   Types/Proto   │        │
│  │   + Drawing     │                 │   + Protocols   │        │
│  │   + Rendering   │                 │                 │        │
│  │                 │                 │                 │        │
│  └─────────────────┘                 └─────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Communication Patterns

### 1. Real-time Drawing Flow
```
User Action → Frontend → WASM Backend → Local Render
     ↓
Frontend → WebSocket Server → All Other Clients
     ↓
Other Clients → WASM Backend → Local Render
```

### 2. Chat Message Flow
```
User Types → Frontend → WebSocket Server → All Clients
```

### 3. State Synchronization Flow
```
New Client → WebSocket Server → Current State → Frontend → WASM Backend
```

## Key Interactions

### Frontend ↔ WebSocket Server
- **Bidirectional**: Real-time messaging
- **Protocol**: WebSocket (ws://localhost:9000)
- **Messages**: Strokes, chat, user events

### Frontend ↔ WASM Backend
- **Direction**: Frontend → WASM
- **Protocol**: Direct WASM calls
- **Purpose**: Local rendering and processing

### Shared Types
- **Used by**: All components
- **Purpose**: Type safety and consistency
- **Location**: `shared/types/` and `shared/protocols/`

## Data Flow Examples

### Drawing a Stroke
1. **User**: Moves mouse on canvas
2. **Frontend**: Captures mouse events
3. **WASM**: Processes stroke data locally
4. **Canvas**: Renders stroke immediately
5. **WebSocket**: Sends stroke to server
6. **Server**: Broadcasts to all clients
7. **Other Clients**: Receive and render stroke

### Sending Chat
1. **User**: Types message and hits enter
2. **Frontend**: Validates and formats message
3. **WebSocket**: Sends to server
4. **Server**: Broadcasts to all clients
5. **All Clients**: Display chat message

### Joining Room
1. **User**: Opens application
2. **Frontend**: Connects to WebSocket
3. **Server**: Accepts connection
4. **Frontend**: Requests current state
5. **Server**: Sends all strokes and users
6. **Frontend**: Renders complete whiteboard

## Technology Stack Summary

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript | User interface and interaction |
| Canvas | HTML5 + WebGPU | Drawing surface |
| WebSocket Server | C++ + uWebSockets | Real-time communication |
| WASM Backend | C++ + Emscripten | Drawing engine |
| Shared | TypeScript + JSON | Type definitions and protocols |

## Deployment Architecture

### Development
```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │ WebSocket Server│
│   (npm run dev) │    │   (Docker)      │
│   Port: 3000    │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘
```

### Production (Future)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │ Load Balancer   │    │ WebSocket Server│
│   (Static)      │    │   (Nginx)       │    │   (Docker)      │
│   CDN           │    │   Port: 80/443  │    │   Port: 9000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```
