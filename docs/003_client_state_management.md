# Client-Side State Management with Operational Transform

## Overview
This document describes the client-side state management system built with Redux Toolkit, designed to handle real-time collaboration with Operational Transform conflict resolution.

## Architecture

### 1. State Structure
```typescript
interface WhiteboardState {
  // Canvas state
  strokes: Record<string, Stroke>;           // All visible strokes
  
  // OT state
  currentVersion: number;                    // Last known server version
  pendingOperations: Operation[];            // Operations waiting for server confirmation
  operationHistory: Operation[];             // Recent operations for debugging
  
  // User state
  users: Record<string, UserState>;         // Active users in room
  currentUserId: string;                     // Current user ID
  
  // Connection state
  isConnected: boolean;                      // WebSocket connection status
  roomId: string;                           // Current room ID
  lastSyncVersion: number;                  // Last successful sync version
  
  // Viewport state (for optimization)
  viewport: BoundingBox;                    // Visible area
  canvasSize: { width: number; height: number };
}
```

### 2. Operation Flow
```
1. User draws stroke
2. Optimistic update (immediate UI feedback)
3. Create Operation object
4. Add to pendingOperations
5. Send to server via WebSocket
6. Server transforms and responds
7. Remove from pendingOperations
8. Apply server's transformed operation
```

## Core Components

### 1. WhiteboardSlice (Redux Toolkit)
```typescript
const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    // Optimistic operation application
    applyOperationOptimistic: (state, action) => {
      const operation = action.payload;
      state = applyOperationToState(state, operation);
    },
    
    // Server operation received
    receiveServerOperation: (state, action) => {
      const serverOp = action.payload;
      
      // Check if this is our operation
      const pendingIndex = state.pendingOperations.findIndex(
        op => op.id === serverOp.id
      );
      
      if (pendingIndex >= 0) {
        // Our operation confirmed - remove from pending
        state.pendingOperations.splice(pendingIndex, 1);
      } else {
        // Remote operation - transform and apply
        let transformedOp = serverOp;
        for (const pendingOp of state.pendingOperations) {
          transformedOp = transformOperation(transformedOp, pendingOp);
        }
        state = applyOperationToState(state, transformedOp);
      }
    },
  },
});
```

### 2. WebSocket Middleware
Handles all WebSocket communication with automatic reconnection and message queuing:

```typescript
export const websocketMiddleware: Middleware = (api) => (next) => (action) => {
  switch (action.type) {
    case WEBSOCKET_CONNECT:
      // Establish WebSocket connection
      // Handle reconnection logic
      // Start heartbeat
      break;
      
    case sendOperation.fulfilled.type:
      // Send operation to server when Redux operation completes
      const operationMessage = {
        type: 'operation',
        room: getState().whiteboard.roomId,
        data: action.meta.arg,
      };
      websocket.send(JSON.stringify(operationMessage));
      break;
  }
};
```

### 3. Operational Transform Logic
Client-side transformation rules for conflict resolution:

```typescript
function transformOperation(op1: Operation, op2: Operation): Operation {
  switch (op1.type) {
    case 'stroke_create':
      // Stroke creations never conflict
      return op1;
      
    case 'stroke_update':
      if (op2.type === 'stroke_delete' && 
          op1.data.stroke_id === op2.data.stroke_id) {
        // Update after delete = convert to noop
        return { ...op1, type: 'noop' };
      }
      return op1;
      
    case 'stroke_delete':
      // Deletes always win
      return op1;
  }
}
```

## Key Features

### 1. Optimistic Updates
Operations are applied immediately to the UI for responsive feedback:

```typescript
const createStroke = useCallback(async (strokeData) => {
  // Create operation
  const operation = {
    id: generateOperationId(),
    type: 'stroke_create',
    data: { stroke_data: strokeData },
    // ...
  };
  
  // Apply immediately (optimistic)
  dispatch(whiteboardActions.applyOperationOptimistic(operation));
  
  // Send to server
  dispatch(sendOperation({ type: 'stroke_create', data: strokeData }));
}, [dispatch]);
```

### 2. Conflict Resolution
When the server responds with a transformed operation:

```typescript
receiveServerOperation: (state, action) => {
  const serverOp = action.payload;
  
  if (isOurOperation(serverOp)) {
    // Our operation was accepted - just update version
    removeFromPending(serverOp.id);
  } else {
    // Remote operation - transform against our pending operations
    let transformedOp = serverOp;
    for (const pendingOp of state.pendingOperations) {
      transformedOp = transformOperation(transformedOp, pendingOp);
    }
    applyTransformedOperation(transformedOp);
  }
}
```

### 3. Viewport Culling
Only render strokes visible in the current viewport:

```typescript
export const selectVisibleStrokes = (state) => {
  const { strokes, viewport } = state.whiteboard;
  const visibleStrokes = {};
  
  Object.entries(strokes).forEach(([id, stroke]) => {
    if (isStrokeInViewport(stroke, viewport)) {
      visibleStrokes[id] = stroke;
    }
  });
  
  return visibleStrokes;
};
```

### 4. Automatic Reconnection
WebSocket middleware handles connection failures:

```typescript
function attemptReconnect(dispatch, url, roomId, userId) {
  let attempts = 0;
  const maxAttempts = 10;
  
  const reconnectInterval = setInterval(() => {
    attempts++;
    const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
    
    if (attempts >= maxAttempts) {
      dispatch(setError('Connection lost. Please refresh.'));
      return;
    }
    
    dispatch(websocketConnect(url, roomId, userId));
  }, 5000);
}
```

## Usage in Components

### 1. Basic Hook Usage
```typescript
const MyCanvas = () => {
  const { createStroke, isConnected } = useOperationalTransform();
  const visibleStrokes = useAppSelector(selectVisibleStrokes);
  
  const handleDraw = useCallback((strokeData) => {
    if (!isConnected) return;
    createStroke(strokeData);
  }, [createStroke, isConnected]);
  
  return (
    <canvas onPointerMove={handleDraw}>
      {Object.values(visibleStrokes).map(stroke => 
        <StrokeComponent key={stroke.id} stroke={stroke} />
      )}
    </canvas>
  );
};
```

### 2. Connection Management
```typescript
const WhiteboardApp = () => {
  const dispatch = useAppDispatch();
  const { isConnected } = useAppSelector(selectConnectionState);
  
  useEffect(() => {
    // Connect to WebSocket
    dispatch(websocketConnect('ws://localhost:8080/ws', 'room123', 'user456'));
    
    return () => {
      dispatch(websocketDisconnect());
    };
  }, [dispatch]);
  
  if (!isConnected) {
    return <div>Connecting...</div>;
  }
  
  return <Canvas />;
};
```

### 3. Error Handling
```typescript
const ErrorBoundary = () => {
  const { error, pendingOperationsCount } = useAppSelector(state => ({
    error: state.whiteboard.error,
    pendingOperationsCount: state.whiteboard.pendingOperations.length,
  }));
  
  if (error) {
    return <div className="error">Error: {error}</div>;
  }
  
  if (pendingOperationsCount > 10) {
    return <div className="warning">Synchronizing... ({pendingOperationsCount} pending)</div>;
  }
  
  return null;
};
```

## Performance Optimizations

### 1. Memoized Selectors
```typescript
const selectVisibleStrokes = createSelector(
  [(state) => state.whiteboard.strokes, (state) => state.whiteboard.viewport],
  (strokes, viewport) => {
    return Object.values(strokes).filter(stroke => 
      isStrokeInViewport(stroke, viewport)
    );
  }
);
```

### 2. Operation Batching
```typescript
const batchOperations = useCallback(async (operations) => {
  // Group operations by type for efficiency
  const batches = groupOperationsByType(operations);
  
  for (const batch of batches) {
    await dispatch(sendOperationBatch(batch));
  }
}, [dispatch]);
```

### 3. Memory Management
```typescript
// Cleanup old operations periodically
useEffect(() => {
  const cleanup = setInterval(() => {
    dispatch(whiteboardActions.cleanupOldOperations());
  }, 60000); // Every minute
  
  return () => clearInterval(cleanup);
}, [dispatch]);
```

## Testing Strategy

### 1. Unit Tests
```typescript
describe('whiteboardSlice', () => {
  test('should handle optimistic stroke creation', () => {
    const initialState = { strokes: {}, pendingOperations: [] };
    const operation = createMockStrokeOperation();
    
    const newState = whiteboardReducer(
      initialState, 
      whiteboardActions.applyOperationOptimistic(operation)
    );
    
    expect(newState.strokes).toHaveProperty(operation.id);
    expect(newState.pendingOperations).toContain(operation);
  });
});
```

### 2. Integration Tests
```typescript
describe('OT conflict resolution', () => {
  test('should resolve concurrent stroke updates', async () => {
    const store = createTestStore();
    
    // User A updates stroke
    store.dispatch(updateStroke('stroke1', { color: 'red' }));
    
    // User B deletes stroke (simulated server response)
    store.dispatch(receiveServerOperation({
      type: 'stroke_delete',
      data: { stroke_id: 'stroke1' }
    }));
    
    const finalState = store.getState();
    expect(finalState.whiteboard.strokes['stroke1']).toBeUndefined();
  });
});
```

### 3. WebSocket Tests
```typescript
describe('WebSocket middleware', () => {
  test('should reconnect on connection loss', () => {
    const mockWebSocket = createMockWebSocket();
    
    // Simulate connection loss
    mockWebSocket.close({ code: 1006 });
    
    // Should attempt reconnection
    expect(mockWebSocket.connect).toHaveBeenCalledWith(reconnectUrl);
  });
});
```

## Monitoring and Debugging

### 1. Redux DevTools
The store is configured with Redux DevTools for debugging:

```typescript
export const store = configureStore({
  reducer: { whiteboard: whiteboardReducer },
  devTools: process.env.NODE_ENV !== 'production',
});
```

### 2. Operation Logging
```typescript
const logOperation = (operation: Operation, type: 'sent' | 'received' | 'applied') => {
  console.log(`OT [${type}]:`, {
    id: operation.id,
    type: operation.type,
    version: operation.version,
    userId: operation.userId,
    pendingCount: store.getState().whiteboard.pendingOperations.length,
  });
};
```

### 3. Performance Metrics
```typescript
const usePerformanceMetrics = () => {
  const pendingOps = useAppSelector(state => state.whiteboard.pendingOperations);
  const strokes = useAppSelector(state => state.whiteboard.strokes);
  
  return {
    pendingOperationsCount: pendingOps.length,
    totalStrokes: Object.keys(strokes).length,
    avgOperationAge: calculateAvgOperationAge(pendingOps),
  };
};
```

## Next Steps
1. Add operation compression for better network performance
2. Implement offline support with operation queuing
3. Add undo/redo functionality with OT support
4. Implement collaborative cursors and selections
5. Add conflict resolution UI for complex conflicts