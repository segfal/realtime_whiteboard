# WebSocket Server Test Suite

A simple Python test suite to verify the C++ WebSocket server is working correctly.

## Quick Start

### 1. Install Dependencies

```bash
cd websocket-tests
poetry install
```

### 2. Start the WebSocket Server

Make sure the C++ WebSocket server is running:

```bash
# From the project root
cd websocket-server
./build/server
```

You should see:

```
Starting Realtime Whiteboard Server...
Realtime Whiteboard Server listening on ws://localhost:9000
```

### 3. Run the Tests

**Simple way:**

```bash
# From websocket-tests directory
python run_tests.py
```

**Manual way:**

```bash
# From websocket-tests directory
poetry run python tests/test_websocket_server.py
```

## Expected Output

When everything is working correctly, you'll see:

```
🔍 Checking WebSocket Server Availability
✅ Server is running and accepting connections

🚀 Starting WebSocket Server Test Suite
✅ Basic connection established
✅ Initial sync messages received
✅ Chat message handled correctly
✅ Stroke message handled correctly
✅ Server handled invalid message gracefully
✅ Successfully handled 10 concurrent connections
✅ Message broadcasting working correctly
✅ Connection cleanup completed

┌─────────────────────────────────────────────────────────────────────────────┐
│                            WebSocket Server Test Results                    │
├─────────────────────┬─────────┬──────────────┬─────────────────────────────┤
│ Test Name           │ Status  │ Duration (s) │ Details                     │
├─────────────────────┼─────────┼──────────────┼─────────────────────────────┤
│ Basic Connection    │ PASS    │ 0.045        │                             │
│ Initial Sync Msgs   │ PASS    │ 0.123        │ received_messages: 2        │
│ Chat Message        │ PASS    │ 0.067        │ sent: {...}, received: {...} │
│ Stroke Message      │ PASS    │ 0.089        │ sent: {...}, received: {...} │
│ Invalid Message     │ PASS    │ 1.234        │ invalid_sent: "invalid json" │
│ Connection Stress   │ PASS    │ 2.456        │ connections_established: 10  │
│ Message Broadcasting│ PASS    │ 0.345        │ sent: {...}, received: {...} │
│ Connection Cleanup  │ PASS    │ 1.123        │                             │
└─────────────────────┴─────────┴──────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Tests Passed: 8/8 (100.0%)                                                 │
│ Tests Failed: 0/8                                                          │
│ Total Connections Made: 15                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## What the Tests Check

- **Basic Connection**: Can connect to the server
- **Initial Sync**: Server sends board and chat sync messages
- **Chat Messages**: Can send and receive chat messages
- **Stroke Messages**: Can send drawing stroke data
- **Invalid Messages**: Server handles bad JSON gracefully
- **Multiple Connections**: Server can handle 10+ concurrent clients
- **Message Broadcasting**: Messages are sent to all connected clients
- **Connection Cleanup**: Server properly closes connections

## Troubleshooting

### ❌ "Cannot connect to server"

**Problem**: The WebSocket server isn't running.

**Solution**:

```bash
# Start the server
cd websocket-server
./build/server
```

### ❌ "Server not found" or "Connection refused"

**Problem**: Server isn't running on port 9000.

**Solution**:

1. Check if the server is running: `ps aux | grep server`
2. Make sure port 9000 is free: `lsof -i :9000`
3. Restart the server

### ❌ "Tests Failed" with timeout errors

**Problem**: Server is slow or overloaded.

**Solution**:

1. Check server logs for errors
2. Restart the server
3. Try running fewer tests: `poetry run pytest tests/test_websocket_server.py::test_websocket_connection_basic -v`

### ❌ "Import errors" or "Module not found"

**Problem**: Dependencies aren't installed.

**Solution**:

```bash
cd websocket-tests
poetry install
poetry shell
```

### ❌ "Permission denied" when running server

**Problem**: Server binary isn't executable.

**Solution**:

```bash
cd websocket-server
chmod +x build/server
./build/server
```

## Running Individual Tests

If you want to test specific functionality:

```bash
# Test just the connection
poetry run pytest tests/test_websocket_server.py::test_websocket_connection_basic -v

# Test chat messages
poetry run pytest tests/test_websocket_server.py::test_websocket_chat_message -v

# Test stroke messages
poetry run pytest tests/test_websocket_server.py::test_websocket_stroke_message -v
```

## Manual Testing

You can also test manually with `wscat`:

```bash
# Install wscat globally
npm install -g wscat

# Connect to server
wscat -c ws://localhost:9000

# Send a chat message
{"type": "chat:message", "payload": {"user": "test", "message": "Hello!", "timestamp": "2025-08-23T15:57:00Z"}}

# Send a stroke message
{"type": "stroke:add", "payload": {"stroke": {"points": [{"x": 100, "y": 100}], "color": {"r": 1, "g": 0, "b": 0, "a": 1}, "thickness": 2}, "userId": "test", "timestamp": 1234567890}}
```

## Development

### Code Quality

```bash
# Format code
poetry run black .

# Sort imports
poetry run isort .

# Lint code
poetry run flake8 .

# Type checking
poetry run mypy .
```

### Adding New Tests

1. Add a new test method to `WebSocketTestSuite`
2. Add it to the `test_methods` list in `run_all_tests()`
3. Create a corresponding pytest function

Example:

```python
async def test_new_feature(self) -> TestResult:
    """Test new feature"""
    start_time = time.time()
    try:
        # Your test code here
        return TestResult(
            test_name="New Feature",
            status="PASS",
            duration=time.time() - start_time
        )
    except Exception as e:
        return TestResult(
            test_name="New Feature",
            status="FAIL",
            duration=time.time() - start_time,
            error_message=str(e)
        )
```
