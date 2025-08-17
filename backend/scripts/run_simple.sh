#!/bin/bash

echo "Building simple test..."
./scripts/build_simple.sh

if [ $? -eq 0 ]; then
    echo "Build successful! Running test..."
    echo ""
    ./build/simple_test
else
    echo "Build failed!"
    exit 1
fi
