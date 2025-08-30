package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type CanvasState struct {
	ID         string                 `json:"id" db:"id"`
	RoomID     string                 `json:"room_id" db:"room_id"`
	CanvasData map[string]interface{} `json:"canvas_data"`
	SavedAt    time.Time              `json:"saved_at" db:"saved_at"`
	Version    int                    `json:"version" db:"version"`
	SavedBy    string                 `json:"saved_by" db:"saved_by"`
}

type CanvasService struct {
	db    *sql.DB
	redis *redis.Client
}

func NewCanvasService(db *sql.DB, redis *redis.Client) *CanvasService {
	return &CanvasService{
		db:    db,
		redis: redis,
	}
}

// Save canvas state to database
func (cs *CanvasService) SaveCanvasState(roomID string, canvasData map[string]interface{}, savedBy string) (*CanvasState, error) {
	// Get current version
	version, err := cs.getNextVersion(roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get version: %v", err)
	}

	// Create canvas state record
	canvasState := &CanvasState{
		ID:         fmt.Sprintf("canvas_%s_v%d", roomID, version),
		RoomID:     roomID,
		CanvasData: canvasData,
		SavedAt:    time.Now(),
		Version:    version,
		SavedBy:    savedBy,
	}

	// Serialize canvas data
	canvasJSON, err := json.Marshal(canvasData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal canvas data: %v", err)
	}

	// Save to database
	query := `
		INSERT INTO canvas_states (id, room_id, canvas_data, saved_at, version, saved_by)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err = cs.db.Exec(query, canvasState.ID, canvasState.RoomID, canvasJSON,
		canvasState.SavedAt, canvasState.Version, canvasState.SavedBy)
	if err != nil {
		return nil, fmt.Errorf("failed to save to database: %v", err)
	}

	// Cache latest state in Redis
	cs.cacheLatestState(roomID, canvasState)

	// Clear pending changes flag
	cs.clearPendingChanges(roomID)

	log.Printf("💾 Canvas saved: room=%s, version=%d, by=%s", roomID, version, savedBy)

	return canvasState, nil
}

// Load latest canvas state
func (cs *CanvasService) LoadCanvasState(roomID string) (*CanvasState, error) {
	// Try Redis cache first
	cached, err := cs.getFromCache(roomID)
	if err == nil && cached != nil {
		return cached, nil
	}

	// Load from database
	query := `
		SELECT id, room_id, canvas_data, saved_at, version, COALESCE(saved_by, '') as saved_by
		FROM canvas_states 
		WHERE room_id = $1 
		ORDER BY version DESC 
		LIMIT 1
	`

	var state CanvasState
	var canvasJSON []byte
	err = cs.db.QueryRow(query, roomID).Scan(
		&state.ID, &state.RoomID, &canvasJSON, &state.SavedAt, &state.Version, &state.SavedBy,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No canvas state yet
	}
	if err != nil {
		return nil, err
	}

	// Parse canvas data
	if len(canvasJSON) > 0 {
		err = json.Unmarshal(canvasJSON, &state.CanvasData)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal canvas data: %v", err)
		}
	}

	// Cache for future requests
	cs.cacheLatestState(roomID, &state)

	return &state, nil
}

// Auto-save mechanism
func (cs *CanvasService) StartAutoSave() {
	ticker := time.NewTicker(30 * time.Second)

	go func() {
		for range ticker.C {
			cs.performAutoSave()
		}
	}()

	log.Println("📸 Canvas auto-save started (30-second interval)")
}

func (cs *CanvasService) performAutoSave() {
	// Get all active rooms that need saving
	query := `
		SELECT DISTINCT room_id FROM rooms 
		WHERE is_active = true 
		AND last_activity > $1
	`

	cutoffTime := time.Now().Add(-5 * time.Minute) // Only save recently active rooms
	rows, err := cs.db.Query(query, cutoffTime)
	if err != nil {
		log.Printf("Auto-save query error: %v", err)
		return
	}
	defer rows.Close()

	savedCount := 0
	for rows.Next() {
		var roomID string
		if err := rows.Scan(&roomID); err != nil {
			continue
		}

		// Check if room has pending changes
		if cs.hasPendingChanges(roomID) {
			cs.saveRoomCanvas(roomID)
			savedCount++
		}
	}

	if savedCount > 0 {
		log.Printf("🔄 Auto-saved %d rooms", savedCount)
	}
}

func (cs *CanvasService) saveRoomCanvas(roomID string) {
	// Get current canvas data from Redis or generate placeholder
	canvasData := cs.getCurrentCanvasData(roomID)
	if canvasData == nil {
		return // No changes to save
	}

	// Save with auto-save indicator
	_, err := cs.SaveCanvasState(roomID, canvasData, "auto-save")
	if err != nil {
		log.Printf("❌ Auto-save failed for room %s: %v", roomID, err)
	}
}

func (cs *CanvasService) getCurrentCanvasData(roomID string) map[string]interface{} {
	// Try to get from Redis cache first
	key := fmt.Sprintf("room:%s:canvas_data", roomID)
	result, err := cs.redis.Get(context.Background(), key).Result()
	if err == nil && result != "" {
		var canvasData map[string]interface{}
		if json.Unmarshal([]byte(result), &canvasData) == nil {
			return canvasData
		}
	}

	// Return placeholder structure for now
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

func (cs *CanvasService) hasPendingChanges(roomID string) bool {
	// Check Redis for pending changes flag
	key := fmt.Sprintf("room:%s:changes_pending", roomID)
	result, _ := cs.redis.Get(context.Background(), key).Result()
	return result == "true"
}

func (cs *CanvasService) MarkPendingChanges(roomID string) {
	key := fmt.Sprintf("room:%s:changes_pending", roomID)
	cs.redis.Set(context.Background(), key, "true", 35*time.Second) // Slightly longer than auto-save interval
}

func (cs *CanvasService) clearPendingChanges(roomID string) {
	key := fmt.Sprintf("room:%s:changes_pending", roomID)
	cs.redis.Del(context.Background(), key)
}

func (cs *CanvasService) getNextVersion(roomID string) (int, error) {
	query := `
		SELECT COALESCE(MAX(version), 0) + 1 
		FROM canvas_states 
		WHERE room_id = $1
	`

	var version int
	err := cs.db.QueryRow(query, roomID).Scan(&version)
	return version, err
}

func (cs *CanvasService) cacheLatestState(roomID string, state *CanvasState) {
	// Cache in Redis for 1 hour
	key := fmt.Sprintf("room:%s:latest_canvas", roomID)
	stateJSON, err := json.Marshal(state)
	if err != nil {
		return
	}

	cs.redis.Set(context.Background(), key, stateJSON, time.Hour)
}

func (cs *CanvasService) getFromCache(roomID string) (*CanvasState, error) {
	key := fmt.Sprintf("room:%s:latest_canvas", roomID)
	result, err := cs.redis.Get(context.Background(), key).Result()
	if err != nil {
		return nil, err
	}

	var state CanvasState
	err = json.Unmarshal([]byte(result), &state)
	return &state, err
}

// Update canvas data in real-time
func (cs *CanvasService) UpdateCanvasData(roomID string, canvasData map[string]interface{}) error {
	// Store in Redis for real-time access
	key := fmt.Sprintf("room:%s:canvas_data", roomID)
	dataJSON, err := json.Marshal(canvasData)
	if err != nil {
		return err
	}

	// Store with TTL of 1 hour
	err = cs.redis.Set(context.Background(), key, dataJSON, time.Hour).Err()
	if err != nil {
		return err
	}

	// Mark as having changes for auto-save
	cs.MarkPendingChanges(roomID)

	return nil
}
