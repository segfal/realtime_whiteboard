package api

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"realtime_whiteboard/go-server/services"
	"strings"
	"time"
)

// APIHandlers holds the services that our HTTP handlers will need.
type APIHandlers struct {
	roomService   *services.RoomService
	inviteService *services.InviteService
	userService   *services.UserService
}

func NewAPIHandlers(rs *services.RoomService, is *services.InviteService, us *services.UserService) *APIHandlers {
	return &APIHandlers{
		roomService:   rs,
		inviteService: is,
		userService:   us,
	}
}

// CreateRoomRequest defines the expected JSON body for creating a room.
type CreateRoomRequest struct {
	MaxUsers     int                    `json:"max_users"`
	RoomSettings map[string]interface{} `json:"room_settings"`
}

// CreateRoomResponse defines the JSON response after creating a room.
type CreateRoomResponse struct {
	Room      *services.Room `json:"room"`
	InviteURL string         `json:"invite_url"`
}

// JoinRoomRequest defines the JSON body for joining a room.
type JoinRoomRequest struct {
	RoomID      string `json:"room_id,omitempty"`
	InviteCode  string `json:"invite_code,omitempty"`
	DisplayName string `json:"display_name"`
}

// CreateInviteLink handles the creation of a new invite link for a room.
func (h *APIHandlers) CreateInviteLink(w http.ResponseWriter, r *http.Request) {
	roomID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/rooms/"), "/invite")
	if roomID == "" {
		http.Error(w, "Room ID is required", http.StatusBadRequest)
		return
	}

	var req struct {
		ExpirationHours int `json:"expiration_hours"`
		MaxUsage        int `json:"max_usage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.ExpirationHours <= 0 {
		req.ExpirationHours = 24 // Default to 24 hours
	}

	// In a real app, the user ID would come from an authentication token.
	// createdBy := "admin"

	invite, err := h.inviteService.CreateInviteLink(roomID, time.Duration(req.ExpirationHours)*time.Hour)
	if err != nil {
		http.Error(w, "Failed to create invite link", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"invite":     invite,
		"invite_url": fmt.Sprintf("http://%s/invite/%s", r.Host, invite),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// CreateRoom handles the HTTP request to create a new room.
func (h *APIHandlers) CreateRoom(w http.ResponseWriter, r *http.Request) {
	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// In a real app, the admin user ID would come from an authentication token.
	adminUserID, err := h.userService.GenerateUserID()
	if err != nil {
		http.Error(w, "Failed to generate admin ID", http.StatusInternalServerError)
		return
	}

	if req.MaxUsers <= 0 {
		req.MaxUsers = 10 // Default value
	}
	if req.RoomSettings == nil {
		req.RoomSettings = make(map[string]interface{})
	}

	room, err := h.roomService.CreateRoom(adminUserID, req.MaxUsers, req.RoomSettings)
	if err != nil {
		http.Error(w, "Failed to create room", http.StatusInternalServerError)
		return
	}

	// Create a default invite link
	invite, err := h.inviteService.CreateInviteLink(room.RoomID, 24*time.Hour) // Expires in 24 hours
	if err != nil {
		log.Printf("Failed to create invite link for new room: %v", err)
	}

	response := CreateRoomResponse{
		Room: room,
	}
	if invite != "" {
		response.InviteURL = fmt.Sprintf("http://%s/invite/%s", r.Host, invite)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// GetRoom handles retrieving the details of a single room.
func (h *APIHandlers) GetRoom(w http.ResponseWriter, r *http.Request) {
	// Simple path parsing since we are not using a router like gorilla/mux
	roomID := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
	if roomID == "" {
		http.Error(w, "Room ID is required", http.StatusBadRequest)
		return
	}

	room, err := h.roomService.GetRoom(roomID)
	if err != nil {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	userCount, _ := h.roomService.GetRoomUserCount(roomID)
	response := map[string]interface{}{
		"room":       room,
		"user_count": userCount,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// JoinRoom handles a user's request to join a room, validating capacity and invites.
func (h *APIHandlers) JoinRoom(w http.ResponseWriter, r *http.Request) {
	var req JoinRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var roomID string
	if req.InviteCode != "" {
		invite, err := h.inviteService.UseInviteLink(req.InviteCode)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		roomID = invite.RoomID
	} else if req.RoomID != "" {
		roomID = req.RoomID
	} else {
		http.Error(w, "Room ID or invite code is required", http.StatusBadRequest)
		return
	}

	canJoin, err := h.roomService.CanJoinRoom(roomID)
	if err != nil || !canJoin {
		errorMsg := "Cannot join room"
		if err != nil {
			errorMsg = err.Error()
		}
		http.Error(w, errorMsg, http.StatusForbidden)
		return
	}

	userID, err := h.userService.GenerateUserID()
	if err != nil {
		http.Error(w, "Failed to generate user ID", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"user_id":       userID,
		"room_id":       roomID,
		"display_name":  req.DisplayName,
		"websocket_url": fmt.Sprintf("ws://%s/ws", r.Host),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetRecentRooms handles retrieving recently active rooms.
func (h *APIHandlers) GetRecentRooms(w http.ResponseWriter, r *http.Request) {
	rooms, err := h.roomService.GetRecentRooms(10) // Get 10 most recent rooms
	if err != nil {
		http.Error(w, "Failed to fetch recent rooms", http.StatusInternalServerError)
		return
	}

	// Get user counts for each room
	roomsWithCounts := make([]map[string]interface{}, 0, len(rooms))
	for _, room := range rooms {
		userCount, _ := h.roomService.GetRoomUserCount(room.RoomID)
		roomData := map[string]interface{}{
			"room_id":      room.RoomID,
			"admin_user_id": room.AdminUserID,
			"created_at":   room.CreatedAt,
			"last_activity": room.LastActivity,
			"max_users":    room.MaxUsers,
			"is_active":    room.IsActive,
			"room_settings": room.RoomSettings,
			"user_count":   userCount,
		}
		roomsWithCounts = append(roomsWithCounts, roomData)
	}

	response := map[string]interface{}{
		"rooms": roomsWithCounts,
		"total": len(roomsWithCounts),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetGlobalStats handles retrieving global application statistics.
func (h *APIHandlers) GetGlobalStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.roomService.GetGlobalStats()
	if err != nil {
		log.Printf("Failed to get global stats: %v", err)
		// Return default stats if there's an error
		stats = map[string]interface{}{
			"activeRooms":  0,
			"totalUsers":   0,
			"strokesDrawn": 0,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}