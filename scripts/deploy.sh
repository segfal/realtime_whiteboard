#!/bin/bash

# Deployment script for realtime whiteboard
# This script compiles WASM locally and prepares for deployment

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
    print_status "Checking deployment prerequisites..."
    
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
        print_error "Emscripten not found. Cannot build WASM for deployment."
        print_error "Install with: git clone https://github.com/emscripten-core/emsdk.git && cd emsdk && ./emsdk install latest && ./emsdk activate latest"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "frontend/package.json" ] || [ ! -f "backend/scripts/build_wasm.sh" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to clean previous builds
clean_builds() {
    print_status "Cleaning previous builds..."
    
    # Clean frontend
    if [ -d "frontend" ]; then
        cd frontend
        npm run clean
        cd ..
    fi
    
    # Clean backend
    if [ -d "backend/build" ]; then
        rm -rf backend/build
    fi
    
    print_success "Clean completed"
}

# Function to build WASM for production
build_wasm_production() {
    print_status "Building WASM for production..."
    
    cd backend
    
    # Make build script executable
    chmod +x scripts/build_wasm.sh
    
    # Build WASM with production optimizations
    emcc -std=c++17 \
         -Iglm \
         -Isrc \
         -Isrc/implement \
         -s USE_WEBGPU=1 \
         -s ALLOW_MEMORY_GROWTH=1 \
         -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
         -s MODULARIZE=1 \
         -s EXPORT_NAME="DrawingEngineModule" \
         -O3 \
         -DNDEBUG \
         --bind \
         src/bindings.cpp \
         src/implement/DrawingEngine/DrawingEngine.cpp \
         -o build/drawing_engine.js
    
    # Copy to frontend/public
    if [ $? -eq 0 ]; then
        mkdir -p ../frontend/public/
        cp build/drawing_engine.* ../frontend/public/
        print_success "WASM build completed and copied to frontend"
    else
        print_error "WASM build failed"
        exit 1
    fi
    
    cd ..
}

# Function to build frontend for production
build_frontend_production() {
    print_status "Building frontend for production..."
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Build frontend
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend build completed"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
}

# Function to verify build artifacts
verify_build_artifacts() {
    print_status "Verifying build artifacts..."
    
    # Check if WASM files exist
    if [ ! -f "frontend/public/drawing_engine.js" ]; then
        print_error "WASM JavaScript file not found"
        exit 1
    fi
    
    if [ ! -f "frontend/public/drawing_engine.wasm" ]; then
        print_error "WASM binary file not found"
        exit 1
    fi
    
    # Check if frontend dist exists
    if [ ! -d "frontend/dist" ]; then
        print_error "Frontend dist directory not found"
        exit 1
    fi
    
    # Check if WASM files are included in dist
    if [ ! -f "frontend/dist/drawing_engine.js" ]; then
        print_error "WASM files not copied to dist directory"
        exit 1
    fi
    
    print_success "Build artifacts verified"
}

# Function to create deployment package
create_deployment_package() {
    print_status "Creating deployment package..."
    
    DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$DEPLOY_DIR"
    
    # Create a temporary git repository for deployment
    DEPLOY_REPO="$DEPLOY_DIR/repo"
    mkdir -p "$DEPLOY_REPO"
    
    # Copy all files to deployment repo
    print_status "Copying files to deployment repository..."
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='deploy-*' . "$DEPLOY_REPO/"
    
    # Use deployment-specific gitignore
    cp .gitignore.deploy "$DEPLOY_REPO/.gitignore"
    
    # Initialize git repository in deployment directory
    cd "$DEPLOY_REPO"
    git init
    git add .
    git commit -m "Deployment build $(date)"
    
    # Copy frontend dist (with WASM files)
    cd ../..
    cp -r frontend/dist "$DEPLOY_DIR/frontend"
    
    # Copy backend build artifacts
    if [ -d "backend/build" ]; then
        cp -r backend/build "$DEPLOY_DIR/backend"
    fi
    
    # Copy Docker files
    if [ -f "docker-compose.yml" ]; then
        cp docker-compose.yml "$DEPLOY_DIR/"
    fi
    
    if [ -f "Dockerfile" ]; then
        cp Dockerfile "$DEPLOY_DIR/"
    fi
    
    # Copy deployment scripts
    cp scripts/deploy.sh "$DEPLOY_DIR/"
    
    # Create deployment info
    cat > "$DEPLOY_DIR/deployment-info.txt" << EOF
Deployment created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "Unknown")
Node.js version: $(node --version)
Emscripten version: $(emcc --version | head -n1)
Build artifacts:
- Frontend: $(ls -la frontend/dist/ | wc -l) files
- WASM: $(ls -la frontend/public/drawing_engine.* 2>/dev/null | wc -l) files
- Deployment repo: $DEPLOY_REPO
EOF
    
    print_success "Deployment package created: $DEPLOY_DIR"
    print_status "Deployment package size: $(du -sh "$DEPLOY_DIR" | cut -f1)"
    print_status "Deployment repository: $DEPLOY_REPO"
}

# Function to deploy to cloud (placeholder)
deploy_to_cloud() {
    print_status "Deploying to cloud..."
    
    # This is a placeholder - implement your cloud deployment logic here
    # Examples:
    # - AWS S3 + CloudFront
    # - Vercel
    # - Netlify
    # - Docker containers to ECS/Kubernetes
    
    print_warning "Cloud deployment not implemented yet"
    print_status "Deployment package is ready in: deploy-$(date +%Y%m%d-%H%M%S)"
    print_status "Implement your cloud deployment logic in this function"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -c, --check         Check prerequisites only"
    echo "  -w, --wasm          Build WASM only"
    echo "  -f, --frontend      Build frontend only"
    echo "  -v, --verify        Verify build artifacts only"
    echo "  -p, --package       Create deployment package only"
    echo "  --deploy            Deploy to cloud (placeholder)"
    echo "  --clean             Clean build artifacts"
    echo ""
    echo "Examples:"
    echo "  $0                  Full build and package"
    echo "  $0 -w               Build WASM only"
    echo "  $0 -f               Build frontend only"
    echo "  $0 -p               Create deployment package"
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
        -w|--wasm)
            check_prerequisites
            build_wasm_production
            exit 0
            ;;
        -f|--frontend)
            check_prerequisites
            build_frontend_production
            exit 0
            ;;
        -v|--verify)
            verify_build_artifacts
            exit 0
            ;;
        -p|--package)
            verify_build_artifacts
            create_deployment_package
            exit 0
            ;;
        --deploy)
            check_prerequisites
            clean_builds
            build_wasm_production
            build_frontend_production
            verify_build_artifacts
            create_deployment_package
            deploy_to_cloud
            ;;
        --clean)
            clean_builds
            exit 0
            ;;
        "")
            # Default: full build and package
            check_prerequisites
            clean_builds
            build_wasm_production
            build_frontend_production
            verify_build_artifacts
            create_deployment_package
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
