#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools and install dependencies
check_requirements() {
    # Check for Homebrew
    if ! command_exists brew; then
        print_message "Error: Homebrew is not installed. Please install it first." "$RED"
        print_message "Visit https://brew.sh for installation instructions." "$YELLOW"
        exit 1
    fi

    # Check for CMake
    if ! command_exists cmake; then
        print_message "Installing CMake..." "$YELLOW"
        brew install cmake
    fi

    # Check for Make
    if ! command_exists make; then
        print_message "Installing Make..." "$YELLOW"
        brew install make
    fi

    # Check for GLFW
    if ! brew list glfw &>/dev/null; then
        print_message "Installing GLFW..." "$YELLOW"
        brew install glfw
    fi

    # Check for OpenGL (should be available on macOS)
    if [ ! -d "/System/Library/Frameworks/OpenGL.framework" ]; then
        print_message "Error: OpenGL framework not found" "$RED"
        exit 1
    fi
}

# Build the project
build_project() {
    print_message "Building project..." "$YELLOW"
    
    # Create build directory if it doesn't exist
    if [ ! -d "build" ]; then
        mkdir build
    fi
    
    cd build || exit 1
    
    # Generate build files
    cmake ..
    if [ $? -ne 0 ]; then
        print_message "Error: CMake configuration failed" "$RED"
        exit 1
    fi
    
    # Build the project
    make
    if [ $? -ne 0 ]; then
        print_message "Error: Build failed" "$RED"
        exit 1
    fi
    
    print_message "Build completed successfully!" "$GREEN"
    cd ..
}

# Run the project
run_project() {
    print_message "Running project..." "$YELLOW"
    if [ -f "build/RealtimeWhiteboard" ]; then
        ./build/RealtimeWhiteboard
    else
        print_message "Error: Executable not found. Build the project first." "$RED"
        exit 1
    fi
}

# Build and run the project
build_and_run() {
    build_project
    if [ $? -eq 0 ]; then
        run_project
    fi
}

# Clean the project
clean_project() {
    print_message "Cleaning project..." "$YELLOW"
    if [ -d "build" ]; then
        rm -rf build
        print_message "Build directory removed" "$GREEN"
    else
        print_message "Build directory does not exist" "$YELLOW"
    fi
}

# Main script
check_requirements

case "$1" in
    "build")
        build_project
        ;;
    "run")
        run_project
        ;;
    "clean")
        clean_project
        ;;
    "rebuild")
        clean_project
        build_project
        ;;
    "br"|"buildrun")
        build_and_run
        ;;
    *)
        echo "Usage: $0 {build|run|clean|rebuild|br}"
        echo "  build   - Build the project"
        echo "  run     - Run the project"
        echo "  clean   - Clean the build directory"
        echo "  rebuild - Clean and rebuild the project"
        echo "  br      - Build and run the project"
        exit 1
        ;;
esac 