#!/bin/bash

# Check if "run" argument is provided
if [ "$1" = "run" ]; then
    if [ -d "build" ] && [ -f "build/bin/realtime_whiteboard" ]; then
        echo "Running existing build..."
        ./build/bin/realtime_whiteboard
    else
        echo "No existing build found. Building first..."
        # Continue to build process
    fi
fi

# Build process
if [ ! -d "build" ]; then
    echo "Creating build directory..."
    mkdir build
elif [ "$(ls -A build)" ]; then
    echo "Cleaning existing build directory..."
    rm -rf build/*
fi

echo "Building project..."
cd build
cmake ..
make

if [ $? -eq 0 ]; then
    echo "Build successful!"
    if [ "$1" != "run" ]; then
        echo "Running application..."
        ./bin/realtime_whiteboard
    fi
else
    echo "Build failed!"
    exit 1
fi