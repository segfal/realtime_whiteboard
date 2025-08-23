// Shared WebSocket message types between frontend and server

export interface Point {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Stroke {
  points: Point[];
  color: Color;
  thickness: number;
}

export interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

// WebSocket message types
export type WebSocketMessageType = 
  | 'stroke:start'
  | 'stroke:point'
  | 'stroke:finish'
  | 'stroke:add'
  | 'stroke:remove'
  | 'stroke:move'
  | 'chat:message'
  | 'user:join'
  | 'user:leave'
  | 'sync:request'
  | 'sync:response';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

// Specific message payloads
export interface StrokeStartPayload {
  strokeId: string;
  color: Color;
  thickness: number;
  userId: string;
  timestamp: number;
}

export interface StrokePointPayload {
  strokeId: string;
  point: Point;
  userId: string;
  timestamp: number;
}

export interface StrokeFinishPayload {
  strokeId: string;
  userId: string;
  timestamp: number;
}

export interface StrokeAddPayload {
  stroke: Stroke;
  userId: string;
  timestamp: number;
}

export interface ChatMessagePayload {
  user: string;
  message: string;
  timestamp: string;
}

export interface UserJoinPayload {
  userId: string;
  username: string;
  timestamp: number;
}

export interface SyncResponsePayload {
  strokes: Stroke[];
  users: string[];
  timestamp: number;
}
