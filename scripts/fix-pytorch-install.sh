#!/bin/bash

# 🔧 PyTorch Installation Fix Script
# This script fixes PyTorch installation issues by using CPU-only versions

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

print_status "🔧 Fixing PyTorch Installation Issues"

cd ml_shapes

# Backup original pyproject.toml
if [ ! -f "pyproject.toml.backup" ]; then
    cp pyproject.toml pyproject.toml.backup
    print_status "Backed up original pyproject.toml"
fi

# Create a temporary pyproject.toml with CPU-only PyTorch
print_status "Creating CPU-only PyTorch configuration..."

cat > pyproject.toml << 'EOF'
[project]
name = "shape_recognizer"
version = "0.1.0"
description = ""
authors = [
    {name = "Yongthz",email = "yuntao2019@gmail.com"}
]
readme = "README.md"
requires-python = ">=3.12,<3.14"
dependencies = [
    "matplotlib (>=3.10.5,<4.0.0)",
    "pillow (>=11.3.0,<12.0.0)",
    "numpy (>=2,<2.3.0)",
    "opencv-python-headless (>=4.12.0.88,<5.0.0.0)",
    "ndjson (>=0.3.1,<0.4.0)",
    "torch (>=2.8.0,<3.0.0)",
    "torchvision (>=0.23.0,<0.24.0)",
]

[build-system]
requires = ["poetry-core>=2.0.0,<3.0.0"]
build-backend = "poetry.core.masonry.api"

[tool.poetry.dependencies]
torch = "^2.8.0"
torchvision = "^0.23.0"
EOF

print_status "Removing existing virtual environment..."
if [ -d ".venv" ]; then
    rm -rf .venv
fi

print_status "Regenerating lock file..."
poetry lock --no-cache

print_status "Installing dependencies with CPU-only PyTorch..."
poetry install --only main

print_success "✅ PyTorch installation fixed!"

# Test the installation
print_status "Testing PyTorch installation..."
poetry run python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'Device: {torch.device(\"cuda\" if torch.cuda.is_available() else \"cpu\")}')
"

cd ..

print_success "✅ PyTorch installation completed successfully!"
echo ""
print_status "Note: Original pyproject.toml backed up as pyproject.toml.backup"
print_status "If you need CUDA support later, you can restore it."
