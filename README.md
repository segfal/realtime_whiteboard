# Installation Guide

## Installation for client.
- cd client
- pnpm install
- pnpm run dev



## Tech Stack and Installed Libraries

- React (using Vite with SWC for fast builds)
- pnpm as the package manager

### UI / Drawing
- react-colorful – lightweight color picker component
- zustand – simple global state management
- pixi.js – WebGL-based 2D renderer (optional fallback)

### Realtime Collaboration (planned)
- yjs – CRDT-based shared state
- y-websocket – WebSocket connector for Yjs

### Math & Graphics
- gl-matrix – vector and matrix math for WebGL/WebGPU

### Future Additions
- C++ drawing engine compiled to WebAssembly (using Emscripten)
- WebGL and WebGPU rendering support