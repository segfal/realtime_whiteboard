package websocket

import (
	"encoding/json"
	"log"
	"time"
)

type CanvasUpdateMessage struct {
	Type       string                 `json:"type"`
	RoomID     string                 `json:"room_id"`
	UserID     string                 `json:"user_id"`
	UpdateData map[string]interface{} `json:"update_data"`
	Timestamp  int64                  `json:"timestamp"`
}

type CanvasSaveMessage struct {
	Type      string                 `json:"type"`
	RoomID    string                 `json:"room_id"`
	UserID    string                 `json:"user_id"`
	Manual    bool                   `json:"manual"`
	Canvas    map[string]interface{} `json:"canvas_data,omitempty"`
	Timestamp int64                  `json:"timestamp"`
}

func (h *Hub) handleCanvasUpdate(client *Client, message []byte) {
	var updateMsg CanvasUpdateMessage
	if err := json.Unmarshal(message, &updateMsg); err != nil {
		log.Printf("❌ Error unmarshaling canvas update: %v", err)
		return
	}

	updateMsg.Timestamp = time.Now().Unix()

	// Mark room as having pending changes
	if h.canvasService != nil {
		h.canvasService.MarkPendingChanges(updateMsg.RoomID)
	}

	// Update room activity (method doesn't exist yet, will be added later)
	// if h.roomService != nil {
	//	h.roomService.UpdateRoomActivity(updateMsg.RoomID)
	// }

	log.Printf("🎨 Canvas update: room=%s, user=%s", updateMsg.RoomID, updateMsg.UserID)

	// Broadcast to all users in room except sender
	payloadData := map[string]interface{}{
		"type":        "canvas_update",
		"user_id":     updateMsg.UserID,
		"update_data": updateMsg.UpdateData,
		"timestamp":   updateMsg.Timestamp,
	}
	
	payloadJSON, err := json.Marshal(payloadData)
	if err != nil {
		log.Printf("❌ Error marshaling canvas update payload: %v", err)
		return
	}
	
	broadcastMsg := &BroadcastMessage{
		RoomID:  updateMsg.RoomID,
		Payload: payloadJSON,
	}

	// Send to all clients in room except the sender
	h.broadcastToRoomExcept(updateMsg.RoomID, updateMsg.UserID, broadcastMsg)
}

func (h *Hub) handleCanvasSave(client *Client, message []byte) {
	var saveMsg CanvasSaveMessage
	if err := json.Unmarshal(message, &saveMsg); err != nil {
		log.Printf("❌ Error unmarshaling canvas save: %v", err)
		return
	}

	if h.canvasService == nil {
		log.Printf("❌ Canvas service not available")
		return
	}

	// Use provided canvas data or get current state
	var canvasData map[string]interface{}
	if saveMsg.Canvas != nil && len(saveMsg.Canvas) > 0 {
		canvasData = saveMsg.Canvas
	} else {
		// Get current canvas state from room
		canvasData = h.getCurrentCanvasData(saveMsg.RoomID)
	}

	// Save to persistence layer
	canvasState, err := h.canvasService.SaveCanvasState(saveMsg.RoomID, canvasData, saveMsg.UserID)
	if err != nil {
		log.Printf("❌ Error saving canvas state: %v", err)

		// Send error to client
		errorMsg := map[string]interface{}{
			"type":      "save_error",
			"message":   "Failed to save canvas state",
			"timestamp": time.Now().Unix(),
		}
		h.sendToClient(client, errorMsg)
		return
	}

	log.Printf("✅ Canvas saved: room=%s, version=%d, by=%s (manual=%t)", 
		saveMsg.RoomID, canvasState.Version, saveMsg.UserID, saveMsg.Manual)

	// Notify all users in room about successful save
	saveNotification := map[string]interface{}{
		"type":      "canvas_saved",
		"version":   canvasState.Version,
		"saved_by":  saveMsg.UserID,
		"manual":    saveMsg.Manual,
		"timestamp": canvasState.SavedAt.Unix(),
	}

	notificationJSON, err := json.Marshal(saveNotification)
	if err != nil {
		log.Printf("❌ Error marshaling save notification: %v", err)
		return
	}

	broadcastMsg := &BroadcastMessage{
		RoomID:  saveMsg.RoomID,
		Payload: notificationJSON,
	}

	h.broadcast <- broadcastMsg
}

func (h *Hub) getCurrentCanvasData(roomID string) map[string]interface{} {
	// Try to get from canvas service
	if h.canvasService != nil {
		if state, err := h.canvasService.LoadCanvasState(roomID); err == nil && state != nil {
			return state.CanvasData
		}
	}

	// Return placeholder structure if no saved state
	return map[string]interface{}{
		"strokes":    []interface{}{},
		"objects":    []interface{}{},
		"background": "#ffffff",
		"zoom":       1.0,
		"pan":        map[string]float64{"x": 0, "y": 0},
		"metadata": map[string]interface{}{
			"last_updated": time.Now().Unix(),
			"room_id":      roomID,
		},
	}
}

func (h *Hub) sendToClient(client *Client, message map[string]interface{}) {
	messageJSON, err := json.Marshal(message)
	if err != nil {
		log.Printf("❌ Error marshaling message: %v", err)
		return
	}
	
	select {
	case client.send <- messageJSON:
	default:
		close(client.send)
		if clients, ok := h.rooms[client.roomID]; ok {
			delete(clients, client)
		}
	}
}

func (h *Hub) broadcastToRoomExcept(roomID, excludeUserID string, message *BroadcastMessage) {
	if clients, ok := h.rooms[roomID]; ok {
		for client := range clients {
			if client.userID != excludeUserID {
				select {
				case client.send <- message.Payload:
				default:
					close(client.send)
					delete(clients, client)
				}
			}
		}
	}
}
