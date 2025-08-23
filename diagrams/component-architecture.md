# Component Architecture Diagram

This diagram shows the communication flow between all components of the realtime whiteboard system.

## System Overview

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│                 │◄──────────────►│                 │
│   Frontend      │    (Port 9000)  │ WebSocket Server│
│   (React/TS)    │                 │   (C++/Docker)  │
│                 │                 │                 │
└─────────────────┘                 └─────────────────┘
         │                                   │
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│                 │                 │                 │
│   Backend       │                 │   Shared        │
│   (WASM/WebGPU) │                 │   (Types/Proto) │
│                 │                 │                 │
└─────────────────┘                 └─────────────────┘
```

## Detailed Component Communication

### 1. Frontend ↔ WebSocket Server
**Protocol**: WebSocket (ws://localhost:9000)

**Frontend → Server**:
- `stroke:start` - Begin new stroke
- `stroke:point` - Add point to stroke
- `stroke:finish` - Complete stroke
- `chat:message` - Send chat message
- `user:join` - User joins room
- `sync:request` - Request current state

**Server → Frontend**:
- `stroke:add` - Broadcast stroke to all clients
- `stroke:remove` - Remove stroke
- `stroke:move` - Move stroke
- `chat:message` - Broadcast chat message
- `user:leave` - User left room
- `sync:response` - Current state data

### 2. Frontend ↔ Backend (WASM)
**Protocol**: Direct WASM calls

**Frontend → Backend**:
- `addStroke()` - Add stroke to drawing engine
- `addPointToStroke()` - Add point to existing stroke
- `removeStroke()` - Remove stroke
- `clear()` - Clear all strokes
- `getStrokes()` - Get all strokes
- `addShape()` - Add geometric shapes

**Backend → Frontend**:
- Vertex buffer data for rendering
- Stroke data for display
- Error messages

### 3. Shared Types & Protocols
**Location**: `shared/` directory

**Components**:
- `types/websocket.ts` - TypeScript type definitions
- `protocols/websocket.json` - Message protocol schema

**Used By**:
- Frontend: Type safety for WebSocket messages
- Server: Message validation and handling
- Backend: Data structure consistency

## Data Flow

### Stroke Creation Flow
```
1. User draws on Frontend
   ↓
2. Frontend calls Backend (WASM) for local rendering
   ↓
3. Frontend sends stroke data to Server via WebSocket
   ↓
4. Server broadcasts to all connected Frontend clients
   ↓
5. Other Frontend clients receive and render stroke
```

### Chat Message Flow
```
1. User types chat message in Frontend
   ↓
2. Frontend sends `chat:message` to Server
   ↓
3. Server broadcasts to all connected clients
   ↓
4. All Frontend clients display chat message
```

### Synchronization Flow
```
1. New client connects to Server
   ↓
2. Frontend sends `sync:request` to Server
   ↓
3. Server sends `sync:response` with current state
   ↓
4. Frontend renders all existing strokes
```

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Rendering**: HTML5 Canvas + WebGPU
- **Communication**: WebSocket client
- **Build**: Vite + npm

### WebSocket Server
- **Language**: C++20
- **WebSocket**: uWebSockets
- **JSON**: nlohmann/json
- **Container**: Docker
- **Port**: 9000

### Backend (Drawing Engine)
- **Language**: C++ (compiled to WASM)
- **Compiler**: Emscripten
- **Graphics**: WebGPU
- **Math**: GLM
- **Output**: WebAssembly module

### Shared
- **Types**: TypeScript interfaces
- **Protocols**: JSON schema
- **Versioning**: Semantic versioning

## Deployment Architecture

### Development
```
┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │
│   Frontend      │    │ WebSocket Server│
│   (npm run dev) │    │   (Docker)      │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
```

### Production (Future)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Frontend      │    │ Load Balancer   │    │ WebSocket Server│
│   (Static Host) │    │   (Nginx)       │    │   (Docker)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Security Considerations

### WebSocket Security
- **Authentication**: Future implementation needed
- **Authorization**: Room-based access control
- **Rate Limiting**: Prevent spam messages
- **Input Validation**: Validate all incoming messages

### Data Validation
- **Frontend**: TypeScript type checking
- **Server**: C++ validation logic
- **Shared**: Protocol schema validation

## Performance Characteristics

### WebSocket Server
- **Connections**: 1000+ concurrent users
- **Messages**: 1000+ messages/second
- **Latency**: <10ms message processing

### WASM Backend
- **Rendering**: 60 FPS stroke rendering
- **Memory**: Efficient memory management
- **GPU**: WebGPU acceleration when available

### Frontend
- **Responsiveness**: Real-time drawing feedback
- **Memory**: Efficient canvas rendering
- **Network**: Minimal WebSocket overhead

## Monitoring & Observability

### Metrics to Track
- **WebSocket**: Connection count, message rate, latency
- **WASM**: Rendering performance, memory usage
- **Frontend**: User interactions, error rates

### Health Checks
- **Server**: WebSocket endpoint availability
- **Frontend**: WASM module loading
- **Overall**: End-to-end functionality

## Future Enhancements

### Scalability
- **Horizontal Scaling**: Multiple server instances
- **Load Balancing**: Distribute WebSocket connections
- **Database**: Persistent stroke storage

### Features
- **Authentication**: User login system
- **Rooms**: Multiple drawing rooms
- **History**: Stroke undo/redo
- **Export**: Image/SVG export

### Performance
- **CDN**: Static asset delivery
- **Caching**: Stroke data caching
- **Optimization**: WASM performance tuning
