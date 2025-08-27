import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  BoundingBox,
  CreateOperationParams,
  Operation,
  Stroke,
  UserState,
  WhiteboardState,
} from "./types";

// Initial state
const initialState: WhiteboardState = {
  strokes: {},
  currentVersion: 0,
  pendingOperations: [],
  operationHistory: [],
  users: {},
  currentUserId: "",
  isConnected: false,
  roomId: "",
  lastSyncVersion: 0,
  viewport: { x1: 0, y1: 0, x2: 1920, y2: 1080 },
  canvasSize: { width: 1920, height: 1080 },
  selectedTool: "stroke",
  isLoading: false,
};

// Async thunks for WebSocket operations
export const sendOperation = createAsyncThunk(
  "whiteboard/sendOperation",
  async (params: CreateOperationParams, { getState, dispatch }) => {
    const state = getState() as { whiteboard: WhiteboardState };
    const { whiteboard } = state;

    const operation: Operation = {
      id: generateOperationId(),
      type: params.type,
      roomId: whiteboard.roomId,
      userId: whiteboard.currentUserId,
      version: 0, // Will be set by server
      data: {
        ...params.data,
        client_version: whiteboard.currentVersion,
      },
      createdAt: new Date().toISOString(),
    };

    // Optimistic update (apply immediately)
    if (params.optimistic !== false) {
      dispatch(whiteboardSlice.actions.addPendingOperation(operation));
      dispatch(whiteboardSlice.actions.applyOperationOptimistic(operation));
    }

    return operation;
  }
);

export const syncOperations = createAsyncThunk(
  "whiteboard/syncOperations",
  async (_, { getState }) => {
    const state = getState() as { whiteboard: WhiteboardState };
    const { whiteboard } = state;

    // This would normally make HTTP request to get missed operations
    // For now, return empty array
    return [];
  }
);

// Utility functions
function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function strokeFromOperation(operation: Operation): Stroke | null {
  if (operation.type !== "stroke_create") return null;

  const strokeData = operation.data.stroke_data;
  if (!strokeData) return null;
  // Normalize points: accept either [{x,y}] or [[x,y]]
  const rawPoints = Array.isArray(strokeData.points) ? strokeData.points : [];
  const points = rawPoints
    .map((p: any) => {
      if (p && typeof p.x === "number" && typeof p.y === "number") return p;
      if (Array.isArray(p) && p.length >= 2) return { x: p[0], y: p[1] };
      return null;
    })
    .filter(Boolean) as { x: number; y: number }[];

  return {
    id: operation.id,
    points,
    color: strokeData.color || "#000000",
    thickness: strokeData.thickness || 2,
    isEraser: strokeData.isEraser || false,
    userId: operation.userId,
    createdAt: operation.createdAt,
    version: operation.version,
  };
}

function isStrokeInViewport(stroke: Stroke, viewport: BoundingBox): boolean {
  if (stroke.points.length === 0) return false;

  // Simple bounding box check
  const minX = Math.min(...stroke.points.map((p) => p.x));
  const maxX = Math.max(...stroke.points.map((p) => p.x));
  const minY = Math.min(...stroke.points.map((p) => p.y));
  const maxY = Math.max(...stroke.points.map((p) => p.y));

  return !(
    maxX < viewport.x1 ||
    minX > viewport.x2 ||
    maxY < viewport.y1 ||
    minY > viewport.y2
  );
}

// Transform operation against another operation (simplified OT)
function transformOperation(op1: Operation, op2: Operation): Operation {
  const transformed = { ...op1 };

  // Simple transformation rules
  switch (op1.type) {
    case "stroke_create":
      // Stroke creations don't conflict
      return transformed;

    case "stroke_update":
      if (
        op2.type === "stroke_delete" &&
        op1.data.stroke_id === op2.data.stroke_id
      ) {
        // Update after delete = noop
        transformed.type = "stroke_delete"; // Convert to noop
        transformed.data = { noop: true };
      }
      return transformed;

    case "stroke_delete":
      if (
        op2.type === "stroke_update" &&
        op1.data.stroke_id === op2.data.stroke_id
      ) {
        // Delete after update = still delete
        return transformed;
      }
      return transformed;

    default:
      return transformed;
  }
}

// Main slice
const whiteboardSlice = createSlice({
  name: "whiteboard",
  initialState,
  reducers: {
    // Connection management
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },

    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },

    setUserId: (state, action: PayloadAction<string>) => {
      state.currentUserId = action.payload;
    },

    // Operation management
    addPendingOperation: (state, action: PayloadAction<Operation>) => {
      state.pendingOperations.push(action.payload);
    },

    removePendingOperation: (state, action: PayloadAction<string>) => {
      state.pendingOperations = state.pendingOperations.filter(
        (op) => op.id !== action.payload
      );
    },

    // Server operation received (needs transformation)
    receiveServerOperation: (state, action: PayloadAction<Operation>) => {
      const serverOp = action.payload;

      // Update version
      if (serverOp.version > state.currentVersion) {
        state.currentVersion = serverOp.version;
      }

      // If this is our own operation, remove from pending
      const pendingIndex = state.pendingOperations.findIndex(
        (op) => op.id === serverOp.id
      );

      if (pendingIndex >= 0) {
        // Our operation was accepted
        state.pendingOperations.splice(pendingIndex, 1);
        // Update the operation in history with server version
        const stroke = strokeFromOperation(serverOp);
        if (stroke && state.strokes[stroke.id]) {
          state.strokes[stroke.id].version = serverOp.version;
        }
      } else {
        // Transform and apply remote operation
        let transformedOp = serverOp;

        // Transform against pending operations
        for (const pendingOp of state.pendingOperations) {
          transformedOp = transformOperation(transformedOp, pendingOp);
        }

        // Apply transformed operation
        state = applyOperationToState(state, transformedOp);
      }

      // Add to history
      state.operationHistory.push(serverOp);

      // Keep history manageable (last 1000 operations)
      if (state.operationHistory.length > 1000) {
        state.operationHistory = state.operationHistory.slice(-1000);
      }
    },

    // Optimistic operation application
    applyOperationOptimistic: (state, action: PayloadAction<Operation>) => {
      state = applyOperationToState(state, action.payload);
    },

    // Viewport management
    updateViewport: (state, action: PayloadAction<BoundingBox>) => {
      state.viewport = action.payload;
    },

    // User management
    updateUser: (state, action: PayloadAction<UserState>) => {
      state.users[action.payload.userId] = action.payload;
    },

    removeUser: (state, action: PayloadAction<string>) => {
      delete state.users[action.payload];
    },

    // Bulk operations for sync
    loadOperations: (state, action: PayloadAction<Operation[]>) => {
      for (const operation of action.payload) {
        state = applyOperationToState(state, operation);
        if (operation.version > state.currentVersion) {
          state.currentVersion = operation.version;
        }
      }
      state.operationHistory.push(...action.payload);
    },

    // Tool selection
    setSelectedTool: (state, action: PayloadAction<string>) => {
      state.selectedTool = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | undefined>) => {
      state.error = action.payload;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Clear operations (for clear_all)
    clearCanvas: (state) => {
      state.strokes = {};
      state.currentVersion++;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(sendOperation.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(sendOperation.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendOperation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(syncOperations.fulfilled, (state, action) => {
        // Apply synced operations
        for (const operation of action.payload) {
          state = applyOperationToState(state, operation);
        }
      });
  },
});

// Helper function to apply operation to state
function applyOperationToState(
  state: WhiteboardState,
  operation: Operation
): WhiteboardState {
  switch (operation.type) {
    case "stroke_create": {
      const stroke = strokeFromOperation(operation);
      if (stroke && isStrokeInViewport(stroke, state.viewport)) {
        state.strokes[stroke.id] = stroke;
      }
      break;
    }

    case "stroke_update": {
      const strokeId = operation.data.stroke_id;
      const updates = operation.data.updates;
      if (strokeId && state.strokes[strokeId] && updates) {
        state.strokes[strokeId] = { ...state.strokes[strokeId], ...updates };
      }
      break;
    }

    case "stroke_delete": {
      const strokeId = operation.data.stroke_id;
      if (strokeId && state.strokes[strokeId]) {
        delete state.strokes[strokeId];
      }
      break;
    }

    case "cursor_move": {
      const userId = operation.userId;
      const position = operation.data;
      if (state.users[userId]) {
        state.users[userId].cursorPosition = { x: position.x, y: position.y };
        state.users[userId].lastActivity = operation.createdAt;
      }
      break;
    }

    case "clear_all": {
      state.strokes = {};
      break;
    }
  }

  return state;
}

// Selectors
export const selectStrokes = (state: { whiteboard: WhiteboardState }) =>
  state.whiteboard.strokes;
export const selectVisibleStrokes = (state: {
  whiteboard: WhiteboardState;
}) => {
  const { strokes, viewport } = state.whiteboard;
  const visibleStrokes: Record<string, Stroke> = {};

  Object.entries(strokes).forEach(([id, stroke]) => {
    if (isStrokeInViewport(stroke, viewport)) {
      visibleStrokes[id] = stroke;
    }
  });

  return visibleStrokes;
};

export const selectUsers = (state: { whiteboard: WhiteboardState }) =>
  state.whiteboard.users;
export const selectConnectionState = (state: {
  whiteboard: WhiteboardState;
}) => ({
  isConnected: state.whiteboard.isConnected,
  roomId: state.whiteboard.roomId,
  currentUserId: state.whiteboard.currentUserId,
});

export const selectOperationState = (state: {
  whiteboard: WhiteboardState;
}) => ({
  currentVersion: state.whiteboard.currentVersion,
  pendingOperations: state.whiteboard.pendingOperations,
  lastSyncVersion: state.whiteboard.lastSyncVersion,
});

export const whiteboardActions = whiteboardSlice.actions;
export default whiteboardSlice.reducer;
