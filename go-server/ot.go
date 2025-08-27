package main

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Operation represents a single user action that can be transformed
type Operation struct {
	ID           string                 `json:"id"`
	Type         string                 `json:"type"`
	RoomID       string                 `json:"room_id"`
	UserID       string                 `json:"user_id"`
	Version      int64                  `json:"version"`
	Data         map[string]interface{} `json:"data"`
	CreatedAt    time.Time              `json:"created_at"`
	AppliedAt    *time.Time             `json:"applied_at,omitempty"`
	TransformedFrom []string            `json:"transformed_from,omitempty"`
}

// OperationType constants for different operation types
const (
	OpStrokeCreate = "stroke_create"
	OpStrokeUpdate = "stroke_update"
	OpStrokeDelete = "stroke_delete"
	OpCursorMove   = "cursor_move"
	OpSelection    = "selection"
	OpClear        = "clear_all"
)

// TransformResult represents the result of an OT transformation
type TransformResult struct {
	Operation *Operation `json:"operation"`
	Success   bool       `json:"success"`
	Error     string     `json:"error,omitempty"`
}

// OTEngine handles Operational Transform logic
type OTEngine struct {
	server     *Server
	rooms      map[string]*RoomState
	roomsMutex sync.RWMutex
}

// RoomState tracks the operational state of a room
type RoomState struct {
	RoomID         string
	CurrentVersion int64
	Operations     []*Operation // Recent operations for transformation
	Users          map[string]*UserState
	mutex          sync.RWMutex
}

// UserState tracks individual user's operational state
type UserState struct {
	UserID         string
	LastVersion    int64
	PendingOps     []*Operation
	CursorPosition *Point
	ViewportBounds *BoundingBox
	IsActive       bool
	LastActivity   time.Time
}

// Point represents a 2D coordinate
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// BoundingBox represents a rectangular area
type BoundingBox struct {
	X1 float64 `json:"x1"`
	Y1 float64 `json:"y1"`
	X2 float64 `json:"x2"`
	Y2 float64 `json:"y2"`
}

// NewOTEngine creates a new Operational Transform engine
func NewOTEngine(server *Server) *OTEngine {
	return &OTEngine{
		server: server,
		rooms:  make(map[string]*RoomState),
	}
}

// GetOrCreateRoom gets or creates room state for OT
func (ot *OTEngine) GetOrCreateRoom(roomID string) *RoomState {
	ot.roomsMutex.Lock()
	defer ot.roomsMutex.Unlock()

	if room, exists := ot.rooms[roomID]; exists {
		return room
	}

	// Load current version from database
	var currentVersion int64
	err := ot.server.db.QueryRow(
		"SELECT current_version FROM rooms WHERE id = $1",
		roomID,
	).Scan(&currentVersion)
	if err != nil {
		log.Printf("Error loading room version: %v", err)
		currentVersion = 0
	}

	room := &RoomState{
		RoomID:         roomID,
		CurrentVersion: currentVersion,
		Operations:     make([]*Operation, 0, 100), // Keep last 100 ops
		Users:          make(map[string]*UserState),
	}

	ot.rooms[roomID] = room
	return room
}

// ProcessOperation handles incoming operation and applies OT
func (ot *OTEngine) ProcessOperation(op *Operation) (*TransformResult, error) {
	room := ot.GetOrCreateRoom(op.RoomID)
	room.mutex.Lock()
	defer room.mutex.Unlock()

	// Generate unique operation ID if not provided
	if op.ID == "" {
		op.ID = uuid.New().String()
	}

	// Set creation time
	op.CreatedAt = time.Now()

	// Transform operation against concurrent operations
	transformedOp, err := ot.transformOperation(room, op)
	if err != nil {
		return &TransformResult{
			Operation: op,
			Success:   false,
			Error:     err.Error(),
		}, err
	}

	// Increment room version and assign to operation
	room.CurrentVersion++
	transformedOp.Version = room.CurrentVersion
	now := time.Now()
	transformedOp.AppliedAt = &now

	// Persist operation to database
	err = ot.persistOperation(transformedOp)
	if err != nil {
		room.CurrentVersion-- // Rollback version on error
		return &TransformResult{
			Operation: transformedOp,
			Success:   false,
			Error:     fmt.Sprintf("Failed to persist operation: %v", err),
		}, err
	}

	// Add to room's operation history (keep last 100)
	room.Operations = append(room.Operations, transformedOp)
	if len(room.Operations) > 100 {
		room.Operations = room.Operations[1:]
	}

	// Update user state
	ot.updateUserState(room, transformedOp)

	return &TransformResult{
		Operation: transformedOp,
		Success:   true,
	}, nil
}

// transformOperation applies OT rules to resolve conflicts
func (ot *OTEngine) transformOperation(room *RoomState, op *Operation) (*Operation, error) {
	// Clone operation for transformation
	transformedOp := &Operation{
		ID:        op.ID,
		Type:      op.Type,
		RoomID:    op.RoomID,
		UserID:    op.UserID,
		Data:      make(map[string]interface{}),
		CreatedAt: op.CreatedAt,
	}

	// Deep copy data
	for k, v := range op.Data {
		transformedOp.Data[k] = v
	}

	// Get concurrent operations (operations after client's last known version)
	clientVersion := int64(0)
	if v, ok := op.Data["client_version"]; ok {
		if version, ok := v.(float64); ok {
			clientVersion = int64(version)
		}
	}

	concurrentOps := ot.getConcurrentOperations(room, clientVersion)

	// Transform against each concurrent operation
	var transformationChain []string
	for _, concurrentOp := range concurrentOps {
		var err error
		transformedOp, err = ot.transformAgainst(transformedOp, concurrentOp)
		if err != nil {
			return nil, fmt.Errorf("transformation failed: %v", err)
		}
		transformationChain = append(transformationChain, concurrentOp.ID)
	}

	transformedOp.TransformedFrom = transformationChain
	return transformedOp, nil
}

// transformAgainst transforms op1 against op2 based on OT rules
func (ot *OTEngine) transformAgainst(op1, op2 *Operation) (*Operation, error) {
	// Clone operation
	result := &Operation{
		ID:     op1.ID,
		Type:   op1.Type,
		RoomID: op1.RoomID,
		UserID: op1.UserID,
		Data:   make(map[string]interface{}),
	}

	// Deep copy data
	for k, v := range op1.Data {
		result.Data[k] = v
	}

	// Apply transformation based on operation types
	switch {
	case op1.Type == OpStrokeCreate && op2.Type == OpStrokeCreate:
		// Two stroke creations - no conflict, both can proceed
		return result, nil

	case op1.Type == OpStrokeUpdate && op2.Type == OpStrokeUpdate:
		// Two updates to same stroke - handle based on stroke ID
		return ot.transformStrokeUpdates(result, op2)

	case op1.Type == OpStrokeDelete && op2.Type == OpStrokeUpdate:
		// Delete vs Update - delete wins
		return result, nil

	case op1.Type == OpStrokeUpdate && op2.Type == OpStrokeDelete:
		// Update vs Delete - delete wins, discard update
		result.Type = "noop"
		return result, nil

	case op1.Type == OpCursorMove:
		// Cursor moves don't conflict with strokes
		return result, nil

	case op1.Type == OpClear && op2.Type != OpClear:
		// Clear operation vs anything else - clear wins
		return result, nil

	default:
		// Default: no transformation needed
		return result, nil
	}
}

// transformStrokeUpdates handles transformation of concurrent stroke updates
func (ot *OTEngine) transformStrokeUpdates(op1, op2 *Operation) (*Operation, error) {
	// Get stroke IDs
	strokeID1, ok1 := op1.Data["stroke_id"].(string)
	strokeID2, ok2 := op2.Data["stroke_id"].(string)

	if !ok1 || !ok2 {
		return op1, nil // Can't transform without stroke IDs
	}

	// If different strokes, no conflict
	if strokeID1 != strokeID2 {
		return op1, nil
	}

	// Same stroke being updated - apply timestamp-based resolution
	// Later timestamp wins
	timestamp1, ok1 := op1.Data["timestamp"].(float64)
	timestamp2, ok2 := op2.Data["timestamp"].(float64)

	if ok1 && ok2 && timestamp1 < timestamp2 {
		// op2 is newer, discard op1
		op1.Type = "noop"
	}

	return op1, nil
}

// getConcurrentOperations returns operations that happened after clientVersion
func (ot *OTEngine) getConcurrentOperations(room *RoomState, clientVersion int64) []*Operation {
	var concurrent []*Operation

	for _, op := range room.Operations {
		if op.Version > clientVersion {
			concurrent = append(concurrent, op)
		}
	}

	return concurrent
}

// persistOperation saves operation to database
func (ot *OTEngine) persistOperation(op *Operation) error {
	dataJSON, err := json.Marshal(op.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal operation data: %v", err)
	}

	_, err = ot.server.db.Exec(`
		INSERT INTO operations (
			id, room_id, user_id, operation_type, operation_data, 
			version, transformed_from, created_at, applied_at
		) VALUES ($1, $2, $3, $4, $5, $6, '{}'::uuid[], $7, $8)`,
		op.ID, op.RoomID, op.UserID, op.Type, dataJSON,
		op.Version, op.CreatedAt, op.AppliedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to insert operation: %v", err)
	}

	// Also update room version
	_, err = ot.server.db.Exec(
		"UPDATE rooms SET current_version = $1, last_activity = NOW() WHERE id = $2",
		op.Version, op.RoomID,
	)

	return err
}

// updateUserState updates user's operational state
func (ot *OTEngine) updateUserState(room *RoomState, op *Operation) {
	if user, exists := room.Users[op.UserID]; exists {
		user.LastVersion = op.Version
		user.LastActivity = time.Now()

		// Update cursor position if it's a cursor move
		if op.Type == OpCursorMove {
			if x, ok := op.Data["x"].(float64); ok {
				if y, ok := op.Data["y"].(float64); ok {
					user.CursorPosition = &Point{X: x, Y: y}
				}
			}
		}
	} else {
		// Create new user state
		user := &UserState{
			UserID:       op.UserID,
			LastVersion:  op.Version,
			PendingOps:   make([]*Operation, 0),
			IsActive:     true,
			LastActivity: time.Now(),
		}

		room.Users[op.UserID] = user
	}
}

// GetOperationsSince returns operations since given version for sync
func (ot *OTEngine) GetOperationsSince(roomID string, version int64) ([]*Operation, error) {
	rows, err := ot.server.db.Query(`
		SELECT id, operation_type, operation_data, version, user_id, created_at, applied_at
		FROM operations 
		WHERE room_id = $1 AND version > $2 
		ORDER BY version ASC 
		LIMIT 100`,
		roomID, version,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var operations []*Operation
	for rows.Next() {
		op := &Operation{RoomID: roomID}
		var dataJSON []byte
		var appliedAt *time.Time

		err := rows.Scan(
			&op.ID, &op.Type, &dataJSON, &op.Version,
			&op.UserID, &op.CreatedAt, &appliedAt,
		)
		if err != nil {
			return nil, err
		}

		// Parse operation data
		err = json.Unmarshal(dataJSON, &op.Data)
		if err != nil {
			return nil, err
		}

		op.AppliedAt = appliedAt
		operations = append(operations, op)
	}

	return operations, nil
}

// CleanupOldOperations removes old operations to prevent memory leaks
func (ot *OTEngine) CleanupOldOperations(maxAge time.Duration) error {
	cutoff := time.Now().Add(-maxAge)
	
	_, err := ot.server.db.Exec(
		"DELETE FROM operations WHERE created_at < $1",
		cutoff,
	)
	
	if err != nil {
		return fmt.Errorf("failed to cleanup old operations: %v", err)
	}

	// Also cleanup in-memory operations
	ot.roomsMutex.Lock()
	defer ot.roomsMutex.Unlock()

	for _, room := range ot.rooms {
		room.mutex.Lock()
		var recentOps []*Operation
		for _, op := range room.Operations {
			if op.CreatedAt.After(cutoff) {
				recentOps = append(recentOps, op)
			}
		}
		room.Operations = recentOps
		room.mutex.Unlock()
	}

	return nil
}

// GetRoomUsers returns active users in a room
func (ot *OTEngine) GetRoomUsers(roomID string) []*UserState {
	room := ot.GetOrCreateRoom(roomID)
	room.mutex.RLock()
	defer room.mutex.RUnlock()

	var users []*UserState
	for _, user := range room.Users {
		if user.IsActive && time.Since(user.LastActivity) < 5*time.Minute {
			users = append(users, user)
		}
	}

	return users
}