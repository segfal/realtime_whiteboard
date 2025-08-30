#!/bin/bash

# Docker Cleanup Script for RealTime Whiteboard
# This script removes containers and images to force a fresh rebuild

echo "🧹 Starting Docker cleanup for RealTime Whiteboard..."

# Stop all running containers for this project
echo "⏹️  Stopping containers..."
docker-compose down

# Remove containers (including volumes)
echo "🗑️  Removing containers and volumes..."
docker-compose down -v

# Remove the websocket-server image if it exists
echo "🖼️  Removing websocket-server image..."
docker image rm realtime_whiteboard-websocket-server 2>/dev/null || echo "   Image not found (this is okay)"

# Remove any dangling images related to this project
echo "🧽 Removing dangling images..."
docker image prune -f

# Optional: Remove all unused images (uncomment if needed)
# echo "🔄 Removing unused images..."
# docker image prune -a -f

echo "✅ Docker cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run: docker-compose build --no-cache"
echo "   2. Run: docker-compose up -d"
echo ""
