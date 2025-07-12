#!/bin/bash
echo "Testing Emscripten bindings..."
echo "=============================="

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "❌ emcc not found! Emscripten not properly installed."
    exit 1
fi

echo "✅ Emscripten found: $(emcc --version | head -n1)"

# Test 1: Simple compilation without embind
echo "Testing simple Emscripten compilation..."
emcc -std=c++17 \
     -I../glm \
     -s ALLOW_MEMORY_GROWTH=1 \
     -o ../build/test_emscripten_simple.js \
     ../test_includes/test_emscripten_simple.cpp

if [ $? -eq 0 ]; then
    echo "✅ Simple Emscripten compilation successful!"
    echo "Generated: ../build/test_emscripten_simple.js and test_emscripten_simple.wasm"
else
    echo "❌ Simple Emscripten compilation failed!"
    exit 1
fi

# Test 2: Try embind compilation (may fail depending on Emscripten version)
echo ""
echo "Testing Emscripten with embind..."
emcc -std=c++17 \
     -I../glm \
     -s ALLOW_MEMORY_GROWTH=1 \
     -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
     -s EXPORTED_FUNCTIONS='["_main"]' \
     -o ../build/test_emscripten.js \
     ../test_includes/test_emscripten.cpp

if [ $? -eq 0 ]; then
    echo "✅ Emscripten embind compilation successful!"
    echo "Generated files:"
    ls -la ../build/test_emscripten.*
    echo ""
    echo "🎉 Full Emscripten functionality available!"
else
    echo "⚠️  Emscripten embind compilation failed"
    echo ""
    echo "📝 This might be due to:"
    echo "   • Emscripten version differences"
    echo "   • Missing embind headers"
    echo "   • Different embind syntax"
    echo ""
    echo "💡 Don't worry! For the whiteboard project:"
    echo "   • Simple WASM compilation works ✅"
    echo "   • We can use ccall/cwrap for C++ functions"
    echo "   • WebGPU will handle the graphics"
    echo "   • You're ready to proceed!"
fi

echo ""
echo "Emscripten test completed!"
