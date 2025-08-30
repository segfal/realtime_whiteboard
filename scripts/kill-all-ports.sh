#!/bin/bash

# Kill all development server processes
echo "🧹 Cleaning up all development server processes..."

# Kill processes by port
echo "Killing port 8080 (Go server)..."
lsof -ti:8080 | xargs kill -9 2>/dev/null

echo "Killing ports 5173-5175 (Vite frontend)..."
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
lsof -ti:5175 | xargs kill -9 2>/dev/null

echo "Killing port 5050 (Python ML API)..."
lsof -ti:5050 | xargs kill -9 2>/dev/null

# Stop Docker containers if running
echo "Stopping Docker containers..."
docker-compose -f docker-compose.dev.yml down ml-service 2>/dev/null || true
docker-compose down ml-service 2>/dev/null || true

# Kill processes by name
echo "Killing Go processes..."
pkill -f "go run" 2>/dev/null

echo "Killing npm processes..."
pkill -f "npm run dev" 2>/dev/null

echo "Killing Python processes..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "python.*detection_service" 2>/dev/null

echo "✅ All development server processes killed!"
echo ""
echo "Now you can restart servers with:"
echo "  • Go server: cd go-server && go run main.go"
echo "  • Frontend: cd frontend && npm run dev"
echo "  • ML API: cd ml_shapes && python api/detection_service.py"
