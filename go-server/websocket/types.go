package websocket

import (
	"database/sql"
	"log"
	"realtime_whiteboard/go-server/services"
)

// RoomService handles room-related logic
type RoomService struct {
	db *sql.DB
}

func NewRoomService(db *sql.DB) *RoomService {
	return &RoomService{db: db}
}

// CreateRoomIfNotExists ensures a room exists in the database
func (rs *RoomService) CreateRoomIfNotExists(roomID, adminUserID string) error {
	query := `
		INSERT INTO rooms (room_id, admin_user_id)
		VALUES ($1, $2)
		ON CONFLICT (room_id) DO NOTHING;
	`
	_, err := rs.db.Exec(query, roomID, adminUserID)
	if err != nil {
		log.Printf("Error ensuring room exists: %v", err)
	}
	return err
}

// IsFirstUser checks if this is the first user in the room
func (rs *RoomService) IsFirstUser(roomID string) bool {
	var count int
	err := rs.db.QueryRow("SELECT COUNT(*) FROM user_sessions WHERE room_id = $1", roomID).Scan(&count)
	if err != nil {
		log.Printf("Error checking if first user: %v", err)
		return true // Default to true on error
	}
	return count == 0
}

// Message types
type UserJoinMessage struct {
	Type        string `json:"type"`
	UserID      string `json:"user_id"`
	RoomID      string `json:"room_id"`
	DisplayName string `json:"display_name"`
}

type AdminTransferMessage struct {
	Type       string `json:"type"`
	RoomID     string `json:"room_id"`
	NewAdminID string `json:"new_admin_id"`
}

type StrokeMessage struct {
	Type string            `json:"type"`
	Data services.GoStroke `json:"data"`
}

type UserLeaveMessage struct {
	Type   string `json:"type"`
	UserID string `json:"user_id"`
	RoomID string `json:"room_id"`
}

type BroadcastMessage struct {
	RoomID  string
	Payload []byte
}