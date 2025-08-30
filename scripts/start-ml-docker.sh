#!/bin/bash

# Start ML Shape Detection Service in Docker
# This script builds and runs the ML service container

set -e

echo "🐳 Starting ML Shape Detection Service in Docker..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Stop any existing ML service
echo "Stopping existing ML service..."
docker-compose -f docker-compose.dev.yml down ml-service 2>/dev/null || true

# Build and start the ML service
echo "Building and starting ML service..."
docker-compose -f docker-compose.dev.yml up --build ml-service -d

# Wait for service to be ready
echo "Waiting for ML service to be ready..."
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if curl -s http://localhost:5050/health > /dev/null 2>&1; then
        echo "✅ ML service is ready!"
        break
    fi
    
    echo "⏳ Waiting for ML service... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    echo "❌ ML service failed to start within $timeout seconds"
    echo "📋 Checking logs..."
    docker-compose -f docker-compose.dev.yml logs ml-service
    exit 1
fi

# Test the service
echo "🧪 Testing ML service..."
response=$(curl -s http://localhost:5050/health)
echo "Health check response: $response"

echo "🎉 ML service is running successfully!"
echo "📍 Service available at: http://localhost:5050"
echo "📍 Health endpoint: http://localhost:5050/health"
echo "📍 API docs: http://localhost:5050/docs"

echo ""
echo "🔧 Useful commands:"
echo "  View logs: docker-compose -f docker-compose.dev.yml logs -f ml-service"
echo "  Stop service: docker-compose -f docker-compose.dev.yml down ml-service"
echo "  Restart service: docker-compose -f docker-compose.dev.yml restart ml-service"
