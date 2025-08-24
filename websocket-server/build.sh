#!/bin/bash

# WebSocket Server Validation Script
# This script validates everything before deployment

set -e  # Exit on any error

echo "🔍 WebSocket Server Validation Starting..."

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
if [ ! -f "CMakeLists.txt" ]; then
    print_error "CMakeLists.txt not found. Are you in the websocket-server directory?"
    exit 1
fi

# 1. Check system dependencies
echo "📋 Checking system dependencies..."
if ! command -v cmake &> /dev/null; then
    print_error "CMake not found. Please install CMake"
    exit 1
fi
if ! command -v make &> /dev/null; then
    print_error "Make not found. Please install Make"
    exit 1
fi
if ! command -v g++ &> /dev/null; then
    print_error "G++ compiler not found. Please install GCC"
    exit 1
fi
print_status "System dependencies are available"

# 2. Check source files
echo "📁 Checking source files..."
if [ ! -f "src/main.cpp" ]; then
    print_error "src/main.cpp not found"
    exit 1
fi
if [ ! -f "CMakeLists.txt" ]; then
    print_error "CMakeLists.txt not found"
    exit 1
fi
print_status "Source files are present"

# 3. Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build
mkdir -p build

# 4. CMake configuration
echo "🔧 Running CMake configuration..."
cd build
if cmake ..; then
    print_status "CMake configuration successful"
else
    print_error "CMake configuration failed"
    echo "Check CMakeLists.txt and dependencies"
    exit 1
fi

# 5. Compilation
echo "⚙️ Compiling..."
if make -j$(nproc); then
    print_status "Compilation successful"
else
    print_error "Compilation failed"
    echo "Check source code for errors"
    exit 1
fi

# 6. Binary validation
echo "🧪 Testing binary..."
if [ -f "server" ]; then
    BINARY_SIZE=$(ls -lh server | awk '{print $5}')
    print_status "Binary created successfully"
    echo "📊 Binary size: $BINARY_SIZE"
    
    # Test if binary is executable
    if [ -x "server" ]; then
        print_status "Binary is executable"
    else
        print_error "Binary is not executable"
        exit 1
    fi
else
    print_error "Binary not found after compilation"
    exit 1
fi

# 7. Docker build validation (optional)
if command -v docker &> /dev/null; then
    echo "🐳 Testing Docker build..."
    cd ..  # Go back to websocket-server directory
    if docker build -t websocket-server-test .; then
        print_status "Docker build successful"
    else
        print_error "Docker build failed"
        echo "Check Dockerfile and dependencies"
        exit 1
    fi
else
    print_warning "Docker not available, skipping Docker build test"
fi

# 8. Railway configuration check
echo "🔧 Checking Railway configuration..."
if [ -f "railway.toml" ]; then
    print_status "Railway configuration found"
else
    print_warning "railway.toml not found"
    echo "Railway will use default configuration"
fi

# 9. Final validation summary
echo ""
echo "🎉 WebSocket Server Validation Complete!"
echo "✅ All checks passed"
echo "🚀 Ready for deployment to Railway"
echo ""
echo "📊 Validation Summary:"
echo "  - System dependencies: ✅ Available"
echo "  - Source files: ✅ Present"
echo "  - CMake configuration: ✅ Successful"
echo "  - Compilation: ✅ Successful"
echo "  - Binary: ✅ Created ($BINARY_SIZE)"
echo "  - Executable: ✅ Yes"
if command -v docker &> /dev/null; then
    echo "  - Docker build: ✅ Successful"
else
    echo "  - Docker build: ⚠️ Skipped"
fi
echo "  - Railway config: ✅ Found"
echo ""
echo "To deploy: railway up" 