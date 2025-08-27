c# Database Architecture Documentation

## Overview
This document describes the UUID-based database architecture designed for high-performance real-time collaborative whiteboarding with support for Operational Transform (OT) conflict resolution.

## Key Design Decisions

### 1. UUID vs SERIAL Primary Keys
**Problem**: SERIAL IDs cause conflicts in distributed systems and don't work well with client-side optimistic updates.

**Solution**: Use UUID v4 for all primary keys.

**Benefits**:
- No ID conflicts between clients
- Enables offline-first architecture
- Supports horizontal database scaling
- Client can generate IDs without server round-trip

### 2. Spatial Indexing with BOX Type
**Problem**: Need to efficiently query strokes visible in user's viewport.

**Solution**: Store bounding box for each stroke and use GiST spatial index.

```sql
-- Each stroke has a bounding box
bbox BOX NOT NULL,

-- Spatial index for O(log n) viewport queries  
CREATE INDEX idx_strokes_spatial USING gist(bbox);
```

**Performance**: Reduces viewport queries from O(n) to O(log n).

### 3. Operational Transform Support
**Problem**: Multiple users editing simultaneously causes conflicts.

**Solution**: Track all operations with version numbers and transformation history.

**Tables**:
- `operations`: Every user action (create, update, delete)
- `rooms.current_version`: Global version counter per room
- `operations.transformed_from`: Tracks OT transformation chain

## Database Schema

### Rooms Table
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    current_version BIGINT DEFAULT 0,  -- For OT
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}'
);
```

**Purpose**: Manage collaborative rooms with version tracking.

### Strokes Table  
```sql
CREATE TABLE strokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    user_id TEXT NOT NULL,
    stroke_data JSONB NOT NULL,
    version BIGINT NOT NULL,           -- Operation version
    operation_type TEXT NOT NULL,      -- create/update/delete
    bbox BOX NOT NULL,                 -- Spatial indexing
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Store stroke data with spatial and temporal indexing.

**Key Features**:
- `bbox`: Enables viewport culling
- `version`: Supports OT conflict resolution  
- `operation_type`: Tracks stroke lifecycle
- `stroke_data`: JSONB for flexible stroke format

### Operations Table
```sql
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    operation_type TEXT NOT NULL,      -- stroke_create, cursor_move, etc.
    operation_data JSONB NOT NULL,     -- Operation payload
    version BIGINT NOT NULL,           -- Global operation version
    transformed_from UUID[],           -- OT transformation history
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purpose**: Enable Operational Transform conflict resolution.

**OT Process**:
1. Client creates operation with local version
2. Server transforms against concurrent operations
3. Server assigns global version and broadcasts
4. All clients apply transformed operation

### User Sessions Table
```sql
CREATE TABLE user_sessions (
    room_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    viewport_bounds BOX,               -- User's visible area
    cursor_position POINT,             -- Real-time cursor
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);
```

**Purpose**: Track active users and their viewport/cursor state.

## Performance Optimizations

### 1. Spatial Queries
```sql
-- Get strokes in viewport (O(log n) with spatial index)
SELECT * FROM strokes 
WHERE room_id = $1 
  AND bbox && box(point($2,$3), point($4,$5));
```

### 2. Version-based Sync
```sql
-- Get operations since client's last version
SELECT * FROM operations 
WHERE room_id = $1 AND version > $2 
ORDER BY version ASC;
```

### 3. Batch Operations
```sql
-- Insert multiple operations atomically
INSERT INTO operations (room_id, operation_type, operation_data, version)
SELECT $1, unnest($2::text[]), unnest($3::jsonb[]), nextval('version_seq');
```

## Query Patterns

### Viewport-based Stroke Loading
```sql
-- Function: get_viewport_strokes(room_id, viewport_box, limit)
SELECT s.id, s.stroke_data, s.version 
FROM strokes s
WHERE s.room_id = $1
  AND s.bbox && $2
  AND s.operation_type != 'delete'
ORDER BY s.created_at ASC
LIMIT $3;
```

### Operation Sync
```sql
-- Get all operations since version X
SELECT id, operation_type, operation_data, version
FROM operations 
WHERE room_id = $1 AND version > $2
ORDER BY version ASC;
```

### Active User Management
```sql
-- Update user activity and viewport
INSERT INTO user_sessions (room_id, user_id, viewport_bounds, last_activity)
VALUES ($1, $2, $3, NOW())
ON CONFLICT (room_id, user_id) 
DO UPDATE SET 
    viewport_bounds = EXCLUDED.viewport_bounds,
    last_activity = NOW();
```

## Migration Strategy

### Development
```bash
# Apply migration
psql -d whiteboard -f migrations/001_uuid_migration.sql

# Verify schema
psql -d whiteboard -c "\dt"
psql -d whiteboard -c "\di"
```

### Production
1. **Backup current data**
2. **Create new schema in separate database**  
3. **Migrate data with UUID conversion**
4. **Switch applications to new database**
5. **Monitor performance metrics**

## Monitoring Queries

### Performance Metrics
```sql
-- Room activity
SELECT name, current_version, last_activity 
FROM rooms 
WHERE last_activity > NOW() - INTERVAL '1 hour';

-- Operation throughput
SELECT 
    room_id,
    COUNT(*) as ops_per_hour,
    AVG(EXTRACT(EPOCH FROM (applied_at - created_at))) as avg_latency_ms
FROM operations 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY room_id;

-- Spatial query performance
EXPLAIN ANALYZE 
SELECT * FROM strokes 
WHERE bbox && box(point(0,0), point(100,100));
```

## Next Steps
1. Apply migration to development database
2. Update Go server to use new schema
3. Implement OT logic in application layer
4. Add monitoring for query performance
5. Test with concurrent users
