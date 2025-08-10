# WebSocket Testing Examples

This folder contains test clients to validate the C++ WebSocket server functionality.

## Files:

1. **html_client.html** - Web browser client for manual testing
2. **cpp_client.cpp** - C++ client for automated testing  
3. **test_data.json** - Sample stroke data for testing
4. **Makefile** - Build script for C++ client

## Usage:

### Start the C++ Server:
```bash
cd ../backend/cpp_server
make
./server
```

### Test with HTML Client:
1. Open `html_client.html` in a web browser
2. Click "Connect" to connect to ws://localhost:9000
3. Click "Send Test Stroke" to send sample drawing data
4. Check server console for received messages

### Test with C++ Client:
```bash
cd example
make
./cpp_client
```

## Test Scenarios:
- Basic connection establishment
- Sending stroke data with points
- Sending chat messages
- Testing room joining/leaving
- Stress testing with multiple strokes
