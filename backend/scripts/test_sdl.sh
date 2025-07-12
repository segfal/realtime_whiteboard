#!/bin/bash
echo "Testing SDL library..."
echo "====================="

# Check if SDL headers exist
if [ ! -d "../SDL/include" ]; then
    echo "❌ SDL headers not found in ../SDL/include"
    exit 1
fi

# Try compilation with SDL
g++ -std=c++17 \
    -I../SDL/include \
    -L../SDL/build/.libs \
    -lSDL2 \
    -o ../build/test_sdl \
    ../test_includes/test_sdl.cpp

if [ $? -eq 0 ]; then
    echo "✅ SDL compilation successful!"
    echo "Running SDL test..."
    ../build/test_sdl
    echo ""
else
    echo "❌ SDL compilation failed!"
    echo "Note: SDL might need to be built first or linked differently"
    echo "For WebGPU whiteboard, SDL is optional"
    exit 1
fi

echo "SDL test completed!"
