#!/bin/bash

# Simple test script - builds and runs tests
echo "🔨 Building C++ tests..."
./scripts/build_native.sh

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🧪 Running tests..."
    echo ""
    ./build/test_native
else
    echo "❌ Build failed!"
    exit 1
fi
