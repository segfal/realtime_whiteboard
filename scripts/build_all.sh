#!/bin/bash

# Build all components of the realtime whiteboard

set -e

echo "🔨 Building all components..."

# Build C++ server
echo "🚀 Building WebSocket server..."
cd websocket-server
mkdir -p build && cd build
cmake ..
make -j$(nproc)
cd ../..

# Build WASM backend
echo "🎨 Building WASM drawing engine..."
cd backend
./scripts/build_wasm.sh
cd ..

# Build frontend
echo "⚛️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ All components built successfully!"
