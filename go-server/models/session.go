package models

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type UserSession struct {
    UserID       string    `json:"user_id" db:"user_id"`
    RoomID       string    `json:"room_id" db:"room_id"`
    DisplayName  string    `json:"display_name" db:"display_name"`
    JoinedAt     time.Time `json:"joined_at" db:"joined_at"`
    LastSeen     time.Time `json:"last_seen" db:"last_seen"`
    IsAdmin      bool      `json:"is_admin" db:"is_admin"`
    ConnectionID string    `json:"connection_id" db:"connection_id"`
}

// GetSession retrieves a user session from Redis. Returns nil if not found.
func (sm *SessionManager) GetSession(userID string) *UserSession {
	sessionKey := fmt.Sprintf("session:%s", userID)
	sessionData, err := sm.redis.HGetAll(context.Background(), sessionKey).Result()
	if err != nil || len(sessionData) == 0 {
		return nil
	}

	isAdmin, _ := strconv.ParseBool(sessionData["is_admin"])
	lastSeen, _ := strconv.ParseInt(sessionData["last_seen"], 10, 64)

	return &UserSession{
		UserID:       userID,
		RoomID:       sessionData["room_id"],
		DisplayName:  sessionData["display_name"],
		ConnectionID: sessionData["connection_id"],
		IsAdmin:      isAdmin,
		LastSeen:     time.Unix(lastSeen, 0),
	}
}

type SessionManager struct {
    db    *sql.DB
    redis *redis.Client
}

func NewSessionManager(db *sql.DB, redis *redis.Client) *SessionManager {
    return &SessionManager{
        db:    db,
        redis: redis,
    }
}

// Create new user session
func (sm *SessionManager) CreateSession(userID, roomID, displayName, connectionID string, isAdmin bool) error {
    query := `
        INSERT INTO user_sessions (user_id, room_id, display_name, connection_id, is_admin)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
            last_seen = CURRENT_TIMESTAMP,
            connection_id = $4
    `
    
    _, err := sm.db.Exec(query, userID, roomID, displayName, connectionID, isAdmin)
    if err != nil {
        return err
    }
    
    // Store in Redis for fast access
    sessionKey := fmt.Sprintf("session:%s", userID)
    sessionData := map[string]interface{}{
        "room_id":       roomID,
        "display_name":  displayName,
        "connection_id": connectionID,
        "is_admin":      isAdmin,
        "last_seen":     time.Now().Unix(),
    }
    
    return sm.redis.HMSet(context.Background(), sessionKey, sessionData).Err()
}

// Update last seen timestamp
func (sm *SessionManager) UpdateLastSeen(userID string) error {
    // Update PostgreSQL
    query := `UPDATE user_sessions SET last_seen = CURRENT_TIMESTAMP WHERE user_id = $1`
    _, err := sm.db.Exec(query, userID)
    if err != nil {
        return err
    }
    
    // Update Redis
    sessionKey := fmt.Sprintf("session:%s", userID)
    return sm.redis.HSet(context.Background(), sessionKey, "last_seen", time.Now().Unix()).Err()
}

// Remove user session
func (sm *SessionManager) RemoveSession(userID string) error {
    // Remove from PostgreSQL
    query := `DELETE FROM user_sessions WHERE user_id = $1`
    _, err := sm.db.Exec(query, userID)
    if err != nil {
        return err
    }
    
    // Remove from Redis
    sessionKey := fmt.Sprintf("session:%s", userID)
    return sm.redis.Del(context.Background(), sessionKey).Err()
}