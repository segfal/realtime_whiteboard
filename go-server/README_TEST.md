# Go WebSocket Server Testing

This directory contains the Go WebSocket server and testing tools for the realtime whiteboard hackathon.

## 🐳 Prerequisites

Make sure you have the databases running in Docker:

```bash
cd ..  # Go to project root
docker-compose up -d postgres redis
```

## 🚀 Running the Go Server

```bash
./whiteboard-server
```

You should see:

```
Connected to PostgreSQL
Connected to Redis
Server starting on :8080
```

## 🧪 Testing

### 1. Python Test (Comprehensive)

Tests WebSocket functionality AND verifies database persistence:

```bash
poetry run python test_websocket.py
```

This test will:

- ✅ Check if Docker services are running
- ✅ Test WebSocket connection
- ✅ Send test strokes and clear commands
- ✅ Verify data is saved to PostgreSQL
- ✅ Verify Redis is working for real-time broadcasting

### 2. HTML Test Client (Interactive)

Open `test_client.html` in your browser:

- Connect to WebSocket
- Join room
- Draw on canvas
- Send test strokes
- Clear canvas

### 3. Manual Testing

You can also test manually with curl:

```bash
# Test WebSocket upgrade
curl -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
     http://localhost:8080/ws
```

## 🗄️ Database Verification

The Python test will automatically verify:

### PostgreSQL

- Connection to database
- Room creation and lookup
- Stroke persistence
- Recent stroke data

### Redis

- Connection to Redis
- Pub/Sub functionality
- Key storage

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Check if Docker services are running
docker-compose ps

# Restart services if needed
docker-compose restart postgres redis
```

### Go Server Issues

```bash
# Rebuild the server
go build -o whiteboard-server main.go

# Check for errors
./whiteboard-server
```

### Python Test Issues

```bash
# Install dependencies
poetry install

# Run test
poetry run python test_websocket.py
```

## 📊 Expected Output

When everything is working, you should see:

```
🧪 Testing Go WebSocket Server with Database Verification...
============================================================
🐳 Checking Docker services...
✅ Docker services found:
   realtime_whiteboard-postgres-1   postgres:15   Up 6 minutes   0.0.0.0:5432->5432/tcp
   realtime_whiteboard-redis-1      redis:7-alpine   Up 6 minutes   0.0.0.0:6379->6379/tcp

============================================================
📋 PREREQUISITES REMINDER:
   🐳 PostgreSQL and Redis are running in Docker containers
   🐳 Start them with: cd .. && docker-compose up -d
   🐳 Go server should be running: ./whiteboard-server
============================================================

🌐 Testing WebSocket functionality...
✅ Connected to WebSocket server
📤 Sent join message
📥 Received: {'type': 'joined', 'username': 'SwiftDragon123', 'data': []}
✅ Successfully joined room!
👤 Assigned username: SwiftDragon123
📤 Sent test stroke
📤 Sent clear message
✅ WebSocket tests completed successfully!

============================================================
🗄️  Testing Database Persistence...

🐘 Testing PostgreSQL connection...
✅ Found 1 room(s) named 'hackathon-room'
✅ Found 1 stroke(s) in 'hackathon-room'
📊 Recent strokes:
   👤 SwiftDragon123: 3 points, #ff0000, thickness 3 at 2025-08-25 17:46:15

🔴 Testing Redis connection...
✅ Redis connection successful
✅ Redis info: 7.0.15 version, 1 clients
✅ Redis has 0 keys

============================================================
🎉 ALL TESTS PASSED! Your Go server is working with databases!
============================================================
```
