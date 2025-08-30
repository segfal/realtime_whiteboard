// Store types for Operational Transform and state management

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Operation {
  id: string;
  type: OperationType;
  roomId: string;
  userId: string;
  version: number;
  data: Record<string, any>;
  createdAt: string;
  appliedAt?: string;
  transformedFrom?: string[];
}

export type OperationType = 
  | 'stroke_create' 
  | 'stroke_update' 
  | 'stroke_delete' 
  | 'cursor_move' 
  | 'selection' 
  | 'clear_all';

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  thickness: number;
  isEraser: boolean;
  userId: string;
  createdAt: string;
  version: number;
}

export interface UserState {
  userId: string;
  cursorPosition?: Point;
  viewportBounds?: BoundingBox;
  isActive: boolean;
  lastActivity: string;
}

export interface WhiteboardState {
  // Canvas state
  strokes: Record<string, Stroke>;
  
  // Operational Transform state
  currentVersion: number;
  pendingOperations: Operation[];
  operationHistory: Operation[];
  
  // User state
  users: Record<string, UserState>;
  currentUserId: string;
  
  // Connection state
  isConnected: boolean;
  roomId: string;
  lastSyncVersion: number;
  
  // Viewport state
  viewport: BoundingBox;
  canvasSize: { width: number; height: number };
  
  // UI state
  selectedTool: string;
  isLoading: boolean;
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  room: string;
  username?: string;
  data: any;
}

export interface TransformResult {
  operation: Operation;
  success: boolean;
  error?: string;
}

// Client-side operation creation
export interface CreateOperationParams {
  type: OperationType;
  data: Record<string, any>;
  optimistic?: boolean; // Apply immediately without waiting for server
}

// Viewport culling support
export interface ViewportQuery {
  bounds: BoundingBox;
  limit?: number;
}

// Session recovery
export interface SessionState {
  operations: Operation[];
  version: number;
  timestamp: string;
}