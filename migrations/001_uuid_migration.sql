-- Migration 001: UUID-based Schema for Distributed Real-time Collaboration
-- This migration replaces SERIAL IDs with UUIDs for better distributed system support
-- and adds necessary indexes for high-performance real-time operations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Drop old tables (backup data first in production!)
DROP TABLE IF EXISTS strokes CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Create new UUID-based rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    current_version BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    max_users INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}',
    
    -- Performance indexes
    CONSTRAINT rooms_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

-- Create strokes table with spatial indexing and versioning
CREATE TABLE strokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    stroke_data JSONB NOT NULL,
    version BIGINT NOT NULL,
    operation_type TEXT NOT NULL DEFAULT 'create',
    -- Bounding box for spatial queries (x1,y1,x2,y2)
    bbox BOX NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT strokes_user_id_length CHECK (char_length(user_id) BETWEEN 1 AND 50),
    CONSTRAINT strokes_operation_type_valid CHECK (operation_type IN ('create', 'update', 'delete')),
    CONSTRAINT strokes_version_positive CHECK (version > 0)
);

-- Operations table for Operational Transform
CREATE TABLE operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    target_id UUID, -- ID of the stroke being operated on
    operation_data JSONB NOT NULL,
    version BIGINT NOT NULL,
    transformed_from UUID[], -- Array of operation IDs this was transformed from
    created_at TIMESTAMPTZ DEFAULT NOW(),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT ops_operation_type_valid CHECK (
        operation_type IN ('stroke_create', 'stroke_update', 'stroke_delete', 'cursor_move', 'selection')
    )
);

-- User sessions for tracking active connections
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    viewport_bounds BOX,
    cursor_position POINT,
    
    PRIMARY KEY (room_id, user_id),
    CONSTRAINT sessions_user_id_length CHECK (char_length(user_id) BETWEEN 1 AND 50)
);

-- Performance Indexes

-- Room queries
CREATE INDEX idx_rooms_active ON rooms(is_active, last_activity);
CREATE INDEX idx_rooms_name_trgm ON rooms USING gin(name gin_trgm_ops);

-- Stroke queries (critical for real-time performance)
CREATE INDEX idx_strokes_room_version ON strokes(room_id, version);
CREATE INDEX idx_strokes_room_created ON strokes(room_id, created_at);
CREATE INDEX idx_strokes_spatial USING gist(bbox);
CREATE INDEX idx_strokes_user ON strokes(room_id, user_id);

-- Operation queries for OT
CREATE INDEX idx_operations_room_version ON operations(room_id, version);
CREATE INDEX idx_operations_room_created ON operations(room_id, created_at);
CREATE INDEX idx_operations_target ON operations(target_id, created_at);

-- Session queries
CREATE INDEX idx_sessions_active ON user_sessions(room_id, is_active, last_activity);
CREATE INDEX idx_sessions_user ON user_sessions(user_id, is_active);

-- Functions for version management
CREATE OR REPLACE FUNCTION increment_room_version(room_uuid UUID)
RETURNS BIGINT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to get strokes within viewport
CREATE OR REPLACE FUNCTION get_viewport_strokes(
    room_uuid UUID,
    viewport_box BOX,
    limit_count INTEGER DEFAULT 1000
)
RETURNS TABLE(
    stroke_id UUID,
    stroke_data JSONB,
    version BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.stroke_data, s.version, s.created_at
    FROM strokes s
    WHERE s.room_id = room_uuid
      AND s.bbox && viewport_box  -- Spatial intersection
      AND s.operation_type != 'delete'
    ORDER BY s.created_at ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function for cleaning up old operations (OT history)
CREATE OR REPLACE FUNCTION cleanup_old_operations(
    retention_hours INTEGER DEFAULT 24
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM operations 
    WHERE created_at < NOW() - INTERVAL '1 hour' * retention_hours;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create default room for testing
INSERT INTO rooms (name) VALUES ('hackathon-room');

-- Create indexes for trigram search (room names)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMIT;