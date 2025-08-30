#!/bin/bash

# Master Validation Script
# This script validates all components before deployment

set -e  # Exit on any error

echo "🚀 Master Validation Starting..."
echo "This will validate all components before deployment"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}🔍 $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    print_error "Not in project root directory"
    exit 1
fi

# Store current directory
PROJECT_ROOT=$(pwd)

# 1. Validate WASM (Backend)
print_header "Validating WASM Engine..."
if [ -f "backend/scripts/validate_wasm.sh" ]; then
    cd backend
    if ./scripts/validate_wasm.sh; then
        print_status "WASM validation passed"
    else
        print_error "WASM validation failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
else
    print_error "WASM validation script not found"
    exit 1
fi

echo ""

# 2. Validate WebSocket Server
print_header "Validating WebSocket Server..."
if [ -f "websocket-server/build.sh" ]; then
    cd websocket-server
    if ./build.sh; then
        print_status "WebSocket server validation passed"
    else
        print_error "WebSocket server validation failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
else
    print_error "WebSocket server validation script not found"
    exit 1
fi

echo ""

# 3. Validate Frontend
print_header "Validating Frontend..."
if [ -f "frontend/scripts/validate.sh" ]; then
    cd frontend
    if ./scripts/validate.sh; then
        print_status "Frontend validation passed"
    else
        print_error "Frontend validation failed"
        exit 1
    fi
    cd "$PROJECT_ROOT"
else
    print_error "Frontend validation script not found"
    exit 1
fi

echo ""

# 4. Final validation summary
echo "🎉 Master Validation Complete!"
echo "✅ All components validated successfully"
echo ""
echo "📊 Validation Summary:"
echo "  - WASM Engine: ✅ Validated"
echo "  - WebSocket Server: ✅ Validated"
echo "  - Frontend: ✅ Validated"
echo ""
echo "🚀 Ready for deployment!"
echo ""
echo "Deployment Commands:"
echo "  Frontend: cd frontend && npm run deploy"
echo "  Backend: cd websocket-server && railway up"
echo ""
echo "All components are ready for production deployment! 🎯"
