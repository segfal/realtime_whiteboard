#!/bin/bash

# Realtime Whiteboard C++ Server Build Script
# Usage: ./build.sh [clean]

set -e  # Exit on any error

echo "🚀 Building Realtime Whiteboard C++ Server..."

# Change to script directory
cd "$(dirname "$0")"

# Clean build if requested
if [[ "$1" == "clean" ]]; then
    echo "🧹 Cleaning previous build..."
    rm -rf vendor build
fi

# Ensure vendor directory exists
if [[ ! -d "vendor" ]]; then
    echo "📦 Setting up dependencies..."
    mkdir -p vendor
    
    echo "📥 Cloning uWebSockets..."
    git clone --recursive https://github.com/uNetworking/uWebSockets.git vendor/uWebSockets
    
    echo "📥 Cloning nlohmann/json..."
    git clone https://github.com/nlohmann/json.git vendor/json
fi

# Create build directory
mkdir -p build

# Configure and build
echo "⚙️ Configuring CMake..."
cd build
cmake -S .. -B .

echo "🔨 Building server..."
make

echo ""
echo "✅ Build successful!"
echo ""
echo "🎯 To run the server:"
echo "   cd backend/cpp_server/build"
echo "   ./server"
echo ""
echo "🌐 Server will listen on: ws://localhost:9000"
echo "" 