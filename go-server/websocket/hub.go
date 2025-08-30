package websocket

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"realtime_whiteboard/go-server/models"
	"realtime_whiteboard/go-server/services"
	"strings"

	"github.com/redis/go-redis/v9"
)

type Hub struct {
	rooms          map[string]map[*Client]bool
	register       chan *Client
	unregister     chan *Client
	broadcast      chan *BroadcastMessage
	userService    *services.UserService
	sessionManager *models.SessionManager
	adminService   *services.AdminService
	roomService    *RoomService
	canvasService  *services.CanvasService
}

func NewHub(db *sql.DB, redis *redis.Client, us *services.UserService, sm *models.SessionManager, as *services.AdminService, cs *services.CanvasService) *Hub {
	return &Hub{
		rooms:          make(map[string]map[*Client]bool),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		broadcast:      make(chan *BroadcastMessage),
		userService:    us,
		sessionManager: sm,
		adminService:   as,
		roomService:    NewRoomService(db),
		canvasService:  cs,
	}
}

// getRoomMembers returns a formatted string of all members in a room
func (h *Hub) getRoomMembers(roomID string) string {
	if clients, ok := h.rooms[roomID]; ok {
		var members []string
		for client := range clients {
			members = append(members, fmt.Sprintf("%s", client.userID))
		}
		return strings.Join(members, ", ")
	}
	return "no members"
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if _, ok := h.rooms[client.roomID]; !ok {
				h.rooms[client.roomID] = make(map[*Client]bool)
				log.Printf("📝 Created new room: %s", client.roomID)
			}
			h.rooms[client.roomID][client] = true
			
			// Log detailed room membership
			log.Printf("👋 User %s joined room %s", client.userID, client.roomID)
			log.Printf("👥 Current room members [%s]: %s", 
				client.roomID, 
				h.getRoomMembers(client.roomID))

		case client := <-h.unregister:
			if _, ok := h.rooms[client.roomID]; ok {
				if _, ok := h.rooms[client.roomID][client]; ok {
					delete(h.rooms[client.roomID], client)
					close(client.send)
					
					// Log user leaving and remaining members
					log.Printf("👋 User %s left room %s", client.userID, client.roomID)
					if len(h.rooms[client.roomID]) > 0 {
						log.Printf("👥 Remaining members in room [%s]: %s", 
							client.roomID, 
							h.getRoomMembers(client.roomID))
					}

					if len(h.rooms[client.roomID]) == 0 {
						delete(h.rooms, client.roomID)
						log.Printf("🗑️ Removed empty room: %s", client.roomID)
					}

					go h.handleUserLeave(client.conn, client.userID, client.roomID)
				}
			}

		case message := <-h.broadcast:
			if clients, ok := h.rooms[message.RoomID]; ok {
				// Try to parse the message to determine its type
				var msgData map[string]interface{}
				if err := json.Unmarshal(message.Payload, &msgData); err == nil {
					msgType, _ := msgData["type"].(string)
					switch msgType {
					case "stroke":
						// For stroke messages, log who received it
						senderID, _ := msgData["username"].(string)
						var recipients []string
						for client := range clients {
							if client.userID != senderID {
								recipients = append(recipients, client.userID)
							}
						}
						if len(recipients) > 0 {
							log.Printf("✏️  Stroke from %s in room %s received by: %s",
								senderID,
								message.RoomID,
								strings.Join(recipients, ", "))
						} else {
							log.Printf("✏️  Stroke from %s in room %s (no other recipients)",
								senderID,
								message.RoomID)
						}
					case "canvas_update":
						// For canvas updates, log the activity
						senderID, _ := msgData["user_id"].(string)
						log.Printf("🎨 Canvas update from %s in room %s broadcasted",
							senderID, message.RoomID)
					case "canvas_saved":
						// For save notifications
						savedBy, _ := msgData["saved_by"].(string)
						version, _ := msgData["version"].(float64)
						log.Printf("💾 Canvas save notification: room=%s, saved_by=%s, version=%.0f",
							message.RoomID, savedBy, version)
					case "chat:message":
						// For chat messages, log the sender and recipients
						senderID, _ := msgData["username"].(string)
						content, _ := msgData["data"].(map[string]interface{})
						if content != nil {
							messageText, _ := content["content"].(string)
							log.Printf("💬 Chat from %s in room %s: %s",
								senderID,
								message.RoomID,
								messageText)
						}
					}
				}

				// Broadcast the message
				for client := range clients {
					select {
					case client.send <- message.Payload:
						// Message sent successfully
					default:
						close(client.send)
						delete(clients, client)
					}
				}
			} else {
				log.Printf("❌ Attempted to broadcast to non-existent room: %s", message.RoomID)
			}
		}
	}
}