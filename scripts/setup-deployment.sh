#!/bin/bash

# 🚀 Quick Deployment Setup Script
# This script helps you set up the deployment environment

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🚀 Setting up Realtime Whiteboard Deployment Environment"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ] || [ ! -f "websocket-server/CMakeLists.txt" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Homebrew is available
if command -v brew &> /dev/null; then
    print_success "Homebrew detected - will use for dependency installation"
    USE_HOMEBREW=true
else
    print_warning "Homebrew not found - will use system package managers"
    USE_HOMEBREW=false
fi

# Install system dependencies
print_status "Installing system dependencies..."

if [ "$USE_HOMEBREW" = true ]; then
    print_status "Using Homebrew to install dependencies..."
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        print_status "Installing Node.js via Homebrew..."
        brew install node
    else
        print_success "Node.js already installed: $(node --version)"
    fi
    
    # Install Python 3.12+ if not present
    if ! python3 --version 2>/dev/null | grep -q "3\.[1-9][2-9]"; then
        print_status "Installing Python 3.12+ via Homebrew..."
        brew install python@3.12
        # Add to PATH if needed
        if ! command -v python3.12 &> /dev/null; then
            print_warning "Python 3.12 installed but not in PATH. You may need to add it manually."
        fi
    else
        print_success "Python 3.12+ already installed: $(python3 --version)"
    fi
    
    # Install Poetry if not present
    if ! command -v poetry &> /dev/null; then
        print_status "Installing Poetry via Homebrew..."
        brew install poetry
    else
        print_success "Poetry already installed: $(poetry --version)"
    fi
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        print_status "Installing Docker via Homebrew..."
        brew install --cask docker
        print_warning "Docker installed. Please start Docker Desktop manually."
    else
        print_success "Docker already installed: $(docker --version)"
    fi
else
    print_status "Using system package managers..."
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        print_status "You can install it from: https://nodejs.org/"
        exit 1
    fi
    
    # Check Python version
    if ! python3 --version 2>/dev/null | grep -q "3\.[1-9][2-9]"; then
        print_error "Python 3.12+ is required. Current version: $(python3 --version)"
        print_status "Please upgrade Python: https://www.python.org/downloads/"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $(node --version)"
    print_status "Please upgrade Node.js: https://nodejs.org/"
    exit 1
else
    print_success "Node.js version: $(node --version)"
fi

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 12 ]; then
    print_success "Python version: $(python3 --version)"
else
    print_error "Python 3.12+ is required. Current version: $(python3 --version)"
    exit 1
fi

# Install global dependencies
print_status "Installing global dependencies..."

if ! command -v vercel &> /dev/null; then
    print_status "Installing Vercel CLI..."
    npm install -g vercel
else
    print_success "Vercel CLI already installed"
fi

if ! command -v railway &> /dev/null; then
    print_status "Installing Railway CLI..."
    npm install -g @railway/cli
else
    print_success "Railway CLI already installed"
fi

# Install project dependencies
print_status "Installing project dependencies..."

# Frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
npm ci
cd ..

# Backend dependencies (if needed)
print_status "Checking backend dependencies..."
cd backend
if [ -f "scripts/build_wasm.sh" ]; then
    chmod +x scripts/build_wasm.sh
    print_success "WASM build script ready"
else
    print_warning "WASM build script not found"
fi
cd ..

# ML service dependencies
print_status "Installing ML service dependencies..."
cd ml_shapes

# Use smart PyTorch installation
if command -v poetry &> /dev/null; then
    print_status "Using smart PyTorch installation..."
    
    # Run system detection and smart PyTorch installation
    if [ -f "../scripts/install-pytorch.sh" ]; then
        cd ..
        ./scripts/install-pytorch.sh
        cd ml_shapes
    else
        print_warning "Smart PyTorch installation script not found, using fallback..."
        
        # Fallback to manual installation
        # Try to find Python 3.12 or higher
        PYTHON_CMD=""
        for cmd in python3.13 python3.12 python3; do
            if command -v $cmd &> /dev/null; then
                PYTHON_VERSION_OUTPUT=$($cmd --version 2>&1)
                if echo "$PYTHON_VERSION_OUTPUT" | grep -q "3\.[1-9][2-9]"; then
                    PYTHON_CMD=$cmd
                    print_success "Found compatible Python: $($cmd --version)"
                    break
                fi
            fi
        done
        
        if [ -n "$PYTHON_CMD" ]; then
            # Configure Poetry to use the correct Python version
            poetry env use $PYTHON_CMD
            poetry install --only main --no-root
            print_success "ML service dependencies installed with $PYTHON_CMD"
        else
            print_error "No compatible Python version found (3.12+)"
            print_status "Available Python versions:"
            ls /usr/bin/python* 2>/dev/null || echo "No system Python found"
            if command -v pyenv &> /dev/null; then
                print_status "pyenv versions:"
                pyenv versions
            fi
            exit 1
        fi
    fi
else
    print_warning "Poetry not found. Install with: pip install poetry"
    print_status "Or install via Homebrew: brew install poetry"
fi
cd ..

# Make deployment script executable
chmod +x scripts/deploy.sh

print_success "✅ Deployment environment setup completed!"

echo ""
print_status "📋 Next Steps:"
echo ""
echo "1. Set up GitHub repository secrets:"
echo "   - Go to your repo → Settings → Secrets and variables → Actions"
echo "   - Add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID"
echo "   - Add RAILWAY_TOKEN"
echo ""
echo "2. Initialize Vercel project:"
echo "   cd frontend && vercel"
echo ""
echo "3. Create Railway projects:"
echo "   - Go to https://railway.app"
echo "   - Create new project for websocket-server"
echo "   - Add second service for ml_shapes"
echo ""
echo "4. Test deployment:"
echo "   ./scripts/deploy.sh --check"
echo ""
echo "5. Deploy all services:"
echo "   ./scripts/deploy.sh --all"
echo ""
print_status "📚 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
