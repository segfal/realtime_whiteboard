#!/bin/bash

# 🔍 System Detection Script
# This script detects the user's system architecture and GPU capabilities

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

# Initialize variables
OS_TYPE=""
ARCH_TYPE=""
GPU_TYPE=""
PYTORCH_VERSION=""
PYTORCH_SOURCE=""

print_status "🔍 Detecting System Configuration..."

# Detect Operating System
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    print_success "Operating System: macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS_TYPE="linux"
    print_success "Operating System: Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS_TYPE="windows"
    print_success "Operating System: Windows"
else
    OS_TYPE="unknown"
    print_warning "Operating System: Unknown ($OSTYPE)"
fi

# Detect Architecture
if [[ $(uname -m) == "x86_64" ]]; then
    ARCH_TYPE="x86_64"
    print_success "Architecture: x86_64 (Intel/AMD)"
elif [[ $(uname -m) == "arm64" ]] || [[ $(uname -m) == "aarch64" ]]; then
    ARCH_TYPE="arm64"
    print_success "Architecture: ARM64 (Apple Silicon/M1/M2)"
else
    ARCH_TYPE="unknown"
    print_warning "Architecture: Unknown ($(uname -m))"
fi

# Detect GPU
print_status "Detecting GPU capabilities..."

if [[ "$OS_TYPE" == "macos" ]]; then
    # macOS - Check for Apple Silicon or Intel
    if [[ "$ARCH_TYPE" == "arm64" ]]; then
        GPU_TYPE="apple_silicon"
        print_success "GPU: Apple Silicon (M1/M2/M3) - Using Metal Performance Shaders"
    else
        GPU_TYPE="intel"
        print_success "GPU: Intel Integrated Graphics"
    fi
elif [[ "$OS_TYPE" == "linux" ]]; then
    # Linux - Check for NVIDIA GPU
    if command -v nvidia-smi &> /dev/null; then
        GPU_INFO=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | head -n1)
        if [[ -n "$GPU_INFO" ]]; then
            GPU_TYPE="nvidia"
            print_success "GPU: NVIDIA ($GPU_INFO)"
        else
            GPU_TYPE="cpu"
            print_warning "GPU: No NVIDIA GPU detected, using CPU"
        fi
    else
        GPU_TYPE="cpu"
        print_warning "GPU: No NVIDIA drivers found, using CPU"
    fi
elif [[ "$OS_TYPE" == "windows" ]]; then
    # Windows - Check for NVIDIA GPU
    if command -v nvidia-smi.exe &> /dev/null; then
        GPU_INFO=$(nvidia-smi.exe --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | head -n1)
        if [[ -n "$GPU_INFO" ]]; then
            GPU_TYPE="nvidia"
            print_success "GPU: NVIDIA ($GPU_INFO)"
        else
            GPU_TYPE="cpu"
            print_warning "GPU: No NVIDIA GPU detected, using CPU"
        fi
    else
        GPU_TYPE="cpu"
        print_warning "GPU: No NVIDIA drivers found, using CPU"
    fi
else
    GPU_TYPE="cpu"
    print_warning "GPU: Unknown OS, defaulting to CPU"
fi

# Determine PyTorch configuration
print_status "Determining PyTorch configuration..."

if [[ "$OS_TYPE" == "macos" && "$ARCH_TYPE" == "arm64" ]]; then
    # Apple Silicon Mac
    PYTORCH_VERSION="cpu"
    PYTORCH_SOURCE="default"
    print_success "PyTorch: CPU version (optimized for Apple Silicon)"
elif [[ "$GPU_TYPE" == "nvidia" ]]; then
    # NVIDIA GPU detected
    PYTORCH_VERSION="cuda"
    PYTORCH_SOURCE="torch-cu129"
    print_success "PyTorch: CUDA version (NVIDIA GPU acceleration)"
else
    # CPU-only or other cases
    PYTORCH_VERSION="cpu"
    PYTORCH_SOURCE="default"
    print_success "PyTorch: CPU version"
fi

# Export variables for other scripts
export OS_TYPE
export ARCH_TYPE
export GPU_TYPE
export PYTORCH_VERSION
export PYTORCH_SOURCE

# Create a summary file
cat > .system-config.json << EOF
{
  "os_type": "$OS_TYPE",
  "architecture": "$ARCH_TYPE",
  "gpu_type": "$GPU_TYPE",
  "pytorch_version": "$PYTORCH_VERSION",
  "pytorch_source": "$PYTORCH_SOURCE",
  "detected_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

print_success "✅ System detection completed!"
echo ""
print_status "📋 System Summary:"
echo "   OS: $OS_TYPE"
echo "   Architecture: $ARCH_TYPE"
echo "   GPU: $GPU_TYPE"
echo "   PyTorch: $PYTORCH_VERSION"
echo "   Source: $PYTORCH_SOURCE"
echo ""
print_status "Configuration saved to: .system-config.json"
