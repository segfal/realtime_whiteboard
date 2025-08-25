package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
)

type Server struct {
	db      *sql.DB
	redis   *redis.Client
	clients map[*websocket.Conn]*Client
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
	Points   [][]float64 `json:"points"`
	Color    string      `json:"color"`
	Thickness float64    `json:"thickness"`
	IsEraser bool        `json:"isEraser"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for hackathon
	},
}

func generateUsername() string {
	adjectives := []string{"Swift", "Bright", "Clever", "Quick", "Smart", "Fast", "Sharp", "Wise", "Bold", "Calm"}
	nouns := []string{"Penguin", "Dragon", "Phoenix", "Tiger", "Eagle", "Wolf", "Lion", "Bear", "Fox", "Hawk"}
	
	adj := adjectives[rand.Intn(len(adjectives))]
	noun := nouns[rand.Intn(len(nouns))]
	num := rand.Intn(999)
	
	return fmt.Sprintf("%s%s%d", adj, noun, num)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	client := &Client{
		conn: conn,
	}
	
	s.mutex.Lock()
	s.clients[conn] = client
	s.mutex.Unlock()

	defer func() {
		s.mutex.Lock()
		delete(s.clients, conn)
		s.mutex.Unlock()
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
		}
	}
}

func (s *Server) handleJoin(client *Client, msg Message) {
	client.room = msg.Room
	client.username = generateUsername()

	// Load existing strokes for the room
	strokes, err := s.loadRoomStrokes(client.room)
	if err != nil {
		log.Printf("Error loading strokes: %v", err)
	}

	// Send join confirmation
	response := Message{
		Type:     "joined",
		Room:     client.room,
		Username: client.username,
		Data:     strokes,
	}
	
	client.conn.WriteJSON(response)

	// Subscribe to Redis channel for this room
	go s.subscribeToRoom(client.room)
}

func (s *Server) handleStroke(client *Client, msg Message) {
	// Save stroke to PostgreSQL
	err := s.saveStroke(client.room, client.username, msg.Data)
	if err != nil {
		log.Printf("Error saving stroke: %v", err)
		return
	}

	// Broadcast to Redis
	strokeMsg := Message{
		Type:     "stroke",
		Room:     client.room,
		Username: client.username,
		Data:     msg.Data,
	}
	
	strokeJSON, _ := json.Marshal(strokeMsg)
	s.redis.Publish(context.Background(), "room:"+client.room, strokeJSON)
}

func (s *Server) handleClear(client *Client, msg Message) {
	// Clear strokes from PostgreSQL
	err := s.clearRoomStrokes(client.room)
	if err != nil {
		log.Printf("Error clearing strokes: %v", err)
		return
	}

	// Broadcast clear message
	clearMsg := Message{
		Type:     "clear",
		Room:     client.room,
		Username: client.username,
	}
	
	clearJSON, _ := json.Marshal(clearMsg)
	s.redis.Publish(context.Background(), "room:"+client.room, clearJSON)
}

func (s *Server) loadRoomStrokes(room string) ([]Stroke, error) {
	rows, err := s.db.Query(`
		SELECT stroke_data FROM strokes 
		WHERE room_id = (SELECT id FROM rooms WHERE name = $1)
		ORDER BY created_at ASC
	`, room)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strokes []Stroke
	for rows.Next() {
		var strokeData []byte
		if err := rows.Scan(&strokeData); err != nil {
			return nil, err
		}
		
		var stroke Stroke
		if err := json.Unmarshal(strokeData, &stroke); err != nil {
			return nil, err
		}
		strokes = append(strokes, stroke)
	}
	
	return strokes, nil
}

func (s *Server) saveStroke(room, username string, strokeData interface{}) error {
	strokeJSON, err := json.Marshal(strokeData)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(`
		INSERT INTO strokes (room_id, user_name, stroke_data)
		VALUES ((SELECT id FROM rooms WHERE name = $1), $2, $3)
	`, room, username, strokeJSON)
	
	return err
}

func (s *Server) clearRoomStrokes(room string) error {
	_, err := s.db.Exec(`
		DELETE FROM strokes 
		WHERE room_id = (SELECT id FROM rooms WHERE name = $1)
	`, room)
	
	return err
}

func (s *Server) subscribeToRoom(room string) {
	pubsub := s.redis.Subscribe(context.Background(), "room:"+room)
	defer pubsub.Close()

	for {
		msg, err := pubsub.ReceiveMessage(context.Background())
		if err != nil {
			log.Printf("Redis receive error: %v", err)
			break
		}

		// Broadcast to all clients in the room
		s.mutex.RLock()
		for conn, client := range s.clients {
			if client.room == room {
				conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
			}
		}
		s.mutex.RUnlock()
	}
}

func main() {
	// Initialize random seed
	rand.Seed(time.Now().UnixNano())

	// Connect to PostgreSQL
	db, err := sql.Open("postgres", "postgres://postgres:password@localhost:5432/whiteboard?sslmode=disable")
	if err != nil {
		log.Fatal("Failed to connect to PostgreSQL:", err)
	}
	defer db.Close()

	// Test database connection
	err = db.Ping()
	if err != nil {
		log.Fatal("Failed to ping PostgreSQL:", err)
	}
	log.Println("Connected to PostgreSQL")

	// Connect to Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
		DB:   0,
	})

	// Test Redis connection
	ctx := context.Background()
	_, err = redisClient.Ping(ctx).Result()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	log.Println("Connected to Redis")

	// Create server
	server := &Server{
		db:      db,
		redis:   redisClient,
		clients: make(map[*websocket.Conn]*Client),
	}

	// Setup routes
	http.HandleFunc("/ws", server.handleWebSocket)
	
	// Serve static files for testing
	http.Handle("/", http.FileServer(http.Dir("../frontend/dist")))

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
