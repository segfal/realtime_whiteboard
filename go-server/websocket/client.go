package websocket

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second
	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second
	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	roomID string
	userID string
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// Extract room ID from the URL path
	// Expected format: /ws/room/{roomId}
	pathParts := strings.Split(r.URL.Path, "/")
	var roomID string
	if len(pathParts) >= 4 && pathParts[2] == "room" {
		roomID = pathParts[3]
		log.Printf("Extracted room ID from URL: %s", roomID)
	} else {
		log.Printf("Invalid WebSocket URL path: %s", r.URL.Path)
		http.Error(w, "Invalid room ID", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	// Create client with the extracted room ID
	client := &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		roomID: roomID,
		userID: fmt.Sprintf("temp-user-%s", generateID()), // Temporary ID until join message
	}

	// Register the client with the hub
	client.hub.register <- client

	// Start the read/write pumps
	go client.writePump()
	go client.readPump()

	log.Printf("New WebSocket client connected to room: %s", roomID)
}

// generateID creates a short random identifier
func generateID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		switch msg.Type {
		case "join":
			// The handleUserJoin method will now also be responsible
			// for updating the client's userID and roomID fields.
			c.hub.handleUserJoin(c, message)
		case "transfer_admin":
			c.hub.handleAdminTransfer(c, message)
		case "stroke":
			log.Printf("Received stroke from client %s in room %s", c.userID, c.roomID)

			// Re-marshal the original message to add the sender's username.
			// This allows frontends to ignore their own strokes.
			var msg map[string]interface{}
			if err := json.Unmarshal(message, &msg); err != nil {
				log.Printf("error decoding stroke message for broadcast: %v", err)
				continue
			}
			msg["username"] = c.userID
			finalMessage, err := json.Marshal(msg)
			if err != nil {
				log.Printf("error encoding stroke message for broadcast: %v", err)
				continue
			}

			// Broadcast the stroke to all clients in the same room
			c.hub.broadcast <- &BroadcastMessage{
				RoomID:  c.roomID,
				Payload: finalMessage,
			}
			log.Printf("Broadcasting stroke to room %s", c.roomID)
		case "canvas_update":
			log.Printf("🎨 Received canvas update from client %s in room %s", c.userID, c.roomID)
			c.hub.handleCanvasUpdate(c, message)
		case "canvas_save":
			log.Printf("💾 Received canvas save from client %s in room %s", c.userID, c.roomID)
			c.hub.handleCanvasSave(c, message)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}