#!/bin/bash

# Debug script for realtime_whiteboard project
# Builds backend and starts frontend with debugging enabled

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

print_status "Starting debugging environment..."

# Check if Chrome is available for debugging
if ! command -v google-chrome &> /dev/null && ! command -v /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome &> /dev/null; then
    print_warning "Chrome not found. Debugging will start without automatic Chrome launch."
    DEBUG_MODE="chrome"
else
    print_status "Chrome found. Starting with full debugging..."
    DEBUG_MODE="full"
fi

# Build backend
print_status "Building backend..."
make build-backend

# Start frontend with debugging
print_status "Starting frontend with debugging..."
if [[ "$DEBUG_MODE" == "full" ]]; then
    make debug-frontend-full
else
    make debug-frontend
fi 