CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE strokes (
    id SERIAL PRIMARY KEY,
    room_id INTEGER REFERENCES rooms(id),
    user_name VARCHAR(50) NOT NULL,
    stroke_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test room
INSERT INTO rooms (name) VALUES ('hackathon-room');

