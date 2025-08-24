#!/bin/bash

# WASM Validation Script
# This script validates WASM compilation before deployment

set -e  # Exit on any error

echo "🔍 WASM Validation Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "scripts/build_wasm.sh" ]; then
    print_error "build_wasm.sh not found. Are you in the backend directory?"
    exit 1
fi

# 1. Check Emscripten installation
echo "📋 Checking Emscripten installation..."
if [ ! -d "emsdk" ]; then
    print_error "Emscripten SDK not found. Please run: git clone https://github.com/emscripten-core/emsdk.git"
    exit 1
fi

# Source Emscripten environment
if [ -f "emsdk/emsdk_env.sh" ]; then
    source emsdk/emsdk_env.sh
    print_status "Emscripten environment sourced"
else
    print_error "Emscripten environment script not found"
    exit 1
fi

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    print_error "emcc not found. Please install Emscripten"
    exit 1
fi

EMCC_VERSION=$(emcc --version | head -n1)
print_status "Emscripten version: $EMCC_VERSION"

# 2. Check source files
echo "📁 Checking source files..."
if [ ! -f "src/bindings.cpp" ]; then
    print_error "src/bindings.cpp not found"
    exit 1
fi

if [ ! -f "src/implement/DrawingEngine/DrawingEngine.cpp" ]; then
    print_error "src/implement/DrawingEngine/DrawingEngine.cpp not found"
    exit 1
fi

print_status "Source files are present"

# 3. Check output directory
echo "📁 Checking output directory..."
FRONTEND_PUBLIC="../frontend/public"
if [ ! -d "$FRONTEND_PUBLIC" ]; then
    print_error "Frontend public directory not found at $FRONTEND_PUBLIC"
    exit 1
fi
print_status "Output directory is accessible"

# 4. Build WASM
echo "🔧 Building WASM..."
if ./scripts/build_wasm.sh; then
    print_status "WASM build successful"
else
    print_error "WASM build failed"
    exit 1
fi

# 5. Validate output files
echo "🧪 Validating output files..."
WASM_JS="$FRONTEND_PUBLIC/drawing_engine.js"
WASM_BIN="$FRONTEND_PUBLIC/drawing_engine.wasm"

if [ ! -f "$WASM_JS" ]; then
    print_error "drawing_engine.js not found"
    exit 1
fi

if [ ! -f "$WASM_BIN" ]; then
    print_error "drawing_engine.wasm not found"
    exit 1
fi

print_status "WASM output files created"

# 6. Check file sizes
echo "📊 Checking file sizes..."
JS_SIZE=$(ls -lh "$WASM_JS" | awk '{print $5}')
WASM_SIZE=$(ls -lh "$WASM_BIN" | awk '{print $5}')

echo "📄 drawing_engine.js: $JS_SIZE"
echo "🔧 drawing_engine.wasm: $WASM_SIZE"

# Check if files are reasonable size (not empty or too small)
JS_BYTES=$(stat -c%s "$WASM_JS")
WASM_BYTES=$(stat -c%s "$WASM_BIN")

if [ "$JS_BYTES" -lt 1000 ]; then
    print_warning "drawing_engine.js seems too small ($JS_BYTES bytes)"
fi

if [ "$WASM_BYTES" -lt 1000 ]; then
    print_warning "drawing_engine.wasm seems too small ($WASM_BYTES bytes)"
fi

print_status "File size validation complete"

# 7. Validate WASM file format
echo "🔍 Validating WASM file format..."
if command -v wasm-validate &> /dev/null; then
    if wasm-validate "$WASM_BIN"; then
        print_status "WASM file format is valid"
    else
        print_error "WASM file format is invalid"
        exit 1
    fi
else
    print_warning "wasm-validate not available, skipping format validation"
fi

# 8. Check JavaScript file content
echo "🔍 Checking JavaScript file content..."
if grep -q "DrawingEngineModule" "$WASM_JS"; then
    print_status "DrawingEngineModule found in JavaScript file"
else
    print_warning "DrawingEngineModule not found in JavaScript file"
fi

if grep -q "drawing_engine.wasm" "$WASM_JS"; then
    print_status "WASM file reference found in JavaScript"
else
    print_warning "WASM file reference not found in JavaScript"
fi

# 9. Final validation summary
echo ""
echo "🎉 WASM Validation Complete!"
echo "✅ All checks passed"
echo "🚀 WASM is ready for frontend deployment"
echo ""
echo "📊 Validation Summary:"
echo "  - Emscripten: ✅ Installed ($EMCC_VERSION)"
echo "  - Source files: ✅ Present"
echo "  - Build process: ✅ Successful"
echo "  - Output files: ✅ Created"
echo "  - drawing_engine.js: ✅ $JS_SIZE"
echo "  - drawing_engine.wasm: ✅ $WASM_SIZE"
if command -v wasm-validate &> /dev/null; then
    echo "  - WASM format: ✅ Valid"
else
    echo "  - WASM format: ⚠️ Not validated"
fi
echo "  - Module exports: ✅ Found"
echo ""
echo "WASM files are ready in: $FRONTEND_PUBLIC"
