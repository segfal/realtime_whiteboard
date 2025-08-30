package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// ... (previous message type definitions remain the same) ...

func (h *Hub) handleUserJoin(client *Client, message []byte) {
	var joinMsg UserJoinMessage
	if err := json.Unmarshal(message, &joinMsg); err != nil {
		log.Printf("❌ Error unmarshaling user join message: %v", err)
		return
	}

	// Verify that the room ID matches what was in the WebSocket URL
	if joinMsg.RoomID != client.roomID {
		log.Printf("❌ Room ID mismatch. URL: %s, Message: %s", client.roomID, joinMsg.RoomID)
		return
	}

	// Generate user ID if not provided
	if joinMsg.UserID == "" {
		userID, err := h.userService.GenerateUserID()
		if err != nil {
			log.Printf("❌ Error generating user ID: %v", err)
			return
		}
		joinMsg.UserID = userID
	}

	// Generate display name if not provided
	if joinMsg.DisplayName == "" {
		joinMsg.DisplayName = h.userService.GenerateDisplayName()
	}

	// Update the client's details
	client.userID = joinMsg.UserID

	// Ensure room exists before creating a session
	if err := h.roomService.CreateRoomIfNotExists(joinMsg.RoomID, joinMsg.UserID); err != nil {
		log.Printf("❌ Error ensuring room exists: %v", err)
		return
	}

	// Check if room exists and determine admin status
	isAdmin := h.roomService.IsFirstUser(joinMsg.RoomID)

	// Create session
	connectionID := client.conn.RemoteAddr().String()
	err := h.sessionManager.CreateSession(
		joinMsg.UserID,
		joinMsg.RoomID,
		joinMsg.DisplayName,
		connectionID,
		isAdmin,
	)
	if err != nil {
		log.Printf("❌ Error creating session: %v", err)
		return
	}

	// Log detailed join information
	log.Printf("✨ New user joined:")
	log.Printf("   👤 User ID: %s", joinMsg.UserID)
	log.Printf("   📝 Display Name: %s", joinMsg.DisplayName)
	log.Printf("   🏠 Room: %s", joinMsg.RoomID)
	log.Printf("   👑 Admin: %v", isAdmin)
	log.Printf("   👥 Current room members: %s", h.getRoomMembers(joinMsg.RoomID))

	// Broadcast user join to room
	response := map[string]interface{}{
		"type":         "user_joined",
		"user_id":      joinMsg.UserID,
		"display_name": joinMsg.DisplayName,
		"is_admin":     isAdmin,
		"timestamp":    time.Now().Unix(),
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("❌ Error marshaling join response: %v", err)
		return
	}

	h.broadcast <- &BroadcastMessage{
		RoomID:  joinMsg.RoomID,
		Payload: responseBytes,
	}
}

func (h *Hub) handleAdminTransfer(client *Client, message []byte) {
	var msg AdminTransferMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("❌ Error unmarshaling admin transfer message: %v", err)
		return
	}

	currentAdminID := client.userID

	err := h.adminService.TransferAdmin(msg.RoomID, currentAdminID, msg.NewAdminID)
	if err != nil {
		log.Printf("❌ Error transferring admin rights: %v", err)
		return
	}

	log.Printf("👑 Admin rights transferred:")
	log.Printf("   🏠 Room: %s", msg.RoomID)
	log.Printf("   👤 From: %s", currentAdminID)
	log.Printf("   👤 To: %s", msg.NewAdminID)

	response := map[string]interface{}{
		"type":         "admin_changed",
		"new_admin_id": msg.NewAdminID,
		"timestamp":    time.Now().Unix(),
	}
	responseBytes, _ := json.Marshal(response)
	h.broadcast <- &BroadcastMessage{
		RoomID:  msg.RoomID,
		Payload: responseBytes,
	}
}

func (h *Hub) handleUserLeave(conn *websocket.Conn, userID, roomID string) {
	session := h.sessionManager.GetSession(userID)
	if session != nil && session.IsAdmin {
		newAdminID, err := h.adminService.AutoAssignAdmin(roomID, userID)
		if err != nil {
			log.Printf("❌ Error auto-assigning admin: %v", err)
		} else if newAdminID != "" {
			log.Printf("👑 Auto-assigned new admin:")
			log.Printf("   🏠 Room: %s", roomID)
			log.Printf("   👤 New Admin: %s", newAdminID)

			adminChangeMsg := map[string]interface{}{
				"type":         "admin_changed",
				"new_admin_id": newAdminID,
				"timestamp":    time.Now().Unix(),
			}
			msgBytes, _ := json.Marshal(adminChangeMsg)
			h.broadcast <- &BroadcastMessage{
				RoomID:  roomID,
				Payload: msgBytes,
			}
		}
	}

	if err := h.sessionManager.RemoveSession(userID); err != nil {
		log.Printf("❌ Error removing session for user %s: %v", userID, err)
	}

	log.Printf("👋 User left:")
	log.Printf("   👤 User ID: %s", userID)
	log.Printf("   🏠 Room: %s", roomID)
	log.Printf("   👥 Remaining members: %s", h.getRoomMembers(roomID))

	response := map[string]interface{}{
		"type":      "user_left",
		"user_id":   userID,
		"timestamp": time.Now().Unix(),
	}

	responseBytes, err := json.Marshal(response)
	if err != nil {
		log.Printf("❌ Error marshaling leave response: %v", err)
		return
	}
	h.broadcast <- &BroadcastMessage{
		RoomID:  roomID,
		Payload: responseBytes,
	}
}