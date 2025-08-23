#!/bin/bash

# Development script - starts all components

set -e

echo "🚀 Starting development environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping all services..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup INT TERM

# Start WebSocket server with Docker
echo "Starting WebSocket server..."
cd websocket-server
if [ -f "build/server" ]; then
    echo "Using local build..."
    ./build/server &
    SERVER_PID=$!
else
    echo "Using Docker..."
    docker-compose -f ../docker-compose.yml up websocket-server -d
    SERVER_PID=$(docker-compose -f ../docker-compose.yml ps -q websocket-server)
fi
cd ..

# Wait a moment for server to start
sleep 2

# Start frontend dev server
echo "Starting frontend dev server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ Development environment started!"
echo "WebSocket server PID: $SERVER_PID"
echo "Frontend dev server PID: $FRONTEND_PID"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 WebSocket: ws://localhost:9000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
