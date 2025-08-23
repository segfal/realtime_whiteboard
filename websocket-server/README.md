# WebSocket Server

High-performance C++ WebSocket server for realtime whiteboard collaboration.

## Overview

This server handles real-time communication between whiteboard clients:
- **Stroke Broadcasting**: Real-time stroke data sharing
- **Chat Messages**: User chat functionality
- **Client Synchronization**: State sync on connection
- **High Performance**: Built with uWebSockets

## Quick Start

### Docker (Recommended)
```bash
# Build and run with Docker Compose
docker-compose up --build

# Or run standalone
docker build -t websocket-server .
docker run -p 9000:9000 websocket-server
```

### Local Development
```bash
# Clone dependencies
mkdir -p vendor
git clone --recursive https://github.com/uNetworking/uWebSockets.git vendor/uWebSockets
git clone https://github.com/nlohmann/json.git vendor/json

# Build
mkdir -p build && cd build
cmake ..
make

# Run
./server
```

## Configuration

### Environment Variables
- `WS_PORT`: WebSocket port (default: 9000)
- `WS_HOST`: Bind address (default: 0.0.0.0)
- `DEBUG`: Debug mode (default: false)

### Docker Environment
```yaml
environment:
  - WS_PORT=9000
  - WS_HOST=0.0.0.0
  - DEBUG=false
```

## Message Protocol

The server handles JSON messages with the following types:

### Stroke Messages
- `stroke:start`: Start new stroke
- `stroke:point`: Add point to stroke
- `stroke:finish`: Finish stroke
- `stroke:add`: Add complete stroke (legacy)

### Chat Messages
- `chat:message`: Send chat message

### User Management
- `user:join`: User joins room
- `user:leave`: User leaves room

### Synchronization
- `sync:request`: Request current state
- `sync:response`: Current state response

## Architecture

- **uSockets**: Low-level C networking
- **uWebSockets**: High-level C++ WebSocket API
- **nlohmann/json**: Modern C++ JSON library
- **In-memory storage**: Current implementation

## Performance

uWebSockets is battle-tested and powers major applications:
- Excellent performance characteristics
- Low memory footprint
- High connection handling capacity

## Development

### Adding New Message Types
1. Update message handling in `src/main.cpp`
2. Add message type to shared protocols
3. Update frontend to handle new messages

### Testing
```bash
# Run server tests
./test_server.sh

# Test with WebSocket client
wscat -c ws://localhost:9000
```

## Docker

### Build Image
```bash
docker build -t websocket-server .
```

### Run Container
```bash
docker run -p 9000:9000 websocket-server
```

### Development with Volumes
```bash
docker run -p 9000:9000 -v $(pwd)/src:/app/src:ro websocket-server
```

## Integration

The server integrates with:
- **Frontend**: React/TypeScript client
- **Shared Protocols**: Common message definitions
- **Docker Compose**: Local development environment
