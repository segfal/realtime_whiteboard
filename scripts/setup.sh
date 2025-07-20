#!/bin/bash

# Setup script for realtime_whiteboard project
# Installs dependencies and builds the project for first-time setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "Makefile" ]]; then
    print_error "This script must be run from the realtime_whiteboard root directory"
    exit 1
fi

print_status "Setting up Realtime Whiteboard project..."
echo ""

# Check system requirements
print_status "Checking system requirements..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed."
    print_status "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed."
    exit 1
fi

# Check for Emscripten (for WebAssembly builds)
if ! command -v emcc &> /dev/null; then
    print_warning "Emscripten not found. WebAssembly builds may fail."
    print_status "To install Emscripten, see: https://emscripten.org/docs/getting_started/downloads.html"
fi

# Check for g++ (for native builds)
if ! command -v g++ &> /dev/null; then
    print_warning "g++ not found. Native builds may fail."
    print_status "To install g++, run: xcode-select --install (macOS) or apt-get install build-essential (Ubuntu)"
fi

print_success "System requirements check completed!"
echo ""

# Install frontend dependencies
print_status "Installing frontend dependencies..."
make install-frontend
echo ""

# Build backend
print_status "Building backend..."
make build-backend
echo ""

# Show project status
print_status "Project setup completed! Current status:"
make status
echo ""

print_success "Setup completed successfully!"
echo ""
print_status "Next steps:"
echo "  • Run 'make dev' to start development"
echo "  • Run 'make debug-frontend' to start with debugging"
echo "  • Run 'make help' to see all available commands" 