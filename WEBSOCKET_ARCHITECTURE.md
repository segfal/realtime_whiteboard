# WebSocket Architecture - Real-Time Whiteboard

## Overview

This document explains how the real-time whiteboard collaboration works using WebSockets for point-by-point drawing synchronization.

## Architecture Flow

```
User A draws → Send each point → Server broadcasts → User B sees live drawing
```

## Key Components

### 1. Frontend (React + TypeScript)

**WhiteboardContext.tsx** - Manages WebSocket communication and drawing state

**Critical Functions:**

```typescript
// Send stroke start
const sendStrokeStart = useCallback((point: Point) => {
  const message = {
    type: "stroke:start",
    payload: {
      strokeId: crypto.randomUUID(),
      color: state.settings.color,
      thickness: state.settings.thickness,
      userId: state.userId,
      timestamp: Date.now()
    }
  };
  state.websocket.send(JSON.stringify(message));
}, [state.websocket, state.isConnected, state.settings, state.userId]);

// Send each point as user draws
const sendStrokePoint = useCallback((strokeId: string, point: Point) => {
  const message = {
    type: "stroke:point",
    payload: {
      strokeId: strokeId,
      point: point,
      userId: state.userId,
      timestamp: Date.now()
    }
  };
  state.websocket.send(JSON.stringify(message));
}, [state.websocket, state.isConnected, state.userId]);

// Send stroke finish
const sendStrokeFinish = useCallback((strokeId: string) => {
  const message = {
    type: "stroke:finish",
    payload: {
      strokeId: strokeId,
      userId: state.userId,
      timestamp: Date.now()
    }
  };
  state.websocket.send(JSON.stringify(message));
}, [state.websocket, state.isConnected, state.userId]);
```

**Message Handler:**

```typescript
const handleWebSocketMessage = useCallback((event: MessageEvent) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'stroke:start') {
    // Create new stroke in WASM for preview
    const wasmStroke: WASMStroke = {
      points: [],
      color: message.payload.color,
      thickness: message.payload.thickness
    };
    wasmEngine.addStroke(wasmStroke);
    
  } else if (message.type === 'stroke:point') {
    // Add point to existing stroke
    const strokeIndex = wasmEngine.getStrokes().length - 1;
    wasmEngine.addPointToStroke(strokeIndex, message.payload.point);
    
  } else if (message.type === 'stroke:finish') {
    // Stroke is complete, update display
    dispatch({ type: 'TRIGGER_STROKE_UPDATE' });
  }
}, [wasmEngine]);
```

### 2. Backend (C++ Server)

**main.cpp** - WebSocket server that broadcasts messages

**Critical Code:**

```cpp
.message = [](auto *ws, std::string_view message, uWS::OpCode opCode) {
    json msg = json::parse(message);
    
    if (msg["type"] == "stroke:start") {
        // Broadcast stroke start to all clients
        ws->publish("whiteboard", message, opCode);
        
    } else if (msg["type"] == "stroke:point") {
        // Broadcast point update to all clients
        ws->publish("whiteboard", message, opCode);
        
    } else if (msg["type"] == "stroke:finish") {
        // Broadcast stroke finish to all clients
        ws->publish("whiteboard", message, opCode);
    }
}
```

## Message Types

### 1. `stroke:start`
- **Sent when:** User starts drawing (pointerDown)
- **Contains:** strokeId, color, thickness, userId
- **Purpose:** Initialize new stroke for other users

### 2. `stroke:point`
- **Sent when:** User moves mouse while drawing (pointerMove)
- **Contains:** strokeId, point coordinates, userId
- **Purpose:** Add points to stroke in real-time

### 3. `stroke:finish`
- **Sent when:** User stops drawing (pointerUp)
- **Contains:** strokeId, userId
- **Purpose:** Mark stroke as complete

## Real-Time Flow Example

1. **User A starts drawing:**
   ```
   pointerDown → sendStrokeStart → Server → Broadcast → User B creates stroke
   ```

2. **User A continues drawing:**
   ```
   pointerMove → sendStrokePoint → Server → Broadcast → User B adds point
   ```

3. **User A finishes drawing:**
   ```
   pointerUp → sendStrokeFinish → Server → Broadcast → User B marks complete
   ```

## Key Features

- **Point-by-point synchronization** - Every mouse movement is sent
- **Real-time preview** - Other users see strokes being drawn live
- **User identification** - Each stroke has a unique userId
- **Automatic reconnection** - WebSocket reconnects if connection lost
- **Backward compatibility** - Still supports old `stroke:add` messages

## Testing

1. Open two browser tabs to the whiteboard
2. Draw in one tab
3. Watch the stroke appear in real-time in the other tab
4. Check browser console for message logs
5. Check server console for broadcast logs

## Performance Considerations

- **Network traffic:** Each mouse movement sends a message
- **Optimization:** Could batch points or throttle updates
- **Scalability:** Current design works for 2-5 users
- **Memory:** WASM engine stores all strokes in memory

