package main

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"sync"
	"time"
)

// MessageCompressor handles message compression and batching for performance
type MessageCompressor struct {
	batchSize     int
	batchTimeout  time.Duration
	batches       map[string]*MessageBatch // roomID -> batch
	batchesMutex  sync.RWMutex
	flushCallback func(roomID string, batch *MessageBatch)
}

// MessageBatch represents a batch of messages for a room
type MessageBatch struct {
	RoomID     string      `json:"room_id"`
	Messages   []Operation `json:"messages"`
	StartTime  time.Time   `json:"start_time"`
	LastUpdate time.Time   `json:"last_update"`
	Size       int         `json:"size"`
}

// CompressionResult holds compression statistics
type CompressionResult struct {
	OriginalSize   int     `json:"original_size"`
	CompressedSize int     `json:"compressed_size"`
	CompressionRatio float64 `json:"compression_ratio"`
	CompressionTime  int64   `json:"compression_time_ns"`
}

// NewMessageCompressor creates a new message compressor
func NewMessageCompressor(batchSize int, batchTimeout time.Duration) *MessageCompressor {
	mc := &MessageCompressor{
		batchSize:    batchSize,
		batchTimeout: batchTimeout,
		batches:      make(map[string]*MessageBatch),
	}

	// Start batch flushing goroutine
	go mc.batchFlusher()

	return mc
}

// SetFlushCallback sets the callback function for flushing batches
func (mc *MessageCompressor) SetFlushCallback(callback func(roomID string, batch *MessageBatch)) {
	mc.flushCallback = callback
}

// AddMessage adds a message to the batch for compression
func (mc *MessageCompressor) AddMessage(roomID string, operation Operation) {
	mc.batchesMutex.Lock()
	defer mc.batchesMutex.Unlock()

	batch, exists := mc.batches[roomID]
	if !exists {
		batch = &MessageBatch{
			RoomID:     roomID,
			Messages:   make([]Operation, 0, mc.batchSize),
			StartTime:  time.Now(),
			LastUpdate: time.Now(),
		}
		mc.batches[roomID] = batch
	}

	// Add message to batch
	batch.Messages = append(batch.Messages, operation)
	batch.LastUpdate = time.Now()
	batch.Size++

	// Flush if batch is full
	if len(batch.Messages) >= mc.batchSize {
		mc.flushBatchUnsafe(roomID, batch)
	}
}

// FlushRoom immediately flushes all batched messages for a room
func (mc *MessageCompressor) FlushRoom(roomID string) {
	mc.batchesMutex.Lock()
	defer mc.batchesMutex.Unlock()

	if batch, exists := mc.batches[roomID]; exists {
		mc.flushBatchUnsafe(roomID, batch)
	}
}

// flushBatchUnsafe flushes a batch without acquiring locks (internal use)
func (mc *MessageCompressor) flushBatchUnsafe(roomID string, batch *MessageBatch) {
	if len(batch.Messages) == 0 {
		return
	}

	// Call flush callback
	if mc.flushCallback != nil {
		mc.flushCallback(roomID, batch)
	}

	// Remove batch from memory
	delete(mc.batches, roomID)
}

// batchFlusher periodically flushes old batches
func (mc *MessageCompressor) batchFlusher() {
	ticker := time.NewTicker(mc.batchTimeout / 4) // Check 4x per timeout
	defer ticker.Stop()

	for range ticker.C {
		mc.flushExpiredBatches()
	}
}

// flushExpiredBatches flushes batches that have exceeded timeout
func (mc *MessageCompressor) flushExpiredBatches() {
	mc.batchesMutex.Lock()
	defer mc.batchesMutex.Unlock()

	now := time.Now()
	var expiredRooms []string

	for roomID, batch := range mc.batches {
		if now.Sub(batch.StartTime) > mc.batchTimeout {
			expiredRooms = append(expiredRooms, roomID)
		}
	}

	// Flush expired batches
	for _, roomID := range expiredRooms {
		if batch, exists := mc.batches[roomID]; exists {
			mc.flushBatchUnsafe(roomID, batch)
		}
	}
}

// CompressJSON compresses JSON data using gzip
func (mc *MessageCompressor) CompressJSON(data interface{}) ([]byte, *CompressionResult, error) {
	start := time.Now()

	// Marshal to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal JSON: %v", err)
	}

	originalSize := len(jsonData)

	// Compress with gzip
	var compressedBuffer bytes.Buffer
	gzipWriter := gzip.NewWriter(&compressedBuffer)

	_, err = gzipWriter.Write(jsonData)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to compress data: %v", err)
	}

	err = gzipWriter.Close()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to close compressor: %v", err)
	}

	compressedData := compressedBuffer.Bytes()
	compressedSize := len(compressedData)
	compressionTime := time.Since(start).Nanoseconds()

	result := &CompressionResult{
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: float64(compressedSize) / float64(originalSize),
		CompressionTime:  compressionTime,
	}

	return compressedData, result, nil
}

// DecompressJSON decompresses gzip data and unmarshals JSON
func (mc *MessageCompressor) DecompressJSON(compressedData []byte, target interface{}) error {
	// Create gzip reader
	gzipReader, err := gzip.NewReader(bytes.NewReader(compressedData))
	if err != nil {
		return fmt.Errorf("failed to create gzip reader: %v", err)
	}
	defer gzipReader.Close()

	// Read decompressed data
	decompressedData, err := io.ReadAll(gzipReader)
	if err != nil {
		return fmt.Errorf("failed to decompress data: %v", err)
	}

	// Unmarshal JSON
	err = json.Unmarshal(decompressedData, target)
	if err != nil {
		return fmt.Errorf("failed to unmarshal JSON: %v", err)
	}

	return nil
}

// CompressBatch compresses an entire message batch
func (mc *MessageCompressor) CompressBatch(batch *MessageBatch) ([]byte, *CompressionResult, error) {
	return mc.CompressJSON(batch)
}

// GetBatchStats returns statistics about current batches
func (mc *MessageCompressor) GetBatchStats() map[string]interface{} {
	mc.batchesMutex.RLock()
	defer mc.batchesMutex.RUnlock()

	stats := make(map[string]interface{})
	roomStats := make(map[string]map[string]interface{})

	totalBatches := len(mc.batches)
	totalMessages := 0
	oldestBatch := time.Now()

	for roomID, batch := range mc.batches {
		messageCount := len(batch.Messages)
		totalMessages += messageCount
		
		age := time.Since(batch.StartTime)
		if batch.StartTime.Before(oldestBatch) {
			oldestBatch = batch.StartTime
		}

		roomStats[roomID] = map[string]interface{}{
			"message_count": messageCount,
			"age_ms":        age.Milliseconds(),
			"size":          batch.Size,
			"start_time":    batch.StartTime.Format(time.RFC3339),
			"last_update":   batch.LastUpdate.Format(time.RFC3339),
		}
	}

	stats["total_batches"] = totalBatches
	stats["total_messages"] = totalMessages
	stats["batch_size_limit"] = mc.batchSize
	stats["batch_timeout_ms"] = mc.batchTimeout.Milliseconds()
	
	if totalBatches > 0 {
		stats["oldest_batch_age_ms"] = time.Since(oldestBatch).Milliseconds()
		stats["avg_messages_per_batch"] = float64(totalMessages) / float64(totalBatches)
	}
	
	stats["room_stats"] = roomStats

	return stats
}

// MessageDeltaCompressor handles delta compression for stroke updates
type MessageDeltaCompressor struct {
	previousStates map[string]interface{} // operationID -> previous state
	stateMutex     sync.RWMutex
}

// NewMessageDeltaCompressor creates a delta compressor
func NewMessageDeltaCompressor() *MessageDeltaCompressor {
	return &MessageDeltaCompressor{
		previousStates: make(map[string]interface{}),
	}
}

// CreateDelta creates a delta between current and previous operation
func (mdc *MessageDeltaCompressor) CreateDelta(operationID string, currentData interface{}) (interface{}, bool) {
	mdc.stateMutex.Lock()
	defer mdc.stateMutex.Unlock()

	previousData, exists := mdc.previousStates[operationID]
	if !exists {
		// First time seeing this operation - store and return full data
		mdc.previousStates[operationID] = currentData
		return currentData, false
	}

	// Create delta (simplified implementation)
	delta := mdc.calculateDelta(previousData, currentData)
	
	// Update stored state
	mdc.previousStates[operationID] = currentData

	return delta, true
}

// calculateDelta creates a simple delta between two data structures
func (mdc *MessageDeltaCompressor) calculateDelta(previous, current interface{}) interface{} {
	// Simplified delta calculation
	// In a real implementation, this would do proper diffing
	
	currentMap, ok1 := current.(map[string]interface{})
	previousMap, ok2 := previous.(map[string]interface{})
	
	if !ok1 || !ok2 {
		return current // Return full data if not maps
	}

	delta := make(map[string]interface{})
	
	// Find changed fields
	for key, currentValue := range currentMap {
		if previousValue, exists := previousMap[key]; !exists || !deepEqual(currentValue, previousValue) {
			delta[key] = currentValue
		}
	}

	// If no changes, return empty delta
	if len(delta) == 0 {
		return nil
	}

	return delta
}

// deepEqual performs deep equality check (simplified)
func deepEqual(a, b interface{}) bool {
	// Simplified comparison - in production use reflect.DeepEqual or better
	aBytes, err1 := json.Marshal(a)
	bBytes, err2 := json.Marshal(b)
	
	if err1 != nil || err2 != nil {
		return false
	}
	
	return bytes.Equal(aBytes, bBytes)
}

// CleanupOldStates removes old states to prevent memory leaks
func (mdc *MessageDeltaCompressor) CleanupOldStates(maxAge time.Duration) {
	// In a real implementation, you'd track timestamps and cleanup old entries
	// For now, just log the cleanup request
	log.Printf("Delta compressor cleanup requested (maxAge: %v)", maxAge)
}

// GetDeltaStats returns delta compression statistics
func (mdc *MessageDeltaCompressor) GetDeltaStats() map[string]interface{} {
	mdc.stateMutex.RLock()
	defer mdc.stateMutex.RUnlock()

	return map[string]interface{}{
		"tracked_operations": len(mdc.previousStates),
		"memory_estimate_kb": len(mdc.previousStates) * 100, // Rough estimate
	}
}

// CompressionManager manages both batching and delta compression
type CompressionManager struct {
	batcher *MessageCompressor
	delta   *MessageDeltaCompressor
	stats   struct {
		totalMessages    int64
		compressedBytes  int64
		originalBytes    int64
		compressionsSaved int64
		mutex            sync.RWMutex
	}
}

// NewCompressionManager creates a complete compression management system
func NewCompressionManager(batchSize int, batchTimeout time.Duration) *CompressionManager {
	cm := &CompressionManager{
		batcher: NewMessageCompressor(batchSize, batchTimeout),
		delta:   NewMessageDeltaCompressor(),
	}

	// Set up batch flush callback
	cm.batcher.SetFlushCallback(cm.handleBatchFlush)

	return cm
}

// handleBatchFlush processes a flushed batch
func (cm *CompressionManager) handleBatchFlush(roomID string, batch *MessageBatch) {
	cm.stats.mutex.Lock()
	cm.stats.totalMessages += int64(len(batch.Messages))
	cm.stats.mutex.Unlock()

	log.Printf("Flushed batch for room %s: %d messages", roomID, len(batch.Messages))
}

// ProcessOperation processes an operation with compression
func (cm *CompressionManager) ProcessOperation(roomID string, operation Operation) {
	// Try delta compression first
	deltaData, isDelta := cm.delta.CreateDelta(operation.ID, operation.Data)
	
	if isDelta && deltaData != nil {
		// Create delta operation
		deltaOperation := operation
		deltaOperation.Data = map[string]interface{}{
			"type":  "delta",
			"delta": deltaData,
		}
		cm.batcher.AddMessage(roomID, deltaOperation)
		
		cm.stats.mutex.Lock()
		cm.stats.compressionsSaved++
		cm.stats.mutex.Unlock()
	} else {
		// Add full operation to batch
		cm.batcher.AddMessage(roomID, operation)
	}
}

// GetCompressionStats returns comprehensive compression statistics
func (cm *CompressionManager) GetCompressionStats() map[string]interface{} {
	cm.stats.mutex.RLock()
	batchStats := cm.batcher.GetBatchStats()
	deltaStats := cm.delta.GetDeltaStats()
	totalMessages := cm.stats.totalMessages
	compressionsSaved := cm.stats.compressionsSaved
	cm.stats.mutex.RUnlock()

	return map[string]interface{}{
		"total_messages":     totalMessages,
		"compressions_saved": compressionsSaved,
		"batch_stats":        batchStats,
		"delta_stats":        deltaStats,
		"compression_ratio":  float64(compressionsSaved) / float64(totalMessages),
	}
}