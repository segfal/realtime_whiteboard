package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
)

// ViewportQuery handles viewport-based stroke queries for efficient rendering
func (s *Server) handleViewportQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	roomID := r.URL.Query().Get("room")
	if roomID == "" {
		http.Error(w, "Room ID required", http.StatusBadRequest)
		return
	}

	// Parse viewport bounds
	x1Str := r.URL.Query().Get("x1")
	y1Str := r.URL.Query().Get("y1")
	x2Str := r.URL.Query().Get("x2")
	y2Str := r.URL.Query().Get("y2")

	if x1Str == "" || y1Str == "" || x2Str == "" || y2Str == "" {
		http.Error(w, "Viewport bounds (x1,y1,x2,y2) required", http.StatusBadRequest)
		return
	}

	x1, err1 := strconv.ParseFloat(x1Str, 64)
	y1, err2 := strconv.ParseFloat(y1Str, 64)
	x2, err3 := strconv.ParseFloat(x2Str, 64)
	y2, err4 := strconv.ParseFloat(y2Str, 64)

	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		http.Error(w, "Invalid viewport bounds", http.StatusBadRequest)
		return
	}

	viewport := BoundingBox{X1: x1, Y1: y1, X2: x2, Y2: y2}

	// Query spatial index
	result, err := s.spatialIndex.QueryViewportWithMetrics(viewport, roomID)
	if err != nil {
		log.Printf("Viewport query error: %v", err)
		http.Error(w, "Query failed", http.StatusInternalServerError)
		return
	}

	// Set response headers
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Query-Time-Ns", strconv.FormatInt(result.QueryTime, 10))
	w.Header().Set("X-Result-Count", strconv.Itoa(result.ResultCount))

	// Return results
	json.NewEncoder(w).Encode(map[string]interface{}{
		"strokes":      result.Strokes,
		"query_time":   result.QueryTime,
		"result_count": result.ResultCount,
		"viewport":     result.Viewport,
	})
}

// SpatialStats returns spatial index statistics
func (s *Server) handleSpatialStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	stats := s.spatialIndex.GetStats()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// HealthCheck endpoint for monitoring
func (s *Server) handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check database connection
	err := s.db.Ping()
	if err != nil {
		http.Error(w, "Database unhealthy", http.StatusServiceUnavailable)
		return
	}

	// Check Redis connection
	_, err = s.redis.Ping(r.Context()).Result()
	if err != nil {
		http.Error(w, "Redis unhealthy", http.StatusServiceUnavailable)
		return
	}

	// Get spatial index stats
	spatialStats := s.spatialIndex.GetStats()
	
	// Get OT engine stats (if available)
	otStats := map[string]interface{}{
		"active_rooms": len(s.otEngine.rooms),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":            "healthy",
		"spatial_index":     spatialStats,
		"ot_engine":         otStats,
		"connected_clients": len(s.clients),
	})
}