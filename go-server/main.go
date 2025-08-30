package main

import (
	"log"
	"net/http"
	"os"
	"realtime_whiteboard/go-server/api"
	"realtime_whiteboard/go-server/database"
	"realtime_whiteboard/go-server/models"
	"realtime_whiteboard/go-server/redis"
	"realtime_whiteboard/go-server/services"
	"realtime_whiteboard/go-server/websocket"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found")
	}

	// Connect to PostgreSQL
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	log.Println("Connected to PostgreSQL")

	// Connect to Redis
	redisClient, err := redis.Connect()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	log.Println("Connected to Redis")

	// Initialize session manager
	sessionManager := models.NewSessionManager(db, redisClient)

	// Initialize services
	userService := services.NewUserService(db, redisClient)
	adminService := services.NewAdminService(db, redisClient, sessionManager)
	roomService := services.NewRoomService(db, redisClient)
	inviteService := services.NewInviteService(db, redisClient)
	canvasService := services.NewCanvasService(db, redisClient)

	// Start canvas auto-save
	canvasService.StartAutoSave()

	// Initialize the WebSocket hub
	hub := websocket.NewHub(db, redisClient, userService, sessionManager, adminService, canvasService)
	go hub.Run()

	// Create router with CORS middleware
	router := http.NewServeMux()

	// WebSocket handler
	router.HandleFunc("/ws/room/", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS for WebSocket
		w.Header().Set("Access-Control-Allow-Origin", "*")
		
		// Extract room ID from URL path
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 4 {
			http.Error(w, "Invalid room ID", http.StatusBadRequest)
			return
		}
		roomID := parts[3] // /ws/room/{roomId}
		
		// Log the WebSocket connection attempt
		log.Printf("WebSocket connection attempt for room: %s", roomID)
		
		// Serve WebSocket
		websocket.ServeWs(hub, w, r)
	})

	// API routes
	router.HandleFunc("/api/users/generate-id", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		api.HandleGenerateUserID(w, r, userService)
	})

	// Room-related routes
	apiHandlers := api.NewAPIHandlers(roomService, inviteService, userService)
	
	router.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		switch r.Method {
		case http.MethodPost:
			apiHandlers.CreateRoom(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	router.HandleFunc("/api/rooms/", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/rooms/")
		parts := strings.Split(path, "/")

		if len(parts) == 1 && parts[0] != "" {
			// Handle /api/rooms/{roomId}
			switch r.Method {
			case http.MethodGet:
				apiHandlers.GetRoom(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		} else if len(parts) == 2 && parts[1] == "invite" {
			// Handle /api/rooms/{roomId}/invite
			switch r.Method {
			case http.MethodPost:
				apiHandlers.CreateInviteLink(w, r)
			default:
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		}
	})

	router.HandleFunc("/api/rooms/join", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		apiHandlers.JoinRoom(w, r)
	})

	router.HandleFunc("/api/rooms/recent", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		apiHandlers.GetRecentRooms(w, r)
	})

	router.HandleFunc("/api/stats/global", func(w http.ResponseWriter, r *http.Request) {
		// Enable CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		apiHandlers.GetGlobalStats(w, r)
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}