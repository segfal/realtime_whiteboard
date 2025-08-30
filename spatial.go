package main

import (
	"fmt"
	"log"
	"sync"

	"github.com/tidwall/rtree"
)

// SpatialIndex manages spatial indexing for efficient viewport queries
type SpatialIndex struct {
	tree  *rtree.RTree
	mutex sync.RWMutex
}

// IndexedStroke represents a stroke with spatial information for indexing
type IndexedStroke struct {
	ID       string
	RoomID   string
	UserID   string
	Data     interface{}
	Version  int64
	BBox     BoundingBox
	IsActive bool // false if deleted
}

// NewSpatialIndex creates a new spatial index
func NewSpatialIndex() *SpatialIndex {
	return &SpatialIndex{
		tree: &rtree.RTree{},
	}
}

// Insert adds a stroke to the spatial index
func (si *SpatialIndex) Insert(stroke *IndexedStroke) error {
	si.mutex.Lock()
	defer si.mutex.Unlock()

	// Validate bounding box
	if stroke.BBox.X1 >= stroke.BBox.X2 || stroke.BBox.Y1 >= stroke.BBox.Y2 {
		return fmt.Errorf("invalid bounding box: %+v", stroke.BBox)
	}

	min := [2]float64{stroke.BBox.X1, stroke.BBox.Y1}
	max := [2]float64{stroke.BBox.X2, stroke.BBox.Y2}
	si.tree.Insert(min, max, stroke)
	return nil
}

// Update modifies an existing stroke in the spatial index
func (si *SpatialIndex) Update(strokeID string, newStroke *IndexedStroke) error {
	si.mutex.Lock()
	defer si.mutex.Unlock()

	// Remove old version
	si.removeByIDUnsafe(strokeID)

	// Insert new version
	min := [2]float64{newStroke.BBox.X1, newStroke.BBox.Y1}
	max := [2]float64{newStroke.BBox.X2, newStroke.BBox.Y2}
	si.tree.Insert(min, max, newStroke)
	return nil
}

// Remove removes a stroke from the spatial index
func (si *SpatialIndex) Remove(strokeID string) error {
	si.mutex.Lock()
	defer si.mutex.Unlock()

	return si.removeByIDUnsafe(strokeID)
}

// removeByIDUnsafe removes stroke without locking (internal use)
func (si *SpatialIndex) removeByIDUnsafe(strokeID string) error {
	var toRemove *IndexedStroke
	var toRemoveMin, toRemoveMax [2]float64

	// Find the stroke to remove
	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		if stroke.ID == strokeID {
			toRemove = stroke
			toRemoveMin = min
			toRemoveMax = max
			return false // Stop scanning
		}
		return true // Continue scanning
	})

	if toRemove == nil {
		return fmt.Errorf("stroke %s not found in spatial index", strokeID)
	}

	si.tree.Delete(toRemoveMin, toRemoveMax, toRemove)
	return nil
}

// QueryViewport returns all strokes within the given viewport
func (si *SpatialIndex) QueryViewport(viewport BoundingBox, roomID string) ([]*IndexedStroke, error) {
	si.mutex.RLock()
	defer si.mutex.RUnlock()

	if viewport.X1 >= viewport.X2 || viewport.Y1 >= viewport.Y2 {
		return nil, fmt.Errorf("invalid viewport bounds: %+v", viewport)
	}

	var results []*IndexedStroke
	min := [2]float64{viewport.X1, viewport.Y1}
	max := [2]float64{viewport.X2, viewport.Y2}

	si.tree.Search(min, max, func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		// Filter by room and active status
		if stroke.RoomID == roomID && stroke.IsActive {
			results = append(results, stroke)
		}
		return true // Continue searching
	})

	return results, nil
}

// QueryCircle returns all strokes within a circular area (for selection tools)
func (si *SpatialIndex) QueryCircle(centerX, centerY, radius float64, roomID string) ([]*IndexedStroke, error) {
	si.mutex.RLock()
	defer si.mutex.RUnlock()

	// Convert circle to bounding box for initial filtering
	viewport := BoundingBox{
		X1: centerX - radius,
		Y1: centerY - radius,
		X2: centerX + radius,
		Y2: centerY + radius,
	}

	initialResults, err := si.QueryViewport(viewport, roomID)
	if err != nil {
		return nil, err
	}

	// Filter by actual circle distance
	var results []*IndexedStroke
	radiusSquared := radius * radius

	for _, stroke := range initialResults {
		// Check if stroke's bounding box intersects with circle
		if strokeIntersectsCircle(stroke.BBox, centerX, centerY, radiusSquared) {
			results = append(results, stroke)
		}
	}

	return results, nil
}

// strokeIntersectsCircle checks if a bounding box intersects with a circle
func strokeIntersectsCircle(bbox BoundingBox, centerX, centerY, radiusSquared float64) bool {
	// Find closest point on rectangle to circle center
	closestX := clamp(centerX, bbox.X1, bbox.X2)
	closestY := clamp(centerY, bbox.Y1, bbox.Y2)

	// Calculate distance squared
	distanceSquared := (centerX-closestX)*(centerX-closestX) + (centerY-closestY)*(centerY-closestY)

	return distanceSquared <= radiusSquared
}

// clamp restricts a value to a range
func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

// GetStats returns spatial index statistics
func (si *SpatialIndex) GetStats() map[string]interface{} {
	si.mutex.RLock()
	defer si.mutex.RUnlock()

	var totalItems int
	roomCounts := make(map[string]int)

	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		totalItems++
		if stroke.IsActive {
			roomCounts[stroke.RoomID]++
		}
		return true
	})

	return map[string]interface{}{
		"total_items":  totalItems,
		"room_counts":  roomCounts,
		"tree_height": si.getTreeHeight(),
	}
}

// getTreeHeight estimates tree height (for performance monitoring)
func (si *SpatialIndex) getTreeHeight() int {
	// This is an approximation since rtree doesn't expose height directly
	var count int
	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		count++
		return true
	})

	if count == 0 {
		return 0
	}

	// Estimate height based on item count (log base)
	height := 0
	temp := count
	for temp > 1 {
		temp /= 4 // Assuming branching factor of ~4
		height++
	}

	return height
}

// ClearRoom removes all strokes for a specific room
func (si *SpatialIndex) ClearRoom(roomID string) error {
	si.mutex.Lock()
	defer si.mutex.Unlock()

	var toRemove []struct {
		stroke *IndexedStroke
		min    [2]float64
		max    [2]float64
	}

	// Collect all strokes for the room
	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		if stroke.RoomID == roomID {
			toRemove = append(toRemove, struct {
				stroke *IndexedStroke
				min    [2]float64
				max    [2]float64
			}{stroke, min, max})
		}
		return true
	})

	// Remove all collected strokes
	for _, entry := range toRemove {
		si.tree.Delete(entry.min, entry.max, entry.stroke)
	}

	log.Printf("Cleared %d strokes from room %s", len(toRemove), roomID)
	return nil
}

// GetAllStrokes returns all strokes for a room (for debugging)
func (si *SpatialIndex) GetAllStrokes(roomID string) []*IndexedStroke {
	si.mutex.RLock()
	defer si.mutex.RUnlock()

	var results []*IndexedStroke

	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		if stroke.RoomID == roomID && stroke.IsActive {
			results = append(results, stroke)
		}
		return true
	})

	return results
}

// ValidateIndex checks the integrity of the spatial index
func (si *SpatialIndex) ValidateIndex() []string {
	si.mutex.RLock()
	defer si.mutex.RUnlock()

	var issues []string

	si.tree.Scan(func(min, max [2]float64, item interface{}) bool {
		stroke := item.(*IndexedStroke)
		// Check bounding box validity
		if stroke.BBox.X1 >= stroke.BBox.X2 {
			issues = append(issues, fmt.Sprintf("Invalid bbox X for stroke %s: %f >= %f", 
				stroke.ID, stroke.BBox.X1, stroke.BBox.X2))
		}
		if stroke.BBox.Y1 >= stroke.BBox.Y2 {
			issues = append(issues, fmt.Sprintf("Invalid bbox Y for stroke %s: %f >= %f", 
				stroke.ID, stroke.BBox.Y1, stroke.BBox.Y2))
		}

		// Check for required fields
		if stroke.ID == "" {
			issues = append(issues, "Empty stroke ID found")
		}
		if stroke.RoomID == "" {
			issues = append(issues, fmt.Sprintf("Empty room ID for stroke %s", stroke.ID))
		}

		return true
	})

	return issues
}

// SpatialQueryResult represents the result of a spatial query with metadata
type SpatialQueryResult struct {
	Strokes     []*IndexedStroke `json:"strokes"`
	QueryTime   int64            `json:"query_time_ns"`
	ResultCount int              `json:"result_count"`
	Viewport    BoundingBox      `json:"viewport"`
}

// QueryViewportWithMetrics performs a viewport query and returns timing metrics
func (si *SpatialIndex) QueryViewportWithMetrics(viewport BoundingBox, roomID string) (*SpatialQueryResult, error) {
	start := getCurrentTimeNanos()

	strokes, err := si.QueryViewport(viewport, roomID)
	if err != nil {
		return nil, err
	}

	queryTime := getCurrentTimeNanos() - start

	return &SpatialQueryResult{
		Strokes:     strokes,
		QueryTime:   queryTime,
		ResultCount: len(strokes),
		Viewport:    viewport,
	}, nil
}

func getCurrentTimeNanos() int64 {
	// Using a simple timestamp for demonstration
	// In production, use time.Now().UnixNano()
	return 0
}