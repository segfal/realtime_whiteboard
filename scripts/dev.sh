#!/bin/bash

# Development script for realtime whiteboard
# This script handles frontend and backend development with WASM compilation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Emscripten
    if ! command_exists emcc; then
        print_warning "Emscripten not found. WASM compilation will fail."
        print_warning "Install with: git clone https://github.com/emscripten-core/emsdk.git && cd emsdk && ./emsdk install latest && ./emsdk activate latest"
    fi
    
    # Check if we're in the right directory
    if [ ! -f "frontend/package.json" ] || [ ! -f "backend/scripts/build_wasm.sh" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    # Install backend dependencies (if any)
    if [ -d "backend" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        # Add any backend dependency installation here if needed
        cd ..
    fi
    
    print_success "Dependencies installed"
}

# Function to build WASM
build_wasm() {
    print_status "Building WASM..."
    
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found"
        exit 1
    fi
    
    cd backend
    
    if ! command_exists emcc; then
        print_error "Emscripten not found. Cannot build WASM."
        print_error "Install with: git clone https://github.com/emscripten-core/emsdk.git && cd emsdk && ./emsdk install latest && ./emsdk activate latest"
        exit 1
    fi
    
    # Make build script executable
    chmod +x scripts/build_wasm.sh
    
    # Build WASM
    ./scripts/build_wasm.sh
    
    if [ $? -eq 0 ]; then
        print_success "WASM build completed"
    else
        print_error "WASM build failed"
        exit 1
    fi
    
    cd ..
}

# Function to start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    # Start frontend in background
    print_status "Starting frontend development server..."
    cd frontend
    npm run dev:fast &
    FRONTEND_PID=$!
    cd ..
    
    # Start backend WebSocket server if it exists
    if [ -d "websocket-server" ]; then
        print_status "Starting WebSocket server..."
        cd websocket-server
        # Add WebSocket server start command here
        # Example: ./build/websocket_server &
        cd ..
    fi
    
    # Start Python ML service if it exists
    if [ -d "ml_shapes" ]; then
        print_status "Starting Python ML service..."
        cd ml_shapes
        # Start FastAPI service
        python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload &
        ML_PID=$!
        cd ..
    fi
    
    print_success "Development servers started"
    print_status "Frontend: http://localhost:5173"
    print_status "ML API: http://localhost:8000"
    print_status "Press Ctrl+C to stop all servers"
    
    # Wait for user interrupt
    trap 'cleanup' INT
    wait
}

# Function to cleanup on exit
cleanup() {
    print_status "Stopping development servers..."
    
    # Kill background processes
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$ML_PID" ]; then
        kill $ML_PID 2>/dev/null || true
    fi
    
    print_success "Development servers stopped"
    exit 0
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --check         Check prerequisites only"
    echo "  -i, --install       Install dependencies only"
    echo "  -w, --wasm          Build WASM only"
    echo "  -f, --frontend      Start frontend only (assumes WASM is built)"
    echo "  -b, --backend       Start backend services only"
    echo "  --clean             Clean build artifacts"
    echo ""
    echo "Examples:"
    echo "  $0                  Start full development environment"
    echo "  $0 -c               Check prerequisites"
    echo "  $0 -w               Build WASM"
    echo "  $0 -f               Start frontend only"
}

# Main script logic
main() {
    case "${1:-}" in
        -h|--help)
            show_usage
            exit 0
            ;;
        -c|--check)
            check_prerequisites
            exit 0
            ;;
        -i|--install)
            check_prerequisites
            install_dependencies
            exit 0
            ;;
        -w|--wasm)
            check_prerequisites
            build_wasm
            exit 0
            ;;
        -f|--frontend)
            print_status "Starting frontend only..."
            cd frontend
            npm run dev:fast
            ;;
        -b|--backend)
            print_status "Starting backend services..."
            # Add backend service startup logic here
            ;;
        --clean)
            print_status "Cleaning build artifacts..."
            cd frontend
            npm run clean
            cd ..
            if [ -d "backend/build" ]; then
                rm -rf backend/build
            fi
            print_success "Clean completed"
            exit 0
            ;;
        "")
            # Default: full development environment
            check_prerequisites
            install_dependencies
            build_wasm
            start_dev_servers
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
