package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type InviteService struct {
	db          *sql.DB
	redisClient *redis.Client
}

type InviteLink struct {
	RoomID string
}

func NewInviteService(db *sql.DB, redisClient *redis.Client) *InviteService {
	return &InviteService{
		db:          db,
		redisClient: redisClient,
	}
}

func (s *InviteService) GenerateInviteCode() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func (s *InviteService) CreateInviteLink(roomID string, expiresIn time.Duration) (string, error) {
	ctx := context.Background()
	inviteCode := s.GenerateInviteCode()
	
	// Store in Redis with expiration
	key := fmt.Sprintf("invite:%s", inviteCode)
	err := s.redisClient.Set(ctx, key, roomID, expiresIn).Err()
	if err != nil {
		return "", fmt.Errorf("failed to store invite link: %v", err)
	}
	return inviteCode, nil
}

func (s *InviteService) UseInviteLink(inviteCode string) (*InviteLink, error) {
	ctx := context.Background()
	key := fmt.Sprintf("invite:%s", inviteCode)
	
	roomID, err := s.redisClient.Get(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("invalid or expired invite code")
	}
	
	return &InviteLink{RoomID: roomID}, nil
}