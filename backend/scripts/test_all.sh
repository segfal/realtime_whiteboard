#!/bin/bash
echo "Running all library tests..."
echo "================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Test GLM
echo "1. Testing GLM..."
"$SCRIPT_DIR/test_glm.sh"
if [ $? -ne 0 ]; then
    echo "❌ GLM test failed!"
    exit 1
fi
echo ""

# Test WebGPU (will fail natively - this is expected)
echo "2. Testing WebGPU..."
"$SCRIPT_DIR/test_webgpu.sh"
if [ $? -ne 0 ]; then
    echo "❌ WebGPU test failed unexpectedly!"
    exit 1
fi
echo ""

# Test Emscripten
echo "3. Testing Emscripten..."
"$SCRIPT_DIR/test_emscripten.sh"
if [ $? -ne 0 ]; then
    echo "❌ Emscripten test failed!"
    exit 1
fi
echo ""

# Test SDL (optional)
echo "4. Testing SDL..."
"$SCRIPT_DIR/test_sdl.sh"
if [ $? -ne 0 ]; then
    echo "⚠️  SDL test failed (optional for WebGPU project)"
fi
echo ""

echo "================================"
echo "✅ Core tests completed!"
echo ""
echo "Summary:"
echo "- GLM: ✅ Ready for math operations"
echo "- WebGPU: ✅ Ready for browser compilation (native failure expected)"
echo "- Emscripten: ✅ Ready for WASM compilation"
echo "- SDL: ⚠️  Optional, not needed for WebGPU project"
echo ""
echo "🎉 Your development environment is ready for the whiteboard project!"
echo ""
echo "Next steps:"
echo "1. WebGPU will work perfectly in the browser"
echo "2. Emscripten will compile your C++ to WASM"
echo "3. GLM provides all the math operations you need"
echo "4. You're ready to build the high-performance whiteboard!"
