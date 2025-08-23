# Drawing Engine Backend

WASM/WebGPU-based drawing engine for the realtime whiteboard application.

## Overview

This backend provides the core drawing functionality through:
- **C++ Drawing Engine**: Compiled to WebAssembly for high performance
- **WebGPU Integration**: GPU-accelerated rendering
- **Real-time Processing**: Efficient stroke and shape handling

## Structure

```
backend/
├── src/                    # C++ source code
│   ├── implement/          # Drawing engine implementation
│   ├── main.cpp           # Main entry point
│   └── bindings.cpp       # WASM bindings
├── build/                 # Build outputs
├── emsdk/                 # Emscripten SDK
├── glm/                   # Mathematics library
├── gpuweb/                # WebGPU bindings
├── includes/              # Header files
└── scripts/               # Build scripts
```

## Quick Start

### Build WASM
```bash
cd backend
./scripts/build_wasm.sh
```

### Build Native (for testing)
```bash
cd backend
./scripts/build_native.sh
```

### Run Tests
```bash
cd backend
./scripts/test_simple.sh
```

## Build Scripts

- `build_wasm.sh`: Compile C++ to WebAssembly
- `build_native.sh`: Compile native binary for testing
- `build_simple.sh`: Simple build for development
- `test_simple.sh`: Run basic tests

## Integration

The WASM output is used by the frontend:
- `drawing_engine.wasm`: Compiled WebAssembly module
- `drawing_engine.js`: JavaScript bindings

## Dependencies

- **Emscripten**: C++ to WebAssembly compiler
- **GLM**: Mathematics library
- **WebGPU**: GPU acceleration (when available)

## Development

### Adding New Shapes
1. Add shape implementation in `src/implement/`
2. Update bindings in `src/bindings.cpp`
3. Rebuild WASM: `./scripts/build_wasm.sh`
4. Update frontend to use new shape

### Performance Optimization
- Use WebGPU for GPU acceleration
- Optimize WASM memory usage
- Profile with browser dev tools

## Architecture

The drawing engine is designed for:
- **High Performance**: WebAssembly + WebGPU
- **Real-time Collaboration**: Efficient stroke processing
- **Extensibility**: Easy to add new shapes and tools
- **Cross-platform**: Works in any WebAssembly-enabled browser
