# Scripts Directory

This directory contains utility scripts for the Realtime Whiteboard project.

## Scripts Overview

### `cleanup.sh`
Removes all debug and test files from the project.
- **Usage**: `./scripts/cleanup.sh` or `make clean`
- **What it removes**: Debug files, test files, debug logs, test results, debug symbols, and test documentation

### `dev.sh`
Builds the backend and starts the frontend development server.
- **Usage**: `./scripts/dev.sh` or `make dev`
- **What it does**: 
  1. Builds the C++ backend to WebAssembly
  2. Starts the frontend development server

### `debug.sh`
Builds the backend and starts the frontend with debugging enabled.
- **Usage**: `./scripts/debug.sh` or `make debug-frontend`
- **What it does**:
  1. Builds the C++ backend to WebAssembly
  2. Starts the frontend with debugging enabled
  3. Automatically launches Chrome if available

### `setup.sh`
Initial project setup script.
- **Usage**: `./scripts/setup.sh` or `make setup`
- **What it does**:
  1. Checks system requirements (Node.js, npm, Emscripten, g++)
  2. Installs frontend dependencies
  3. Builds the backend
  4. Shows project status

## Makefile Targets

The main Makefile in the root directory provides many convenient targets:

### Development
- `make dev` - Build backend and start frontend development server
- `make dev-debug` - Build backend and start frontend with debugging
- `make dev-full` - Build backend and start frontend with full debugging (includes Chrome launch)

### Building
- `make build-backend` - Build C++ backend to WebAssembly
- `make build-backend-native` - Build C++ backend for native testing
- `make build-backend-all` - Build both WebAssembly and native versions
- `make build-frontend` - Build frontend for production

### Setup
- `make setup` - Initial project setup (install dependencies and build)
- `make install-frontend` - Install frontend dependencies

### Testing
- `make test` - Run all tests
- `make test-backend` - Run backend tests
- `make test-frontend` - Run frontend linting

### Cleaning
- `make clean` - Remove all debug and test files
- `make clean-frontend` - Clean frontend build artifacts and node_modules
- `make clean-backend` - Clean backend build artifacts
- `make full-clean` - Complete cleanup of all files

### Utilities
- `make status` - Show project status
- `make logs` - View debug logs
- `make restart` - Clean and restart development environment
- `make restart-debug` - Clean and restart with debugging

## Quick Start

1. **First time setup**:
   ```bash
   make setup
   ```

2. **Start development**:
   ```bash
   make dev
   ```

3. **Start with debugging**:
   ```bash
   make debug-frontend
   ```

4. **Clean up**:
   ```bash
   make clean
   ```

5. **See all available commands**:
   ```bash
   make help
   ```

## System Requirements

- **Node.js** and **npm** - For frontend development
- **Emscripten** - For WebAssembly builds (optional, but recommended)
- **g++** - For native builds (optional, but recommended)
- **Chrome** - For debugging (optional, but recommended)

## Troubleshooting

### Common Issues

1. **"Emscripten not found"**:
   - Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html

2. **"g++ not found"**:
   - macOS: `xcode-select --install`
   - Ubuntu: `sudo apt-get install build-essential`

3. **"Chrome not found"**:
   - Install Google Chrome for debugging features

4. **Permission denied**:
   - Make scripts executable: `chmod +x scripts/*.sh`

### Getting Help

- Run `make help` to see all available commands
- Run `make status` to check project status
- Check the main project README for more information 