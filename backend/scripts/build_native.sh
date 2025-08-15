#!/bin/bash

# Native build script for testing C++ code
g++ -std=c++17 \
    -I/opt/homebrew/Cellar/glm/1.0.1/include \
    -Iglm \
    -Isrc \
    -Isrc/implement \
    -o build/test_native \
    src/main.cpp \
    src/implement/DrawingEngine/DrawingEngine.cpp