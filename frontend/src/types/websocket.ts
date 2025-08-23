import type { ChatPayload, ChatSyncPayload, TypingPayload, UserJoinPayload, UserLeavePayload } from './chat';
import type { WASMStroke } from './wasm';

export type WebSocketMessageType = 
  | 'stroke:start'
  | 'stroke:point' 
  | 'stroke:finish'
  | 'stroke:add'
  | 'chat:message'
  | 'chat:typing'
  | 'chat:sync'
  | 'user:join'
  | 'user:leave'
  | 'board:sync';

export interface BaseWebSocketMessage {
  type: WebSocketMessageType;
  userId: string;
  timestamp: number;
}

export interface StrokeStartMessage extends BaseWebSocketMessage {
  type: 'stroke:start';
  payload: {
    strokeId: string;
    color: { r: number; g: number; b: number; a: number };
    thickness: number;
  };
}

export interface StrokePointMessage extends BaseWebSocketMessage {
  type: 'stroke:point';
  payload: {
    strokeId: string;
    point: { x: number; y: number };
  };
}

export interface StrokeFinishMessage extends BaseWebSocketMessage {
  type: 'stroke:finish';
  payload: {
    strokeId: string;
  };
}

export interface StrokeAddMessage extends BaseWebSocketMessage {
  type: 'stroke:add';
  payload: {
    stroke: WASMStroke & { id: string; userId: string };
  };
}

export interface ChatMessageWebSocket extends BaseWebSocketMessage {
  type: 'chat:message';
  payload: ChatPayload;
}

export interface ChatTypingMessage extends BaseWebSocketMessage {
  type: 'chat:typing';
  payload: TypingPayload;
}

export interface ChatSyncMessage extends BaseWebSocketMessage {
  type: 'chat:sync';
  payload: ChatSyncPayload;
}

export interface UserJoinMessage extends BaseWebSocketMessage {
  type: 'user:join';
  payload: UserJoinPayload;
}

export interface UserLeaveMessage extends BaseWebSocketMessage {
  type: 'user:leave';
  payload: UserLeavePayload;
}

export interface BoardSyncMessage extends BaseWebSocketMessage {
  type: 'board:sync';
  payload: {
    strokes: (WASMStroke & { id: string; userId: string })[];
    users: string[];
  };
}

export type WebSocketMessage = 
  | StrokeStartMessage
  | StrokePointMessage
  | StrokeFinishMessage
  | StrokeAddMessage
  | ChatMessageWebSocket
  | ChatTypingMessage
  | ChatSyncMessage
  | UserJoinMessage
  | UserLeaveMessage
  | BoardSyncMessage;
