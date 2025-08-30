package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

// Simple server without Redis, OT, or spatial indexing
type SimpleServer struct {
	clients map[*websocket.Conn]*Client
	rooms   map[string]map[*websocket.Conn]*Client
	strokes map[string][]Stroke // room -> strokes (in-memory for now)
	mutex   sync.RWMutex
}

type Client struct {
	conn     *websocket.Conn
	room     string
	username string
}

type Message struct {
	Type     string      `json:"type"`
	Room     string      `json:"room"`
	Username string      `json:"username"`
	Data     interface{} `json:"data"`
}

type Stroke struct {
	ID        string      `json:"id,omitempty"`
	Points    [][]float64 `json:"points"`
	Color     string      `json:"color"`
	Thickness float64     `json:"thickness"`
	IsEraser  bool        `json:"isEraser"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func generateUsername() string {
	adjectives := []string{"Swift", "Bright", "Clever", "Quick", "Smart"}
	nouns := []string{"Penguin", "Dragon", "Phoenix", "Tiger", "Eagle"}
	
	adj := adjectives[rand.Intn(len(adjectives))]
	noun := nouns[rand.Intn(len(nouns))]
	num := rand.Intn(999)
	
	return fmt.Sprintf("%s%s%d", adj, noun, num)
}

func (s *SimpleServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	client := &Client{conn: conn}
	
	s.mutex.Lock()
	s.clients[conn] = client
	s.mutex.Unlock()

	defer func() {
		s.mutex.Lock()
		delete(s.clients, conn)
		if client.room != "" {
			if roomClients, exists := s.rooms[client.room]; exists {
				delete(roomClients, conn)
				if len(roomClients) == 0 {
					delete(s.rooms, client.room)
				}
			}
		}
		s.mutex.Unlock()
		log.Printf("Client %s disconnected from room %s", client.username, client.room)
	}()

	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		switch msg.Type {
		case "join":
			s.handleJoin(client, msg)
		case "stroke":
			s.handleStroke(client, msg)
		case "clear":
			s.handleClear(client, msg)
		case "chat:message":
			s.handleChat(client, msg)
		}
	}
}

func (s *SimpleServer) handleJoin(client *Client, msg Message) {
	client.room = msg.Room
	client.username = generateUsername()

	s.mutex.Lock()
	if s.rooms[client.room] == nil {
		s.rooms[client.room] = make(map[*websocket.Conn]*Client)
	}
	s.rooms[client.room][client.conn] = client
	s.mutex.Unlock()

	// Send existing strokes to new client
	s.mutex.RLock()
	strokes := s.strokes[client.room]
	s.mutex.RUnlock()

	response := Message{
		Type:     "joined",
		Room:     client.room,
		Username: client.username,
		Data:     strokes,
	}
	
	client.conn.WriteJSON(response)
	log.Printf("Client %s joined room %s", client.username, client.room)
}

func (s *SimpleServer) handleStroke(client *Client, msg Message) {
	log.Printf("Received stroke message from %s: %+v", client.username, msg)
	
	// Extract stroke data
	dataMap, ok := msg.Data.(map[string]interface{})
	if !ok {
		log.Printf("Invalid stroke data format - expected map[string]interface{}, got %T", msg.Data)
		log.Printf("Raw data: %+v", msg.Data)
		return
	}

	log.Printf("Stroke data map: %+v", dataMap)

	// Create stroke with timestamp for last-write-wins
	stroke := Stroke{}

	// Extract stroke properties
	if id, ok := dataMap["id"].(string); ok {
		stroke.ID = id
		log.Printf("Extracted stroke ID: %s", id)
	}
	
	if pointsInterface, ok := dataMap["points"].([]interface{}); ok {
		// Convert []interface{} to [][]float64
		points := make([][]float64, len(pointsInterface))
		for i, pointInterface := range pointsInterface {
			if pointArray, ok := pointInterface.([]interface{}); ok {
				point := make([]float64, len(pointArray))
				for j, coord := range pointArray {
					if coordFloat, ok := coord.(float64); ok {
						point[j] = coordFloat
					} else {
						log.Printf("Invalid coordinate type at [%d][%d]: %T", i, j, coord)
					}
				}
				points[i] = point
			} else {
				log.Printf("Invalid point type at [%d]: %T", i, pointInterface)
			}
		}
		stroke.Points = points
		log.Printf("Extracted points: %+v", points)
	} else {
		log.Printf("Failed to extract points, got type: %T", dataMap["points"])
		log.Printf("Points value: %+v", dataMap["points"])
	}
	
	if color, ok := dataMap["color"].(string); ok {
		stroke.Color = color
		log.Printf("Extracted color: %s", color)
	} else {
		log.Printf("Failed to extract color, got type: %T", dataMap["color"])
		log.Printf("Color value: %+v", dataMap["color"])
	}
	
	if thickness, ok := dataMap["thickness"].(float64); ok {
		stroke.Thickness = thickness
		log.Printf("Extracted thickness: %f", thickness)
	} else if thicknessInt, ok := dataMap["thickness"].(int); ok {
		stroke.Thickness = float64(thicknessInt)
		log.Printf("Extracted thickness (converted from int): %f", stroke.Thickness)
	} else {
		log.Printf("Failed to extract thickness, got type: %T", dataMap["thickness"])
		log.Printf("Thickness value: %+v", dataMap["thickness"])
	}
	
	if isEraser, ok := dataMap["isEraser"].(bool); ok {
		stroke.IsEraser = isEraser
		log.Printf("Extracted isEraser: %t", isEraser)
	} else {
		log.Printf("Failed to extract isEraser, got type: %T", dataMap["isEraser"])
		log.Printf("IsEraser value: %+v", dataMap["isEraser"])
	}

	log.Printf("Final stroke to be stored: %+v", stroke)
	
	// Add or update stroke in room
	s.mutex.Lock()
	if s.strokes[client.room] == nil {
		s.strokes[client.room] = []Stroke{}
	}
	
	// If stroke has an ID, try to update existing stroke
	if stroke.ID != "" {
		found := false
		for i, existingStroke := range s.strokes[client.room] {
			if existingStroke.ID == stroke.ID {
				s.strokes[client.room][i] = stroke
				found = true
				log.Printf("Updated existing stroke with ID: %s", stroke.ID)
				break
			}
		}
		if !found {
			s.strokes[client.room] = append(s.strokes[client.room], stroke)
			log.Printf("Added new stroke with ID: %s", stroke.ID)
		}
	} else {
		// No ID, add as new stroke
		s.strokes[client.room] = append(s.strokes[client.room], stroke)
		log.Printf("Added new stroke without ID")
	}
	s.mutex.Unlock()

	// Broadcast to all clients in room
	broadcastMsg := Message{
		Type:     "stroke",
		Room:     client.room,
		Username: client.username,
		Data:     stroke,
	}

	log.Printf("Broadcasting stroke message: %+v", broadcastMsg)

	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			if conn != client.conn { // Don't send back to sender
				conn.WriteJSON(broadcastMsg)
			}
		}
	}
	s.mutex.RUnlock()

	log.Printf("Stroke from %s broadcast to room %s", client.username, client.room)
}

func (s *SimpleServer) handleClear(client *Client, msg Message) {
	s.mutex.Lock()
	s.strokes[client.room] = []Stroke{}
	s.mutex.Unlock()

	// Broadcast clear to all clients
	broadcastMsg := Message{
		Type:     "clear",
		Room:     client.room,
		Username: client.username,
		Data:     nil,
	}

	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			if conn != client.conn {
				conn.WriteJSON(broadcastMsg)
			}
		}
	}
	s.mutex.RUnlock()

	log.Printf("Canvas cleared by %s in room %s", client.username, client.room)
}

func (s *SimpleServer) handleChat(client *Client, msg Message) {
	log.Printf("Handling chat message from %s in room %s", client.username, client.room)

	var chatData interface{}
	if payload, ok := msg.Data.(map[string]interface{})["payload"]; ok {
        chatData = payload
    } else {
        // Fallback to direct data
        chatData = msg.Data
    }
    

	broadcastMsg := Message{
		Type:     "chat:message",
		Room:     client.room,
		Username: client.username,
		Data:     chatData,
	}

	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			if conn != client.conn {
				conn.WriteJSON(broadcastMsg)
			}
		}
	}
	s.mutex.RUnlock()
}

func main() {
	server := &SimpleServer{
		clients: make(map[*websocket.Conn]*Client),
		rooms:   make(map[string]map[*websocket.Conn]*Client),
		strokes: make(map[string][]Stroke),
	}

	http.HandleFunc("/ws", server.handleWebSocket)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	log.Println("Simple WebSocket server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}