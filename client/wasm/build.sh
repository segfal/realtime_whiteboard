#!/bin/bash

# Build script for WebAssembly Drawing Engine
# This script compiles the C++ drawing engine to WebAssembly using Emscripten

set -e  # Exit on any error

echo "🚀 Building WebAssembly Drawing Engine..."

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Error: Emscripten (emcc) not found!"
    echo "Please install Emscripten first:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

# Get number of CPU cores (cross-platform)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CORES=$(sysctl -n hw.ncpu)
else
    # Linux
    CORES=$(nproc 2>/dev/null || echo 1)
fi

# Create build directory
mkdir -p build
cd build

echo "📦 Configuring CMake with Emscripten..."

# Configure with CMake
emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_FLAGS="-O3 -s USE_WEBGL2=1 -s FULL_ES3=1" \
    -DCMAKE_EXE_LINKER_FLAGS="--bind -s MODULARIZE=1 -s EXPORT_NAME=createDrawingEngineModule -s ENVIRONMENT=web -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"

echo "🔨 Compiling to WebAssembly..."

# Build the project
emmake make -j$CORES

echo "✅ Build completed successfully!"

# Copy the generated files to the public directory
echo "📁 Copying files to public directory..."
cp drawing_engine.js ../../public/
cp drawing_engine.wasm ../../public/

echo "🎉 WebAssembly module ready!"
echo "📂 Files generated:"
echo "  - public/drawing_engine.js"
echo "  - public/drawing_engine.wasm"

# Optional: Show file sizes
echo "📊 File sizes:"
ls -lh drawing_engine.js drawing_engine.wasm

cd .. 