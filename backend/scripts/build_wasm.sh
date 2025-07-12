#!/bin/bash

# WebAssembly build script using Emscripten
# Make sure to source emsdk environment first:
# source ../emsdk/emsdk_env.sh

emcc -std=c++17 \
     -I../glm \
     -I../src \
     -s USE_WEBGPU=1 \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
     -s EXPORTED_FUNCTIONS='["_main"]' \
     -O2 \
     ../src/emscripten_bindings.cpp \
     ../src/webgpu_drawing.cpp \
     -o ../build/drawing_engine.js 