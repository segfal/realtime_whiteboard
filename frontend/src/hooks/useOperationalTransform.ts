import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { sendOperation, whiteboardActions } from '../store/whiteboardSlice';
import { Operation, OperationType, Point, CreateOperationParams } from '../store/types';

/**
 * Hook for handling Operational Transform operations
 * Provides high-level operations for creating strokes, moving cursor, etc.
 */
export const useOperationalTransform = () => {
  const dispatch = useAppDispatch();
  const {
    currentVersion,
    pendingOperations,
    isConnected,
    roomId,
    currentUserId,
  } = useAppSelector(state => ({
    currentVersion: state.whiteboard.currentVersion,
    pendingOperations: state.whiteboard.pendingOperations,
    isConnected: state.whiteboard.isConnected,
    roomId: state.whiteboard.roomId,
    currentUserId: state.whiteboard.currentUserId,
  }));

  // Create a new stroke operation
  const createStroke = useCallback(async (strokeData: {
    points: Point[];
    color: string;
    thickness: number;
    isEraser?: boolean;
  }) => {
    if (!isConnected || !roomId || !currentUserId) {
      throw new Error('Not connected to room');
    }

    const params: CreateOperationParams = {
      type: 'stroke_create',
      data: {
        stroke_data: strokeData,
        timestamp: Date.now(),
      },
      optimistic: true, // Apply immediately for smooth UX
    };

    return dispatch(sendOperation(params));
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Update an existing stroke
  const updateStroke = useCallback(async (strokeId: string, updates: Partial<{
    points: Point[];
    color: string;
    thickness: number;
    isEraser: boolean;
  }>) => {
    if (!isConnected || !roomId || !currentUserId) {
      throw new Error('Not connected to room');
    }

    const params: CreateOperationParams = {
      type: 'stroke_update',
      data: {
        stroke_id: strokeId,
        updates,
        timestamp: Date.now(),
      },
      optimistic: true,
    };

    return dispatch(sendOperation(params));
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Delete a stroke
  const deleteStroke = useCallback(async (strokeId: string) => {
    if (!isConnected || !roomId || !currentUserId) {
      throw new Error('Not connected to room');
    }

    const params: CreateOperationParams = {
      type: 'stroke_delete',
      data: {
        stroke_id: strokeId,
        timestamp: Date.now(),
      },
      optimistic: true,
    };

    return dispatch(sendOperation(params));
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Update cursor position
  const updateCursor = useCallback(async (position: Point) => {
    if (!isConnected || !roomId || !currentUserId) {
      return; // Cursor updates are not critical, don't throw
    }

    const params: CreateOperationParams = {
      type: 'cursor_move',
      data: {
        x: position.x,
        y: position.y,
        timestamp: Date.now(),
      },
      optimistic: false, // Don't need optimistic updates for cursor
    };

    return dispatch(sendOperation(params));
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Clear entire canvas
  const clearCanvas = useCallback(async () => {
    if (!isConnected || !roomId || !currentUserId) {
      throw new Error('Not connected to room');
    }

    const params: CreateOperationParams = {
      type: 'clear_all',
      data: {
        timestamp: Date.now(),
      },
      optimistic: true,
    };

    return dispatch(sendOperation(params));
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Batch multiple operations (for performance)
  const batchOperations = useCallback(async (operations: CreateOperationParams[]) => {
    if (!isConnected || !roomId || !currentUserId) {
      throw new Error('Not connected to room');
    }

    // Send operations sequentially (could be optimized to batch on server)
    const results = [];
    for (const params of operations) {
      results.push(await dispatch(sendOperation(params)));
    }
    return results;
  }, [dispatch, isConnected, roomId, currentUserId]);

  // Get current transformation state
  const getTransformState = useCallback(() => ({
    currentVersion,
    pendingOperationsCount: pendingOperations.length,
    hasPendingOperations: pendingOperations.length > 0,
    isConnected,
    canCreateOperations: isConnected && roomId && currentUserId,
  }), [currentVersion, pendingOperations.length, isConnected, roomId, currentUserId]);

  // Check if operation is pending
  const isPending = useCallback((operationId: string) => {
    return pendingOperations.some(op => op.id === operationId);
  }, [pendingOperations]);

  // Get pending operations
  const getPendingOperations = useCallback(() => {
    return [...pendingOperations];
  }, [pendingOperations]);

  // Manual sync request (for debugging/testing)
  const requestSync = useCallback(() => {
    if (!isConnected) return;
    
    // This would trigger a sync with the server
    // In a real implementation, this might fetch missed operations
    dispatch(whiteboardActions.setError(undefined)); // Clear any sync errors
  }, [dispatch, isConnected]);

  return {
    // Core operations
    createStroke,
    updateStroke,
    deleteStroke,
    updateCursor,
    clearCanvas,
    batchOperations,
    
    // State inspection
    getTransformState,
    isPending,
    getPendingOperations,
    
    // Utility
    requestSync,
    
    // State values (for convenience)
    currentVersion,
    pendingOperationsCount: pendingOperations.length,
    isConnected,
  };
};

