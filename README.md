# 🎨 Real-time Collaborative Whiteboard

A modern, real-time collaborative whiteboard built with React, TypeScript, WebAssembly, and Go.

## ✨ Features

- **Real-time Collaboration** - Draw simultaneously with multiple users
- **High Performance** - WebAssembly-powered drawing engine
- **Modern UI** - Clean, responsive React interface
- **Simple Architecture** - Easy to understand and extend

## 🏗️ Architecture

```
Frontend (React + TypeScript + WebAssembly)
├── Real-time Drawing - Collaborative stroke synchronization
├── WebAssembly Engine - High-performance graphics processing
├── Modern UI - Clean, responsive interface
└── Tool System - Brush, eraser, and shape tools

Backend (Go + WebSocket)
├── Simple WebSocket Server - Real-time communication
├── Last-write-wins Conflict Resolution - Simple and effective
├── In-memory Storage - Fast and lightweight
└── Health Monitoring - Server status and diagnostics
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Go 1.21+
- Modern browser with WebAssembly support

### Development Setup

1. **Start the Go WebSocket Server**
   ```bash
   cd go-server
   go run main.go
   ```
   Server will start on `ws://localhost:8080/ws`

2. **Start the Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend will start on `http://localhost:5173`

3. **Test Collaboration**
   - Open `http://localhost:5173` in multiple browser windows
   - Start drawing in one window
   - See strokes appear in real-time in other windows

## 📁 Project Structure

```
realtime_whiteboard/
├── frontend/           # React + TypeScript frontend
│   ├── src/           # Source code
│   ├── public/        # Static assets
│   └── dist/          # Build output
├── go-server/         # Go WebSocket server
│   └── main.go        # Simple, single-file server
├── backend/           # WebAssembly drawing engine
│   ├── src/           # C++ source code
│   └── build/         # WASM build outputs
├── docs/              # Project documentation
└── shared/            # Shared types and protocols
```

## 🎯 Current Status

### ✅ Phase 1 Complete - Emergency Simplification
- **Simplified Go server** (210 lines vs 670 lines)
- **Real-time drawing collaboration** working
- **Chat functionality** working
- **No external dependencies** (Redis, PostgreSQL removed)
- **Clean, maintainable codebase**

### 🚧 Phase 2 - State Management Cleanup (Next)
- Break down large React components
- Simplify frontend state management
- Remove Redux complexity
- Improve code maintainability

## 🔧 Technical Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Go 1.21+, WebSocket
- **Graphics**: WebAssembly (C++), WebGPU
- **Real-time**: WebSocket with last-write-wins conflict resolution
- **Build**: Vite, Emscripten

## 📊 Performance

- **Real-time Updates**: Strokes appear as users draw
- **Concurrent Users**: Tested with multiple simultaneous users
- **WebSocket Latency**: <50ms typical
- **Memory Usage**: Optimized for large canvases

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with multiple browser windows
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Create a GitHub issue
- **Documentation**: Check the `docs/` folder
- **Architecture**: See `docs/000_ARCHITECTURE_OVERVIEW.md`

---

**Built with ❤️ for real-time collaboration**
