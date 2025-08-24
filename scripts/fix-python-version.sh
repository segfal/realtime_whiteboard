#!/bin/bash

# 🔧 Python Version Fix Script
# This script helps fix Python version issues for the ML service

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

print_status "🔧 Fixing Python Version Issues for ML Service"

# Check current Python versions
print_status "Checking available Python versions..."

echo "System Python versions:"
ls /usr/bin/python* 2>/dev/null | grep -E "python[0-9]" || echo "No system Python found"

if command -v pyenv &> /dev/null; then
    echo ""
    echo "pyenv versions:"
    pyenv versions
fi

if command -v brew &> /dev/null; then
    echo ""
    echo "Homebrew Python versions:"
    brew list | grep python || echo "No Homebrew Python found"
fi

echo ""
print_status "Current Python 3 version:"
python3 --version

# Check if we have a compatible Python version
COMPATIBLE_PYTHON=""
for cmd in python3.13 python3.12 python3; do
    if command -v $cmd &> /dev/null; then
        PYTHON_VERSION_OUTPUT=$($cmd --version 2>&1)
        if echo "$PYTHON_VERSION_OUTPUT" | grep -q "3\.[1-9][2-9]"; then
            COMPATIBLE_PYTHON=$cmd
            print_success "Found compatible Python: $PYTHON_VERSION_OUTPUT"
            break
        fi
    fi
done

if [ -z "$COMPATIBLE_PYTHON" ]; then
    print_error "No compatible Python version found (3.12+)"
    echo ""
    print_status "Solutions:"
    echo ""
    echo "1. Install Python 3.12+ via Homebrew:"
    echo "   brew install python@3.12"
    echo ""
    echo "2. Install Python 3.12+ via pyenv:"
    echo "   pyenv install 3.12.0"
    echo "   pyenv global 3.12.0"
    echo ""
    echo "3. Download from python.org:"
    echo "   https://www.python.org/downloads/"
    echo ""
    exit 1
fi

# Fix ML service Poetry environment
print_status "Fixing ML service Poetry environment..."

cd ml_shapes

if command -v poetry &> /dev/null; then
    print_status "Configuring Poetry to use $COMPATIBLE_PYTHON..."
    
    # Remove existing virtual environment if it exists
    if [ -d ".venv" ]; then
        print_status "Removing existing virtual environment..."
        rm -rf .venv
    fi
    
    # Configure Poetry to use the compatible Python version
    poetry env use $COMPATIBLE_PYTHON
    
    # Install dependencies
    print_status "Installing dependencies with $COMPATIBLE_PYTHON..."
    poetry install --only main
    
    print_success "ML service dependencies installed successfully!"
    
    # Test the installation
    print_status "Testing ML service..."
    poetry run python --version
    poetry run python -c "import torch; print(f'PyTorch version: {torch.__version__}')" || echo "PyTorch not available"
    
else
    print_error "Poetry not found. Please install Poetry first:"
    echo "   brew install poetry"
    echo "   or"
    echo "   pip install poetry"
    exit 1
fi

cd ..

print_success "✅ Python version issues fixed!"
echo ""
print_status "You can now run the setup script again:"
echo "   ./scripts/setup-deployment.sh"
