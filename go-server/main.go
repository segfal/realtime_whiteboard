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
	db                *sql.DB
	redis             *redis.Client
	clients           map[*websocket.Conn]*Client
	rooms             map[string]map[*websocket.Conn]*Client
	roomSubscriptions map[string]*redis.PubSub
	mutex             sync.RWMutex
	otEngine          *OTEngine
	spatialIndex      *SpatialIndex
	compressionManager *CompressionManager
	sessionRecovery   *SessionRecovery
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
		// Remove client from room
		if client.room != "" {
			if roomClients, exists := s.rooms[client.room]; exists {
				delete(roomClients, conn)
				// If room is empty, close Redis subscription
				if len(roomClients) == 0 {
					if pubsub := s.roomSubscriptions[client.room]; pubsub != nil {
						pubsub.Close()
						delete(s.roomSubscriptions, client.room)
						delete(s.rooms, client.room)
					}
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
		case "operation":
			s.handleOperation(client, msg)
		case "clear":
			s.handleClear(client, msg)
		case "chat:message":
			s.handleChatMessage(client, msg)
		}
	}
}

func (s *Server) handleJoin(client *Client, msg Message) {
	client.room = msg.Room
	client.username = generateUsername()

	s.mutex.Lock()
	// Initialize room if it doesn't exist
	if s.rooms[client.room] == nil {
		s.rooms[client.room] = make(map[*websocket.Conn]*Client)
	}
	s.rooms[client.room][client.conn] = client

	// Start Redis subscription for room if not already subscribed
	if s.roomSubscriptions[client.room] == nil {
		pubsub := s.redis.Subscribe(context.Background(), "room:"+client.room)
		s.roomSubscriptions[client.room] = pubsub
		go s.subscribeToRoom(client.room)
	}
	s.mutex.Unlock()

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

	log.Printf("Client %s joined room %s", client.username, client.room)
}

func (s *Server) handleStroke(client *Client, msg Message) {
	// Resolve room ID by name for OT/persistence consistency
	roomID, err := s.getRoomIDByName(client.room)
	if err != nil {
		log.Printf("Failed to resolve room ID for room %s: %v", client.room, err)
		return
	}

	// Create operation for OT processing
	operation := &Operation{
		Type:   OpStrokeCreate,
		RoomID: roomID,
		UserID: client.username,
		Data:   map[string]interface{}{
			"stroke_data": msg.Data,
		},
	}

	// Add client version if provided
	if clientVersion, ok := msg.Data.(map[string]interface{})["client_version"]; ok {
		operation.Data["client_version"] = clientVersion
	}

	// Process operation through OT engine
	result, err := s.otEngine.ProcessOperation(operation)
	if err != nil {
		log.Printf("Error processing stroke operation: %v", err)
		// Send error back to client
		errorMsg := Message{
			Type: "error",
			Room: client.room,
			Data: map[string]interface{}{
				"message": "Failed to process stroke",
				"error":   err.Error(),
			},
		}
		client.conn.WriteJSON(errorMsg)
		return
	}

	if !result.Success {
		log.Printf("Operation transformation failed: %v", result.Error)
		return
	}

	// Save stroke with spatial data
	err = s.saveStrokeWithSpatial(result.Operation)
	if err != nil {
		log.Printf("Error saving stroke: %v", err)
		return
	}

	// Broadcast transformed operation to all clients
	broadcastMsg := Message{
		Type:     "operation",
		Room:     client.room,
		Username: result.Operation.UserID,
		Data: map[string]interface{}{
			"operation": result.Operation,
		},
	}
	
	broadcastJSON, _ := json.Marshal(broadcastMsg)
	s.redis.Publish(context.Background(), "room:"+client.room, broadcastJSON)
	// Local broadcast to connected clients to avoid subscription timing gaps
	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			_ = conn.WriteMessage(websocket.TextMessage, broadcastJSON)
		}
	}
	s.mutex.RUnlock()
}

// handleOperation processes full Operation payloads from clients (Redux path)
func (s *Server) handleOperation(client *Client, msg Message) {
    // Resolve room ID
    roomID, err := s.getRoomIDByName(client.room)
    if err != nil {
        log.Printf("Failed to resolve room ID for room %s: %v", client.room, err)
        return
    }

    // msg.Data should be the operation object
    dataMap, ok := msg.Data.(map[string]interface{})
    if !ok {
        log.Printf("operation data is not an object: %T", msg.Data)
        return
    }

    // Build Operation
    op := &Operation{
        Type:   OpStrokeCreate,
        RoomID: roomID,
        UserID: client.username,
        Data:   map[string]interface{}{},
    }

    if t, ok := dataMap["type"].(string); ok {
        op.Type = t
    }
    if uid, ok := dataMap["userId"].(string); ok && uid != "" {
        op.UserID = uid
    }
    if d, ok := dataMap["data"].(map[string]interface{}); ok {
        // Expect stroke_data nested for stroke_create
        if sd, ok := d["stroke_data"]; ok {
            op.Data["stroke_data"] = sd
        } else {
            // If client sent raw stroke fields, wrap them
            op.Data["stroke_data"] = d
        }
        if cv, ok := d["client_version"]; ok {
            op.Data["client_version"] = cv
        }
    } else {
        // If entire dataMap is stroke_data
        op.Data["stroke_data"] = dataMap
    }

    // Process via OT
    result, err := s.otEngine.ProcessOperation(op)
    if err != nil || !result.Success {
        if err != nil {
            log.Printf("Error processing operation: %v", err)
        } else {
            log.Printf("Operation transformation failed: %v", result.Error)
        }
        errorMsg := Message{
            Type: "error",
            Room: client.room,
            Data: map[string]interface{}{
                "message": "Failed to process operation",
                "error":   result.Error,
            },
        }
        client.conn.WriteJSON(errorMsg)
        return
    }

    // Persist stroke with spatial index if stroke create
    if result.Operation.Type == OpStrokeCreate {
        if err := s.saveStrokeWithSpatial(result.Operation); err != nil {
            log.Printf("Error saving stroke: %v", err)
            return
        }
    }

    // Broadcast
    broadcastMsg := Message{
        Type:     "operation",
        Room:     client.room,
        Username: result.Operation.UserID,
        Data: map[string]interface{}{
            "operation": result.Operation,
        },
    }
    broadcastJSON, _ := json.Marshal(broadcastMsg)
    s.redis.Publish(context.Background(), "room:"+client.room, broadcastJSON)
    s.mutex.RLock()
    if roomClients := s.rooms[client.room]; roomClients != nil {
        for conn := range roomClients {
            _ = conn.WriteMessage(websocket.TextMessage, broadcastJSON)
        }
    }
    s.mutex.RUnlock()
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
	// Local broadcast
	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			_ = conn.WriteMessage(websocket.TextMessage, clearJSON)
		}
	}
	s.mutex.RUnlock()
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

// saveStrokeWithSpatial saves stroke with spatial bounding box for indexing
func (s *Server) saveStrokeWithSpatial(op *Operation) error {
	strokeData, ok := op.Data["stroke_data"]
	if !ok {
		return fmt.Errorf("no stroke_data in operation")
	}

	strokeJSON, err := json.Marshal(strokeData)
	if err != nil {
		return err
	}

	// Calculate bounding box from stroke points
	bbox, err := s.calculateStrokeBoundingBox(strokeData)
	if err != nil {
		return fmt.Errorf("failed to calculate bounding box: %v", err)
	}

	// Insert stroke with spatial data and OT version (use room_id directly)
	// Map OT operation type to strokes.operation_type enum
	opType := "create"
	switch op.Type {
	case OpStrokeCreate:
		opType = "create"
	case OpStrokeUpdate:
		opType = "update"
	case OpStrokeDelete:
		opType = "delete"
	}

	_, err = s.db.Exec(`
		INSERT INTO strokes (id, room_id, user_id, stroke_data, version, operation_type, bbox, created_at)
		VALUES (
			$1,
			$2,
			$3, $4, $5, $6,
			box(point($7,$8), point($9,$10)),
			$11
		)`,
		op.ID, op.RoomID, op.UserID, strokeJSON, op.Version, opType,
		bbox.X1, bbox.Y1, bbox.X2, bbox.Y2, op.CreatedAt,
	)
	
	if err != nil {
		return err
	}

	// Add to spatial index for efficient viewport queries
	indexedStroke := &IndexedStroke{
		ID:       op.ID,
		RoomID:   op.RoomID,
		UserID:   op.UserID,
		Data:     strokeData,
		Version:  op.Version,
		BBox:     *bbox,
		IsActive: true,
	}

	return s.spatialIndex.Insert(indexedStroke)
}

// calculateStrokeBoundingBox calculates spatial bounding box for stroke
func (s *Server) calculateStrokeBoundingBox(strokeData interface{}) (*BoundingBox, error) {
	// Default bounding box
	bbox := &BoundingBox{X1: 0, Y1: 0, X2: 100, Y2: 100}

	// Parse stroke data to extract points
	strokeMap, ok := strokeData.(map[string]interface{})
	if !ok {
		return bbox, nil
	}

	points, ok := strokeMap["points"].([]interface{})
	if !ok || len(points) == 0 {
		return bbox, nil
	}

	// Initialize with first point
	firstPoint, ok := points[0].([]interface{})
	if !ok || len(firstPoint) < 2 {
		return bbox, nil
	}

	x, ok1 := firstPoint[0].(float64)
	y, ok2 := firstPoint[1].(float64)
	if !ok1 || !ok2 {
		return bbox, nil
	}

	bbox.X1, bbox.Y1 = x, y
	bbox.X2, bbox.Y2 = x, y

	// Expand bounding box for all points
	for _, pointInterface := range points[1:] {
		point, ok := pointInterface.([]interface{})
		if !ok || len(point) < 2 {
			continue
		}

		x, ok1 := point[0].(float64)
		y, ok2 := point[1].(float64)
		if !ok1 || !ok2 {
			continue
		}

		if x < bbox.X1 {
			bbox.X1 = x
		}
		if x > bbox.X2 {
			bbox.X2 = x
		}
		if y < bbox.Y1 {
			bbox.Y1 = y
		}
		if y > bbox.Y2 {
			bbox.Y2 = y
		}
	}

	// Add some padding for stroke thickness
	padding := 10.0
	bbox.X1 -= padding
	bbox.Y1 -= padding
	bbox.X2 += padding
	bbox.Y2 += padding

	return bbox, nil
}

func (s *Server) clearRoomStrokes(room string) error {
	_, err := s.db.Exec(`
		DELETE FROM strokes 
		WHERE room_id = (SELECT id FROM rooms WHERE name = $1)
	`, room)
	
	return err
}

func (s *Server) subscribeToRoom(room string) {
	s.mutex.RLock()
	pubsub := s.roomSubscriptions[room]
	s.mutex.RUnlock()

	if pubsub == nil {
		log.Printf("No subscription found for room: %s", room)
		return
	}

	defer func() {
		s.mutex.Lock()
		if s.roomSubscriptions[room] == pubsub {
			pubsub.Close()
			delete(s.roomSubscriptions, room)
		}
		s.mutex.Unlock()
	}()

	for {
		msg, err := pubsub.ReceiveMessage(context.Background())
		if err != nil {
			log.Printf("Redis receive error for room %s: %v", room, err)
			break
		}

		// Broadcast to all clients in the room
		s.mutex.RLock()
		roomClients := s.rooms[room]
		if roomClients != nil {
			log.Printf("Broadcasting message to %d clients in room %s", len(roomClients), room)
			for conn := range roomClients {
				err := conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
				if err != nil {
					log.Printf("Failed to send message to client, removing connection: %v", err)
					// Clean up dead connection
					conn.Close()
					s.mutex.RUnlock()
					s.mutex.Lock()
					if rc, ok := s.rooms[room]; ok {
						delete(rc, conn)
					}
					s.mutex.Unlock()
					s.mutex.RLock()
				}
			}
		}
		s.mutex.RUnlock()
	}
}

// handleChatMessage broadcasts chat messages to all clients in the room via Redis
func (s *Server) handleChatMessage(client *Client, msg Message) {
	chatMsg := Message{
		Type:     "chat:message",
		Room:     client.room,
		Username: client.username,
		Data:     msg.Data,
	}
	chatJSON, _ := json.Marshal(chatMsg)
	s.redis.Publish(context.Background(), "room:"+client.room, chatJSON)
	// Local broadcast
	s.mutex.RLock()
	if roomClients := s.rooms[client.room]; roomClients != nil {
		for conn := range roomClients {
			_ = conn.WriteMessage(websocket.TextMessage, chatJSON)
		}
	}
	s.mutex.RUnlock()
}

// getRoomIDByName resolves a room name to its ID
func (s *Server) getRoomIDByName(roomName string) (string, error) {
	var id string
	err := s.db.QueryRow("SELECT id FROM rooms WHERE name = $1", roomName).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func main() {
	// Note: Go 1.20+ automatically seeds random number generator

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

	// Create server with OT engine and spatial index
	server := &Server{
		db:                db,
		redis:             redisClient,
		clients:           make(map[*websocket.Conn]*Client),
		rooms:             make(map[string]map[*websocket.Conn]*Client),
		roomSubscriptions: make(map[string]*redis.PubSub),
	}
	
	// Initialize OT engine, spatial index, compression, and session recovery
	server.otEngine = NewOTEngine(server)
	server.spatialIndex = NewSpatialIndex()
	server.compressionManager = NewCompressionManager(10, 100*time.Millisecond) // Batch 10 messages or 100ms timeout
	server.sessionRecovery = NewSessionRecovery(server)
	
	// Start cleanup routines
	server.sessionRecovery.StartCleanupRoutine()

	// Setup routes
	http.HandleFunc("/ws", server.handleWebSocket)
	http.HandleFunc("/api/viewport", server.handleViewportQuery)
	http.HandleFunc("/api/stats/spatial", server.handleSpatialStats)
	http.HandleFunc("/health", server.handleHealthCheck)
	
	// Serve static files for testing
	http.Handle("/", http.FileServer(http.Dir("../frontend/dist")))

	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
