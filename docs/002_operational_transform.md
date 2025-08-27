# Operational Transform (OT) System Documentation

## Overview
This document describes the Operational Transform system implemented for real-time collaborative editing. OT resolves conflicts when multiple users edit simultaneously by transforming operations to maintain consistency.

## Core Concepts

### 1. Operations
Every user action is represented as an `Operation`:

```go
type Operation struct {
    ID              string                 // Unique operation identifier
    Type            string                 // Operation type (stroke_create, stroke_update, etc.)
    RoomID          string                 // Room where operation occurred
    UserID          string                 // User who created operation
    Version         int64                  // Global operation version
    Data            map[string]interface{} // Operation payload
    CreatedAt       time.Time              // When operation was created
    AppliedAt       *time.Time             // When operation was applied
    TransformedFrom []string               // Operations this was transformed against
}
```

### 2. Operation Types
- `stroke_create`: Create a new stroke
- `stroke_update`: Modify existing stroke
- `stroke_delete`: Delete a stroke
- `cursor_move`: Update user cursor position
- `selection`: Change user selection
- `clear_all`: Clear entire canvas

### 3. Transformation Rules

#### Stroke Create vs Stroke Create
```go
// Two users create strokes simultaneously -> Both allowed
transform(create_A, create_B) = create_A // No change needed
```

#### Stroke Update vs Stroke Update (Same Stroke)
```go
// Two users update same stroke -> Later timestamp wins
if stroke_id_A == stroke_id_B && timestamp_A < timestamp_B {
    transform(update_A, update_B) = noop // Discard earlier update
}
```

#### Stroke Delete vs Stroke Update
```go
// Delete vs Update -> Delete always wins
transform(update_A, delete_B) = noop // Discard update
transform(delete_A, update_B) = delete_A // Keep delete
```

## Architecture

### 1. OTEngine Structure
```go
type OTEngine struct {
    server     *Server                    // Reference to main server
    rooms      map[string]*RoomState      // Per-room operational state
    roomsMutex sync.RWMutex              // Thread safety
}

type RoomState struct {
    RoomID         string
    CurrentVersion int64                  // Global version counter
    Operations     []*Operation          // Recent operations (last 100)
    Users          map[string]*UserState // Per-user state
    mutex          sync.RWMutex
}
```

### 2. Operation Processing Flow
```
1. Client sends operation
2. Server creates Operation object
3. OTEngine.ProcessOperation():
   a. Get concurrent operations (version > client_version)
   b. Transform against each concurrent operation
   c. Assign global version number
   d. Persist to database
   e. Update room state
   f. Broadcast to all clients
```

### 3. Conflict Resolution
```go
func (ot *OTEngine) transformOperation(room *RoomState, op *Operation) (*Operation, error) {
    // Get client's last known version
    clientVersion := extractClientVersion(op)
    
    // Get operations that happened after client's version
    concurrentOps := ot.getConcurrentOperations(room, clientVersion)
    
    // Transform against each concurrent operation
    transformedOp := op
    for _, concurrentOp := range concurrentOps {
        transformedOp = ot.transformAgainst(transformedOp, concurrentOp)
    }
    
    return transformedOp, nil
}
```

## Database Integration

### 1. Operations Table
```sql
CREATE TABLE operations (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES rooms(id),
    user_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    operation_data JSONB NOT NULL,
    version BIGINT NOT NULL,           -- Global version for ordering
    transformed_from UUID[],           -- Transformation history
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical index for sync queries
CREATE INDEX idx_operations_room_version ON operations(room_id, version);
```

### 2. Version Management
```go
// Increment room version atomically
func increment_room_version(room_uuid UUID) RETURNS BIGINT AS $$
DECLARE
    new_version BIGINT;
BEGIN
    UPDATE rooms 
    SET current_version = current_version + 1,
        last_activity = NOW()
    WHERE id = room_uuid
    RETURNING current_version INTO new_version;
    
    RETURN new_version;
END;
$$
```

## Client Synchronization

### 1. Operation Sync
Clients periodically sync operations they missed:

```go
// Get operations since client's last known version
func (ot *OTEngine) GetOperationsSince(roomID string, version int64) ([]*Operation, error) {
    rows, err := ot.server.db.Query(`
        SELECT id, operation_type, operation_data, version, user_id, created_at
        FROM operations 
        WHERE room_id = $1 AND version > $2 
        ORDER BY version ASC 
        LIMIT 100`,
        roomID, version,
    )
    // ... parse and return operations
}
```

### 2. Message Protocol
```typescript
// Client sends operation
{
    type: "operation",
    room: "room-123",
    data: {
        operation_type: "stroke_create",
        stroke_data: { points: [...], color: "#000" },
        client_version: 42  // Client's last known version
    }
}

// Server broadcasts transformed operation
{
    type: "operation",
    room: "room-123",
    data: {
        operation: {
            id: "op-456",
            type: "stroke_create", 
            version: 43,        // New global version
            user_id: "user-123",
            data: { ... },
            transformed_from: ["op-455"] // What it was transformed against
        }
    }
}
```

## Performance Optimizations

### 1. Spatial Indexing
Operations that affect strokes include spatial bounding boxes:

```go
// Calculate bounding box for stroke operations
func (s *Server) calculateStrokeBoundingBox(strokeData interface{}) (*BoundingBox, error) {
    // Parse stroke points and calculate min/max bounds
    // Used for spatial index: WHERE bbox && viewport_box
}
```

### 2. Operation History Management
```go
// Keep only recent operations in memory (last 100 per room)
room.Operations = append(room.Operations, transformedOp)
if len(room.Operations) > 100 {
    room.Operations = room.Operations[1:]
}

// Cleanup old operations from database periodically
func (ot *OTEngine) CleanupOldOperations(maxAge time.Duration) error {
    cutoff := time.Now().Add(-maxAge)
    _, err := ot.server.db.Exec(
        "DELETE FROM operations WHERE created_at < $1", cutoff,
    )
}
```

### 3. Batching Operations
For high-frequency operations (like cursor moves), batch multiple operations:

```go
// Process multiple operations in single transaction
func (ot *OTEngine) ProcessOperationBatch(ops []*Operation) ([]*TransformResult, error) {
    tx, err := ot.server.db.Begin()
    defer tx.Rollback()
    
    results := make([]*TransformResult, len(ops))
    for i, op := range ops {
        results[i] = ot.processOperationInTx(tx, op)
    }
    
    return results, tx.Commit()
}
```

## Error Handling

### 1. Transformation Failures
```go
if !result.Success {
    // Send error back to client
    errorMsg := Message{
        Type: "error",
        Data: map[string]interface{}{
            "message": "Operation failed",
            "operation_id": op.ID,
            "error": result.Error,
        },
    }
    client.conn.WriteJSON(errorMsg)
}
```

### 2. Database Conflicts
```go
// Handle database constraint violations
if err != nil && strings.Contains(err.Error(), "duplicate key") {
    // Operation ID collision - regenerate
    op.ID = uuid.New().String()
    return ot.ProcessOperation(op)
}
```

### 3. Client Reconnection
```go
// When client reconnects, sync missed operations
func (s *Server) handleReconnect(client *Client, lastVersion int64) {
    operations, err := s.otEngine.GetOperationsSince(client.room, lastVersion)
    if err != nil {
        log.Printf("Failed to get operations for sync: %v", err)
        return
    }
    
    // Send all missed operations
    for _, op := range operations {
        syncMsg := Message{
            Type: "sync_operation",
            Data: map[string]interface{}{"operation": op},
        }
        client.conn.WriteJSON(syncMsg)
    }
}
```

## Testing Strategy

### 1. Unit Tests
```go
func TestBasicTransformation(t *testing.T) {
    engine := NewOTEngine(mockServer)
    
    // Create two concurrent stroke operations
    op1 := &Operation{Type: OpStrokeCreate, UserID: "user1", Data: {...}}
    op2 := &Operation{Type: OpStrokeCreate, UserID: "user2", Data: {...}}
    
    // Both should succeed without conflict
    result1, err1 := engine.ProcessOperation(op1)
    result2, err2 := engine.ProcessOperation(op2)
    
    assert.NoError(t, err1)
    assert.NoError(t, err2)
    assert.True(t, result1.Success)
    assert.True(t, result2.Success)
}
```

### 2. Integration Tests
```go
func TestConcurrentUpdates(t *testing.T) {
    // Simulate two users editing same stroke simultaneously
    // Verify only one update succeeds (later timestamp wins)
}

func TestNetworkPartition(t *testing.T) {
    // Simulate client disconnect during operation
    // Verify operations are properly queued and synced on reconnect
}
```

### 3. Load Testing
```bash
# Test with 10 concurrent users making 100 operations each
go test -run TestConcurrentLoad -count=1 -v
```

## Monitoring

### 1. Key Metrics
- Operations per second
- Average transformation time
- Database operation latency
- Memory usage (operation history)
- Client sync lag

### 2. Logging
```go
log.Printf("OT: Processed operation %s (type=%s, version=%d, transforms=%d)", 
    op.ID, op.Type, op.Version, len(op.TransformedFrom))
```

### 3. Health Checks
```go
func (ot *OTEngine) HealthCheck() map[string]interface{} {
    ot.roomsMutex.RLock()
    defer ot.roomsMutex.RUnlock()
    
    return map[string]interface{}{
        "active_rooms": len(ot.rooms),
        "total_operations": ot.getTotalOperationCount(),
        "memory_usage_mb": ot.getMemoryUsage(),
    }
}
```

## Next Steps
1. Implement client-side OT reconciliation
2. Add operation batching for performance
3. Implement viewport-based operation filtering
4. Add comprehensive conflict resolution tests
5. Monitor and optimize transformation performance