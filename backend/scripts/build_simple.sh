#!/bin/bash

# Simple build script for basic stroke testing
g++ -std=c++17 \
    -I/opt/homebrew/Cellar/glm/1.0.1/include \
    -Iglm \
    -Isrc \
    -Isrc/implement \
    -o build/simple_test \
    src/simple_test.cpp \
    src/implement/DrawingEngine/DrawingEngine.cpp
