package redis

import (
	"fmt"
	"os"

	"github.com/redis/go-redis/v9"
)

func Connect() (*redis.Client, error) {
    // Try REDIS_ADDR first (for docker-compose compatibility)
    addr := os.Getenv("REDIS_ADDR")
    if addr == "" {
        // Fallback to individual host/port
        host := os.Getenv("REDIS_HOST")
        port := os.Getenv("REDIS_PORT")
        if host != "" && port != "" {
            addr = fmt.Sprintf("%s:%s", host, port)
        } else {
            addr = "localhost:6379" // Default
        }
    }
    
    password := os.Getenv("REDIS_PASSWORD")

    client := redis.NewClient(&redis.Options{
        Addr:     addr,
        Password: password,
        DB:       0,
    })

    return client, nil
}