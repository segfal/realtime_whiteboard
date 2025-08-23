#!/bin/bash

# Realtime Whiteboard C++ Server Test Script
# Tests basic server functionality

echo "🧪 Testing C++ Whiteboard Server..."

# Check if server executable exists
if [[ ! -f "build/server" ]]; then
    echo "❌ Server executable not found. Run ./build.sh first."
    exit 1
fi

echo "📡 Starting server in background..."
cd build
./server &
SERVER_PID=$!
cd ..

# Give server time to start
sleep 2

# Test basic connection
echo "🔗 Testing WebSocket connection..."
if command -v wscat &> /dev/null; then
    echo '{"type":"stroke:add","payload":{"stroke":{"points":[{"x":100,"y":100}],"color":"rgb(255,0,0)","width":2}}}' | timeout 3 wscat -c ws://localhost:9000 -w 1 > /dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        echo "✅ WebSocket connection successful!"
        echo "✅ Server is responding to messages!"
    else
        echo "❌ WebSocket connection failed"
    fi
else
    echo "⚠️  wscat not found. Install with: npm install -g wscat"
    echo "🔍 Checking if server is listening on port 9000..."
    
    if lsof -i :9000 > /dev/null 2>&1; then
        echo "✅ Server is listening on port 9000!"
    else
        echo "❌ Server is not listening on port 9000"
    fi
fi

# Clean up
echo "🧹 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "🎯 Test complete!"
echo "   If successful, your server is ready for frontend integration."
echo ""
