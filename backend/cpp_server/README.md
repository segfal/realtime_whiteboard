# C++ WebSocket Server

High-performance C++ WebSocket server for the realtime whiteboard application using [uWebSockets](https://github.com/uNetworking/uWebSockets).

## Features

- Real-time stroke broadcasting
- Chat message handling
- Client synchronization on connection
- High-performance WebSocket implementation
- JSON message processing

## Prerequisites

- C++20 compatible compiler (Clang/GCC)
- CMake 3.15+
- Git

**macOS:**
```bash
brew install cmake zlib
```

## Dependencies

The server uses two external libraries that need to be cloned into the `vendor/` directory:

- [uWebSockets](https://github.com/uNetworking/uWebSockets) - WebSocket library
- [nlohmann/json](https://github.com/nlohmann/json) - JSON handling

## Build Instructions

### 1. Clone Dependencies

```bash
cd backend/cpp_server

# Create vendor directory
mkdir -p vendor

# Clone uWebSockets (includes uSockets submodule)
git clone --recursive https://github.com/uNetworking/uWebSockets.git vendor/uWebSockets

# Clone JSON library
git clone https://github.com/nlohmann/json.git vendor/json
```

### 2. Build

```bash
# Create build directory
mkdir -p build && cd build

# Configure with CMake
cmake -S .. -B .

# Build
make

# The executable will be: ./server
```

### 3. Run

```bash
./server
```

The server will listen on `ws://localhost:9000`

## Message Format

The server handles JSON messages with the following format:

### Stroke Message
```json
{
  "type": "stroke:add",
  "payload": {
    "stroke": {
      "points": [{"x": 100, "y": 200}],
      "color": "rgb(255,0,0)",
      "width": 2
    }
  }
}
```

### Chat Message
```json
{
  "type": "chat:message",
  "payload": {
    "user": "User1",
    "message": "Hello!",
    "timestamp": "2025-01-20T10:30:00Z"
  }
}
```

## Architecture

- **uSockets**: Low-level C networking library
- **uWebSockets**: High-level C++ WebSocket API
- **nlohmann/json**: Modern C++ JSON library
- **In-memory storage**: Current implementation stores all data in memory

## Performance

uWebSockets is battle-tested and powers major cryptocurrency exchanges, handling massive real-time message volumes with excellent performance characteristics.

## Development Notes

This server is designed to replace the Node.js server for better performance and to enable future C++ desktop application development with shared codebase. 