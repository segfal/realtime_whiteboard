#!/bin/bash

# 🚀 Realtime Whiteboard Deployment Script
# This script deploys the frontend to Vercel and backend services to Railway

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
BACKEND_DIR="websocket-server"
ML_SERVICE_DIR="ml_shapes"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI not found. Installing..."
        npm install -g @railway/cli
    fi
    
    print_success "Prerequisites check completed"
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci
    
    # Build WASM backend
    print_status "Building WebAssembly backend..."
    cd ../backend
    if [ -f "scripts/build_wasm.sh" ]; then
        chmod +x scripts/build_wasm.sh
        ./scripts/build_wasm.sh
    else
        print_error "WASM build script not found"
        exit 1
    fi
    
    # Build frontend
    cd "../$FRONTEND_DIR"
    print_status "Building frontend for production..."
    npm run build
    
    cd ..
    print_success "Frontend build completed"
}

# Function to deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    cd "$FRONTEND_DIR"
    
    # Check if Vercel is configured
    if [ ! -f ".vercel/project.json" ]; then
        print_warning "Vercel not configured. Please run 'vercel' first to set up the project"
        print_status "You can run: vercel --prod"
        return 1
    fi
    
    # Deploy to Vercel
    vercel --prod --yes
    
    cd ..
    print_success "Frontend deployed to Vercel"
}

# Function to deploy backend to Railway
deploy_backend() {
    print_status "Deploying WebSocket backend to Railway..."
    
    cd "$BACKEND_DIR"
    
    # Check if Railway is configured
    if [ ! -f "railway.toml" ]; then
        print_error "Railway configuration not found"
        exit 1
    fi
    
    # Deploy to Railway
    railway up
    
    cd ..
    print_success "Backend deployed to Railway"
}

# Function to deploy ML service to Railway
deploy_ml_service() {
    print_status "Deploying ML service to Railway..."
    
    cd "$ML_SERVICE_DIR"
    
    # Check if Railway is configured
    if [ ! -f "railway.toml" ]; then
        print_error "Railway configuration not found"
        exit 1
    fi
    
    # Deploy to Railway
    railway up
    
    cd ..
    print_success "ML service deployed to Railway"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Get deployment URLs (you'll need to configure these)
    FRONTEND_URL="${FRONTEND_URL:-https://your-app.vercel.app}"
    BACKEND_URL="${BACKEND_URL:-https://your-backend.railway.app}"
    ML_SERVICE_URL="${ML_SERVICE_URL:-https://your-ml-service.railway.app}"
    
    # Test frontend
    print_status "Testing frontend..."
    if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed"
    fi
    
    # Test backend
    print_status "Testing backend..."
    if curl -f "$BACKEND_URL/health" > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_warning "Backend health check failed"
    fi
    
    # Test ML service
    print_status "Testing ML service..."
    if curl -f "$ML_SERVICE_URL/health" > /dev/null 2>&1; then
        print_success "ML service health check passed"
    else
        print_warning "ML service health check failed"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --check          Check prerequisites only"
    echo "  --build          Build all components"
    echo "  --frontend       Deploy frontend only"
    echo "  --backend        Deploy backend only"
    echo "  --ml-service     Deploy ML service only"
    echo "  --all            Deploy all services (default)"
    echo "  --health-check   Run health checks"
    echo "  --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --check       # Check prerequisites"
    echo "  $0 --build       # Build all components"
    echo "  $0 --frontend    # Deploy frontend only"
    echo "  $0 --all         # Deploy all services"
}

# Main script logic
main() {
    case "${1:---all}" in
        --check)
            check_prerequisites
            ;;
        --build)
            check_prerequisites
            build_frontend
            ;;
        --frontend)
            check_prerequisites
            build_frontend
            deploy_frontend
            ;;
        --backend)
            check_prerequisites
            deploy_backend
            ;;
        --ml-service)
            check_prerequisites
            deploy_ml_service
            ;;
        --all)
            check_prerequisites
            build_frontend
            deploy_frontend
            deploy_backend
            deploy_ml_service
            run_health_checks
            ;;
        --health-check)
            run_health_checks
            ;;
        --help)
            show_usage
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
    
    print_success "Deployment completed successfully!"
}

# Run main function with all arguments
main "$@"
