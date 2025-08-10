#!/bin/bash

# WebAssembly build script using Emscripten
# Make sure to source emsdk environment first:
# source ../emsdk/emsdk_env.sh

emcc -std=c++17 \
     -Iglm \
     -Isrc \
     -Isrc/implement \
     -s USE_WEBGPU=1 \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
     -s MODULARIZE=1 \
     -s EXPORT_NAME="DrawingEngineModule" \
     -g \
     --bind \
     src/bindings.cpp \
     src/implement/DrawingEngine/DrawingEngine.cpp \
     -o build/drawing_engine.js

# Copy to frontend/public if build succeeded
if [ $? -eq 0 ]; then
  mkdir -p ../frontend/public/
  cp build/drawing_engine.* ../frontend/public/
  echo "Copied build/drawing_engine.* to ../frontend/public/"
else
  echo "Build failed, not copying files."
fi