#!/bin/bash

# 🚀 Smart PyTorch Installation Script
# This script automatically detects the system and installs the appropriate PyTorch version

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

print_status "🚀 Smart PyTorch Installation"

# Run system detection first
if [ -f "scripts/detect-system.sh" ]; then
    print_status "Running system detection..."
    source scripts/detect-system.sh
else
    print_error "System detection script not found"
    exit 1
fi

# Load system configuration
if [ -f ".system-config.json" ]; then
    print_status "Loading system configuration..."
    OS_TYPE=$(jq -r '.os_type' .system-config.json)
    ARCH_TYPE=$(jq -r '.architecture' .system-config.json)
    GPU_TYPE=$(jq -r '.gpu_type' .system-config.json)
    PYTORCH_VERSION=$(jq -r '.pytorch_version' .system-config.json)
    PYTORCH_SOURCE=$(jq -r '.pytorch_source' .system-config.json)
else
    print_error "System configuration not found. Run detect-system.sh first."
    exit 1
fi

print_status "Installing PyTorch for: $OS_TYPE/$ARCH_TYPE with $GPU_TYPE GPU"

cd ml_shapes

# Backup original pyproject.toml
if [ ! -f "pyproject.toml.backup" ]; then
    cp pyproject.toml pyproject.toml.backup
    print_status "Backed up original pyproject.toml"
fi

# Create appropriate pyproject.toml based on system
print_status "Creating PyTorch configuration for $PYTORCH_VERSION..."

if [[ "$PYTORCH_VERSION" == "cuda" ]]; then
    # CUDA version for NVIDIA GPUs
    cat > pyproject.toml << EOF
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

[[tool.poetry.source]]
name = "torch-cu129"
url = "https://download.pytorch.org/whl/cu129"
priority = "explicit"

[tool.poetry.dependencies]
torch = {source = "torch-cu129"}
torchvision = {source = "torch-cu129"}
EOF
    print_success "Configured for CUDA PyTorch (NVIDIA GPU)"
else
    # CPU version for all other cases
    cat > pyproject.toml << EOF
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
    print_success "Configured for CPU PyTorch"
fi

# Remove existing virtual environment
print_status "Removing existing virtual environment..."
if [ -d ".venv" ]; then
    rm -rf .venv
fi

# Remove existing lock file
print_status "Removing existing lock file..."
if [ -f "poetry.lock" ]; then
    rm -f poetry.lock
fi

# Install dependencies
print_status "Installing dependencies..."
poetry install --only main --no-root

print_success "✅ PyTorch installation completed!"

# Test the installation
print_status "Testing PyTorch installation..."
poetry run python -c "
import torch
print(f'PyTorch version: {torch.__version__}')
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA version: {torch.version.cuda}')
    print(f'GPU device: {torch.cuda.get_device_name(0)}')
else:
    print('Using CPU')
print(f'Device: {torch.device(\"cuda\" if torch.cuda.is_available() else \"cpu\")}')
"

cd ..

print_success "✅ Smart PyTorch installation completed successfully!"
echo ""
print_status "📋 Installation Summary:"
echo "   System: $OS_TYPE/$ARCH_TYPE"
echo "   GPU: $GPU_TYPE"
echo "   PyTorch: $PYTORCH_VERSION"
echo "   Source: $PYTORCH_SOURCE"
echo ""
print_status "Note: Original pyproject.toml backed up as pyproject.toml.backup"
