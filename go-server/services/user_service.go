package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"github.com/redis/go-redis/v9"
)

type UserService struct {
    db    *sql.DB
    redis *redis.Client
}

func NewUserService(db *sql.DB, redis *redis.Client) *UserService {
    return &UserService{
        db:    db,
        redis: redis,
    }
}

// Generate random user ID with format: user_<8chars>_<timestamp>
func (us *UserService) GenerateUserID() (string, error) {
    // Generate 8 random characters
    bytes := make([]byte, 4)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    
    randomStr := hex.EncodeToString(bytes)
    timestamp := time.Now().Unix()
    
    return fmt.Sprintf("user_%s_%d", randomStr, timestamp), nil
}

// Generate random display name suggestions
func (us *UserService) GenerateDisplayName() string {
    adjectives := []string{"Creative", "Artistic", "Smart", "Quick", "Bold", "Bright", "Cool", "Swift"}
    nouns := []string{"Artist", "Designer", "Creator", "Sketcher", "Drawer", "Painter", "Builder", "Maker"}
    
    adjIdx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(adjectives))))
    nounIdx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(nouns))))
    
    return fmt.Sprintf("%s %s", adjectives[adjIdx.Int64()], nouns[nounIdx.Int64()])
}