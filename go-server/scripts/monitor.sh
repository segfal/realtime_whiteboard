#!/bin/bash

# Colors for better visibility
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to start the server
start_server() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] Starting server...${NC}"
    go run main.go &
    SERVER_PID=$!
    echo $SERVER_PID > .server.pid
    echo -e "${GREEN}Server started with PID: $SERVER_PID${NC}"
}

# Function to stop the server
stop_server() {
    if [ -f .server.pid ]; then
        pid=$(cat .server.pid)
        echo -e "${YELLOW}Stopping server (PID: $pid)...${NC}"
        kill $pid 2>/dev/null
        rm .server.pid
    fi
}

# Function to restart the server
restart_server() {
    local file=$1
    echo -e "${BLUE}File changed: $file${NC}"
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] Restarting server...${NC}"
    stop_server
    sleep 1  # Give the server time to shut down cleanly
    start_server
}

# Cleanup on script exit
cleanup() {
    echo -e "\n${RED}Shutting down...${NC}"
    stop_server
    exit 0
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

# Move to the go-server directory
cd "$(dirname "$0")/.."

echo -e "${GREEN}Starting Go server monitor...${NC}"
echo -e "${BLUE}Watching for changes in: *.go, go.mod, go.sum${NC}"

# Start server initially
start_server

# Install fswatch if not available
if ! command -v fswatch >/dev/null 2>&1; then
    echo -e "${YELLOW}fswatch not found. Installing...${NC}"
    brew install fswatch
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install fswatch. Please install it manually:${NC}"
        echo "brew install fswatch"
        cleanup
    fi
fi

# Watch for file changes
echo -e "${GREEN}Monitoring for changes...${NC}"
fswatch -o . | while read file; do
    # Check if the file is a Go file or Go-related file
    if [[ $file =~ \.(go|mod|sum)$ ]] || [[ $file =~ ^go\. ]]; then
        restart_server "$file"
    fi
done