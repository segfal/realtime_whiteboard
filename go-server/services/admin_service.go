package services

import (
	"database/sql"
	"fmt"

	"realtime_whiteboard/go-server/models"

	"github.com/redis/go-redis/v9"
)

type AdminService struct {
    db           *sql.DB
    redis        *redis.Client
    sessionMgr   *models.SessionManager
}

func NewAdminService(db *sql.DB, redis *redis.Client, sessionMgr *models.SessionManager) *AdminService {
    return &AdminService{
        db:         db,
        redis:      redis,
        sessionMgr: sessionMgr,
    }
}

// Transfer admin rights to another user
func (as *AdminService) TransferAdmin(roomID, currentAdminID, newAdminID string) error {
    tx, err := as.db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Verify current admin
    var isCurrentAdmin bool
    err = tx.QueryRow(
        "SELECT is_admin FROM user_sessions WHERE user_id = $1 AND room_id = $2",
        currentAdminID, roomID,
    ).Scan(&isCurrentAdmin)
    
    if err != nil || !isCurrentAdmin {
        return fmt.Errorf("user %s is not admin of room %s", currentAdminID, roomID)
    }
    
    // Remove admin from current admin
    _, err = tx.Exec(
        "UPDATE user_sessions SET is_admin = false WHERE user_id = $1 AND room_id = $2",
        currentAdminID, roomID,
    )
    if err != nil {
        return err
    }
    
    // Set new admin
    _, err = tx.Exec(
        "UPDATE user_sessions SET is_admin = true WHERE user_id = $1 AND room_id = $2",
        newAdminID, roomID,
    )
    if err != nil {
        return err
    }
    
    // Update room admin
    _, err = tx.Exec(
        "UPDATE rooms SET admin_user_id = $1 WHERE room_id = $2",
        newAdminID, roomID,
    )
    if err != nil {
        return err
    }
    
    return tx.Commit()
}

// Auto-assign admin when current admin leaves
func (as *AdminService) AutoAssignAdmin(roomID, leavingAdminID string) (string, error) {
    // Find the user who joined earliest (excluding leaving admin)
    var newAdminID string
    query := `
        SELECT user_id FROM user_sessions 
        WHERE room_id = $1 AND user_id != $2 
        ORDER BY joined_at ASC 
        LIMIT 1
    `
    
    err := as.db.QueryRow(query, roomID, leavingAdminID).Scan(&newAdminID)
    if err == sql.ErrNoRows {
        // No other users in room, room should be cleaned up
        return "", nil
    }
    if err != nil {
        return "", err
    }
    
    // Transfer admin to earliest user
    err = as.TransferAdmin(roomID, leavingAdminID, newAdminID)
    return newAdminID, err
}