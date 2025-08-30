#!/bin/bash

g++ -std=c++17 \
    -I/opt/homebrew/Cellar/glm/1.0.1/include \
    -Iglm \
    -Isrc \
    -Isrc/implement \
    -o build/basic_test \
    src/basic_test.cpp \
    src/implement/DrawingEngine/DrawingEngine.cpp
