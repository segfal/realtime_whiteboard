package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"
)

// SessionRecovery handles server-side session recovery and synchronization
type SessionRecovery struct {
	server *Server
}

// RecoveryRequest represents a client recovery request
type RecoveryRequest struct {
	RoomID      string `json:"room_id"`
	UserID      string `json:"user_id"`
	LastVersion int64  `json:"last_version"`
	SessionID   string `json:"session_id,omitempty"`
}

// RecoveryResponse represents the server's recovery response
type RecoveryResponse struct {
	Success          bool        `json:"success"`
	MissedOperations []Operation `json:"missed_operations"`
	CurrentVersion   int64       `json:"current_version"`
	RoomExists       bool        `json:"room_exists"`
	Message          string      `json:"message,omitempty"`
	Error            string      `json:"error,omitempty"`
}

// NewSessionRecovery creates a new session recovery handler
func NewSessionRecovery(server *Server) *SessionRecovery {
	return &SessionRecovery{server: server}
}

// HandleRecoveryRequest processes a client's session recovery request
func (sr *SessionRecovery) HandleRecoveryRequest(req *RecoveryRequest) (*RecoveryResponse, error) {
	// Validate room exists
	roomExists, currentVersion, err := sr.validateRoom(req.RoomID)
	if err != nil {
		return &RecoveryResponse{
			Success:    false,
			RoomExists: false,
			Error:      fmt.Sprintf("Failed to validate room: %v", err),
		}, err
	}

	if !roomExists {
		return &RecoveryResponse{
			Success:    false,
			RoomExists: false,
			Message:    "Room no longer exists",
		}, nil
	}

	// Get missed operations since client's last version
	missedOps, err := sr.getMissedOperations(req.RoomID, req.LastVersion)
	if err != nil {
		return &RecoveryResponse{
			Success:        false,
			RoomExists:     true,
			CurrentVersion: currentVersion,
			Error:          fmt.Sprintf("Failed to retrieve missed operations: %v", err),
		}, err
	}

	// Update user session if provided
	if req.SessionID != "" {
		err = sr.updateUserSession(req.RoomID, req.UserID, req.SessionID)
		if err != nil {
			log.Printf("Failed to update user session: %v", err)
			// Don't fail recovery for this
		}
	}

	message := fmt.Sprintf("Recovered successfully. Found %d missed operations.", len(missedOps))
	if len(missedOps) == 0 {
		message = "Session is up to date. No operations to recover."
	}

	return &RecoveryResponse{
		Success:          true,
		MissedOperations: missedOps,
		CurrentVersion:   currentVersion,
		RoomExists:       true,
		Message:          message,
	}, nil
}

// validateRoom checks if room exists and returns current version
func (sr *SessionRecovery) validateRoom(roomID string) (exists bool, currentVersion int64, err error) {
	err = sr.server.db.QueryRow(`
		SELECT current_version, is_active 
		FROM rooms 
		WHERE name = $1`,
		roomID,
	).Scan(&currentVersion, &exists)

	if err == sql.ErrNoRows {
		return false, 0, nil
	}

	if err != nil {
		return false, 0, err
	}

	return exists, currentVersion, nil
}

// getMissedOperations retrieves operations that occurred after the client's last known version
func (sr *SessionRecovery) getMissedOperations(roomID string, lastVersion int64) ([]Operation, error) {
	// Get operations from database
	rows, err := sr.server.db.Query(`
		SELECT 
			o.id, o.operation_type, o.operation_data, o.version, 
			o.user_id, o.created_at, o.applied_at, o.transformed_from
		FROM operations o
		JOIN rooms r ON r.id = (
			SELECT id FROM rooms WHERE name = $1 LIMIT 1
		)
		WHERE o.room_id = r.id 
		  AND o.version > $2 
		ORDER BY o.version ASC
		LIMIT 1000`,
		roomID, lastVersion,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to query operations: %v", err)
	}
	defer rows.Close()

	var operations []Operation
	for rows.Next() {
		var op Operation
		var dataJSON []byte
		var transformedFromJSON []byte
		var appliedAt *time.Time

		err := rows.Scan(
			&op.ID, &op.Type, &dataJSON, &op.Version,
			&op.UserID, &op.CreatedAt, &appliedAt, &transformedFromJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan operation: %v", err)
		}

		// Parse operation data
		if err := json.Unmarshal(dataJSON, &op.Data); err != nil {
			log.Printf("Failed to parse operation data for %s: %v", op.ID, err)
			continue
		}

		// Parse transformation history
		if len(transformedFromJSON) > 0 {
			if err := json.Unmarshal(transformedFromJSON, &op.TransformedFrom); err != nil {
				log.Printf("Failed to parse transformation history for %s: %v", op.ID, err)
			}
		}

		op.RoomID = roomID
		op.AppliedAt = appliedAt

		operations = append(operations, op)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating operations: %v", err)
	}

	return operations, nil
}

// updateUserSession updates or creates user session record
func (sr *SessionRecovery) updateUserSession(roomID, userID, sessionID string) error {
	_, err := sr.server.db.Exec(`
		INSERT INTO user_sessions (room_id, user_id, session_token, last_activity, is_active)
		VALUES (
			(SELECT id FROM rooms WHERE name = $1),
			$2, $3, NOW(), true
		)
		ON CONFLICT (room_id, user_id) 
		DO UPDATE SET 
			session_token = EXCLUDED.session_token,
			last_activity = NOW(),
			is_active = true`,
		roomID, userID, sessionID,
	)

	return err
}

// GetRoomState returns complete room state for recovery
func (sr *SessionRecovery) GetRoomState(roomID string) (*RoomRecoveryState, error) {
	state := &RoomRecoveryState{
		RoomID: roomID,
	}

	// Get room information
	err := sr.server.db.QueryRow(`
		SELECT id, name, current_version, created_at, last_activity
		FROM rooms 
		WHERE name = $1 AND is_active = true`,
		roomID,
	).Scan(&state.RoomUUID, &state.RoomName, &state.CurrentVersion, 
		&state.CreatedAt, &state.LastActivity)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("room not found: %s", roomID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get room info: %v", err)
	}

	// Get recent operations (last 100)
	operations, err := sr.getMissedOperations(roomID, state.CurrentVersion-100)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent operations: %v", err)
	}
	state.RecentOperations = operations

	// Get active users
	users, err := sr.getActiveUsers(roomID)
	if err != nil {
		log.Printf("Failed to get active users: %v", err)
		// Don't fail recovery for this
	}
	state.ActiveUsers = users

	// Get spatial statistics
	spatialStats := sr.server.spatialIndex.GetStats()
	if roomStats, ok := spatialStats["room_counts"].(map[string]int); ok {
		if count, exists := roomStats[roomID]; exists {
			state.StrokeCount = count
		}
	}

	return state, nil
}

// getActiveUsers returns list of currently active users in room
func (sr *SessionRecovery) getActiveUsers(roomID string) ([]RecoveryUserInfo, error) {
	rows, err := sr.server.db.Query(`
		SELECT user_id, joined_at, last_activity, is_active
		FROM user_sessions 
		WHERE room_id = (SELECT id FROM rooms WHERE name = $1)
		  AND last_activity > NOW() - INTERVAL '5 minutes'
		ORDER BY last_activity DESC`,
		roomID,
	)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []RecoveryUserInfo
	for rows.Next() {
		var user RecoveryUserInfo
		err := rows.Scan(&user.UserID, &user.JoinedAt, &user.LastActivity, &user.IsActive)
		if err != nil {
			log.Printf("Failed to scan user info: %v", err)
			continue
		}
		users = append(users, user)
	}

	return users, nil
}

// CleanupExpiredSessions removes old session data
func (sr *SessionRecovery) CleanupExpiredSessions() error {
	// Clean up old user sessions
	result, err := sr.server.db.Exec(`
		DELETE FROM user_sessions 
		WHERE last_activity < NOW() - INTERVAL '24 hours'`,
	)
	if err != nil {
		return fmt.Errorf("failed to cleanup user sessions: %v", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d expired user sessions", rowsAffected)
	}

	// Clean up old operations (keep last 30 days)
	result, err = sr.server.db.Exec(`
		DELETE FROM operations 
		WHERE created_at < NOW() - INTERVAL '30 days'`,
	)
	if err != nil {
		return fmt.Errorf("failed to cleanup operations: %v", err)
	}

	rowsAffected, _ = result.RowsAffected()
	if rowsAffected > 0 {
		log.Printf("Cleaned up %d old operations", rowsAffected)
	}

	return nil
}

// StartCleanupRoutine starts a background routine for cleaning up expired sessions
func (sr *SessionRecovery) StartCleanupRoutine() {
	go func() {
		ticker := time.NewTicker(1 * time.Hour) // Cleanup every hour
		defer ticker.Stop()

		for range ticker.C {
			if err := sr.CleanupExpiredSessions(); err != nil {
				log.Printf("Session cleanup failed: %v", err)
			}
		}
	}()

	log.Println("Session cleanup routine started")
}

// RecoveryStats returns statistics about session recovery
func (sr *SessionRecovery) GetRecoveryStats() map[string]interface{} {
	var stats struct {
		ActiveSessions  int `db:"active_sessions"`
		RecentSessions  int `db:"recent_sessions"`
		TotalOperations int `db:"total_operations"`
		ActiveRooms     int `db:"active_rooms"`
	}

	// Get active sessions (last 5 minutes)
	sr.server.db.QueryRow(`
		SELECT COUNT(*) FROM user_sessions 
		WHERE last_activity > NOW() - INTERVAL '5 minutes'`,
	).Scan(&stats.ActiveSessions)

	// Get recent sessions (last hour)
	sr.server.db.QueryRow(`
		SELECT COUNT(*) FROM user_sessions 
		WHERE last_activity > NOW() - INTERVAL '1 hour'`,
	).Scan(&stats.RecentSessions)

	// Get total operations (last 24 hours)
	sr.server.db.QueryRow(`
		SELECT COUNT(*) FROM operations 
		WHERE created_at > NOW() - INTERVAL '24 hours'`,
	).Scan(&stats.TotalOperations)

	// Get active rooms
	sr.server.db.QueryRow(`
		SELECT COUNT(*) FROM rooms 
		WHERE is_active = true AND last_activity > NOW() - INTERVAL '1 hour'`,
	).Scan(&stats.ActiveRooms)

	return map[string]interface{}{
		"active_sessions":   stats.ActiveSessions,
		"recent_sessions":   stats.RecentSessions,
		"total_operations":  stats.TotalOperations,
		"active_rooms":      stats.ActiveRooms,
		"cleanup_available": true,
	}
}

// Supporting types

// RoomRecoveryState represents complete room state for recovery
type RoomRecoveryState struct {
	RoomID           string              `json:"room_id"`
	RoomUUID         string              `json:"room_uuid"`
	RoomName         string              `json:"room_name"`
	CurrentVersion   int64               `json:"current_version"`
	CreatedAt        time.Time           `json:"created_at"`
	LastActivity     time.Time           `json:"last_activity"`
	RecentOperations []Operation         `json:"recent_operations"`
	ActiveUsers      []RecoveryUserInfo  `json:"active_users"`
	StrokeCount      int                 `json:"stroke_count"`
}

// RecoveryUserInfo represents user information for recovery
type RecoveryUserInfo struct {
	UserID       string    `json:"user_id"`
	JoinedAt     time.Time `json:"joined_at"`
	LastActivity time.Time `json:"last_activity"`
	IsActive     bool      `json:"is_active"`
}