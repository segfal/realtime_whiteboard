#!/bin/bash

# Development script for realtime_whiteboard project
# Builds backend and starts frontend development server

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

# Check if we're in the right directory
if [[ ! -f "Makefile" ]]; then
    print_error "This script must be run from the realtime_whiteboard root directory"
    exit 1
fi

print_status "Starting development environment..."

# Build backend
print_status "Building backend..."
make build-backend

# Start frontend
print_status "Starting frontend development server..."
make run-frontend 