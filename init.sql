-- Drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS canvas_states CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS strokes CASCADE; -- This is from your old schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE rooms (
    room_id VARCHAR(50) PRIMARY KEY,
    admin_user_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    max_users INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    canvas_s3_key VARCHAR(255),
    room_settings JSONB DEFAULT '{}'::jsonb
);

-- User sessions table
CREATE TABLE user_sessions (
    user_id VARCHAR(50) PRIMARY KEY,
    room_id VARCHAR(50) REFERENCES rooms(room_id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT false,
    connection_id VARCHAR(100)
);

-- Canvas states table
CREATE TABLE canvas_states (
    id VARCHAR(100) PRIMARY KEY,
    room_id VARCHAR(50) REFERENCES rooms(room_id) ON DELETE CASCADE,
    canvas_data JSONB NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    s3_key VARCHAR(255),
    saved_by VARCHAR(50)
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id VARCHAR(50) REFERENCES rooms(room_id) ON DELETE CASCADE,
    user_id VARCHAR(50) REFERENCES user_sessions(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message_type VARCHAR(20) DEFAULT 'text'
);

-- Indexes for performance
CREATE INDEX idx_rooms_last_activity ON rooms(last_activity);
CREATE INDEX idx_user_sessions_room_id ON user_sessions(room_id);
CREATE INDEX idx_canvas_states_room_id ON canvas_states(room_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);