package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type Room struct {
	RoomID       string                 `json:"room_id" db:"room_id"`
	AdminUserID  string                 `json:"admin_user_id" db:"admin_user_id"`
	CreatedAt    time.Time              `json:"created_at" db:"created_at"`
	LastActivity time.Time              `json:"last_activity" db:"last_activity"`
	MaxUsers     int                    `json:"max_users" db:"max_users"`
	IsActive     bool                   `json:"is_active" db:"is_active"`
	CanvasS3Key  string                 `json:"canvas_s3_key" db:"canvas_s3_key"`
	RoomSettings map[string]interface{} `json:"room_settings"`
}

type RoomService struct {
	db    *sql.DB
	redis *redis.Client
}

func NewRoomService(db *sql.DB, redis *redis.Client) *RoomService {
	return &RoomService{
		db:    db,
		redis: redis,
	}
}

// GenerateRoomID creates a unique ID for a new room.
func (rs *RoomService) GenerateRoomID() (string, error) {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	randomStr := hex.EncodeToString(bytes)
	return fmt.Sprintf("room_%s", randomStr), nil
}

// CreateRoom creates a new room in the database and caches its metadata in Redis.
func (rs *RoomService) CreateRoom(adminUserID string, maxUsers int, roomSettings map[string]interface{}) (*Room, error) {
	roomID, err := rs.GenerateRoomID()
	if err != nil {
		return nil, err
	}

	room := &Room{
		RoomID:       roomID,
		AdminUserID:  adminUserID,
		CreatedAt:    time.Now(),
		LastActivity: time.Now(),
		MaxUsers:     maxUsers,
		IsActive:     true,
		RoomSettings: roomSettings,
	}

	// Insert into PostgreSQL
	query := `
        INSERT INTO rooms (room_id, admin_user_id, created_at, last_activity, max_users, is_active, room_settings)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
	settingsJSON, _ := json.Marshal(room.RoomSettings)
	_, err = rs.db.Exec(query, room.RoomID, room.AdminUserID, room.CreatedAt,
		room.LastActivity, room.MaxUsers, room.IsActive, settingsJSON)
	if err != nil {
		return nil, err
	}

	// Cache in Redis
	roomKey := fmt.Sprintf("room:%s", roomID)
	roomData := map[string]interface{}{
		"admin_user_id":  room.AdminUserID,
		"created_at":     room.CreatedAt.Unix(),
		"last_activity":  room.LastActivity.Unix(),
		"max_users":      room.MaxUsers,
		"is_active":      room.IsActive,
		"user_count":     0,
	}
	if err := rs.redis.HMSet(context.Background(), roomKey, roomData).Err(); err != nil {
		return nil, err
	}
	rs.redis.Expire(context.Background(), roomKey, time.Hour) // Cache for 1 hour

	return room, nil
}

// GetRoom retrieves room details from the database.
func (rs *RoomService) GetRoom(roomID string) (*Room, error) {
	room := &Room{}
	query := `
        SELECT room_id, admin_user_id, created_at, last_activity, max_users, 
               is_active, COALESCE(canvas_s3_key, '') as canvas_s3_key, room_settings
        FROM rooms WHERE room_id = $1
    `
	var settingsJSON []byte
	err := rs.db.QueryRow(query, roomID).Scan(
		&room.RoomID, &room.AdminUserID, &room.CreatedAt, &room.LastActivity,
		&room.MaxUsers, &room.IsActive, &room.CanvasS3Key, &settingsJSON,
	)
	if err != nil {
		return nil, err
	}

	if len(settingsJSON) > 0 {
		json.Unmarshal(settingsJSON, &room.RoomSettings)
	}
	return room, nil
}

// CanJoinRoom checks if a room is active and not at capacity.
func (rs *RoomService) CanJoinRoom(roomID string) (bool, error) {
	room, err := rs.GetRoom(roomID)
	if err != nil {
		return false, err
	}
	if !room.IsActive {
		return false, fmt.Errorf("room is not active")
	}

	userCount, err := rs.GetRoomUserCount(roomID)
	if err != nil {
		return false, err
	}
	if userCount >= room.MaxUsers {
		return false, fmt.Errorf("room is at capacity")
	}

	return true, nil
}

// GetRoomUserCount retrieves the number of users in a room, checking Redis first.
func (rs *RoomService) GetRoomUserCount(roomID string) (int, error) {
	roomKey := fmt.Sprintf("room:%s", roomID)
	countStr, err := rs.redis.HGet(context.Background(), roomKey, "user_count").Result()
	if err == nil {
		count, _ := strconv.Atoi(countStr)
		return count, nil
	}

	// Fallback to database if not in Redis
	query := `SELECT COUNT(*) FROM user_sessions WHERE room_id = $1`
	var count int
	if err := rs.db.QueryRow(query, roomID).Scan(&count); err != nil {
		return 0, err
	}

	// Update Redis cache
	rs.redis.HSet(context.Background(), roomKey, "user_count", count)
	return count, nil
}

// UpdateRoomActivity updates the last_activity timestamp in the database and cache.
func (rs *RoomService) UpdateRoomActivity(roomID string) error {
	now := time.Now()
	query := `UPDATE rooms SET last_activity = $1 WHERE room_id = $2`
	_, err := rs.db.Exec(query, now, roomID)
	if err != nil {
		return err
	}

	roomKey := fmt.Sprintf("room:%s", roomID)
	return rs.redis.HSet(context.Background(), roomKey, "last_activity", now.Unix()).Err()
}

// IncrementUserCount atomically increases the user count in Redis.
func (rs *RoomService) IncrementUserCount(roomID string) error {
	roomKey := fmt.Sprintf("room:%s", roomID)
	return rs.redis.HIncrBy(context.Background(), roomKey, "user_count", 1).Err()
}

// DecrementUserCount atomically decreases the user count in Redis.
func (rs *RoomService) DecrementUserCount(roomID string) error {
	roomKey := fmt.Sprintf("room:%s", roomID)
	return rs.redis.HIncrBy(context.Background(), roomKey, "user_count", -1).Err()
}

// GetRecentRooms retrieves the most recently active rooms.
func (rs *RoomService) GetRecentRooms(limit int) ([]*Room, error) {
	query := `
		SELECT room_id, admin_user_id, created_at, last_activity, max_users, is_active, 
		       COALESCE(canvas_s3_key, '') as canvas_s3_key, 
		       COALESCE(room_settings::text, '{}') as room_settings
		FROM rooms 
		WHERE is_active = true 
		ORDER BY last_activity DESC 
		LIMIT $1
	`
	
	rows, err := rs.db.Query(query, limit)
	if err != nil {
		log.Printf("Error querying recent rooms: %v", err)
		return nil, err
	}
	defer rows.Close()

	var rooms []*Room
	for rows.Next() {
		room := &Room{}
		var roomSettingsStr string
		err := rows.Scan(
			&room.RoomID,
			&room.AdminUserID,
			&room.CreatedAt,
			&room.LastActivity,
			&room.MaxUsers,
			&room.IsActive,
			&room.CanvasS3Key,
			&roomSettingsStr,
		)
		if err != nil {
			log.Printf("Error scanning room row: %v", err)
			return nil, err
		}
		
		// Parse the JSONB room_settings
		if roomSettingsStr != "" {
			err = json.Unmarshal([]byte(roomSettingsStr), &room.RoomSettings)
			if err != nil {
				log.Printf("Error unmarshaling room settings: %v", err)
				room.RoomSettings = make(map[string]interface{})
			}
		} else {
			room.RoomSettings = make(map[string]interface{})
		}
		
		rooms = append(rooms, room)
	}

	return rooms, rows.Err()
}

// GetGlobalStats retrieves global application statistics.
func (rs *RoomService) GetGlobalStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Get active rooms count
	var activeRooms int
	query := `SELECT COUNT(*) FROM rooms WHERE is_active = true`
	if err := rs.db.QueryRow(query).Scan(&activeRooms); err != nil {
		activeRooms = 0
	}
	stats["activeRooms"] = activeRooms

	// Get total active users count
	var totalUsers int
	query = `SELECT COUNT(*) FROM user_sessions WHERE last_seen > NOW() - INTERVAL '5 minutes'`
	if err := rs.db.QueryRow(query).Scan(&totalUsers); err != nil {
		totalUsers = 0
	}
	stats["totalUsers"] = totalUsers

	// Estimate strokes drawn (this could be improved with actual stroke tracking)
	// For now, we'll use a rough estimate based on room activity
	var strokesDrawn int
	query = `SELECT COUNT(*) * 50 FROM canvas_states` // Estimate 50 strokes per canvas save
	if err := rs.db.QueryRow(query).Scan(&strokesDrawn); err != nil {
		strokesDrawn = 0
	}
	stats["strokesDrawn"] = strokesDrawn

	return stats, nil
}