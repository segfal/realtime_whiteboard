import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import { whiteboardActions, sendOperation } from './whiteboardSlice';
import { WebSocketMessage, Operation } from './types';

// WebSocket middleware for handling real-time communication with OT support
let websocket: WebSocket | null = null;
let reconnectInterval: NodeJS.Timeout | null = null;
let heartbeatInterval: NodeJS.Timeout | null = null;

const WEBSOCKET_CONNECT = 'websocket/connect';
const WEBSOCKET_DISCONNECT = 'websocket/disconnect';
const WEBSOCKET_SEND = 'websocket/send';

// Action creators
export const websocketConnect = (url: string, roomId: string, userId: string) => ({
  type: WEBSOCKET_CONNECT,
  payload: { url, roomId, userId },
});

export const websocketDisconnect = () => ({
  type: WEBSOCKET_DISCONNECT,
});

export const websocketSend = (message: any) => ({
  type: WEBSOCKET_SEND,
  payload: message,
});

export const websocketMiddleware: Middleware = (api: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
  const { dispatch, getState } = api;
  
  switch (action.type) {
    case WEBSOCKET_CONNECT:
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
      
      const { url, roomId, userId } = action.payload;
      websocket = new WebSocket(url);
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        dispatch(whiteboardActions.setConnected(true));
        dispatch(whiteboardActions.setRoomId(roomId));
        dispatch(whiteboardActions.setUserId(userId));
        
        // Join room
        const joinMessage: WebSocketMessage = {
          type: 'join',
          room: roomId,
          data: { user_id: userId },
        };
        websocket?.send(JSON.stringify(joinMessage));
        
        // Start heartbeat
        startHeartbeat();
        
        // Clear reconnect interval if it was running
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(dispatch, getState, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        dispatch(whiteboardActions.setConnected(false));
        
        // Stop heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        // Attempt to reconnect unless explicitly closed
        if (event.code !== 1000) {
          attemptReconnect(dispatch, url, roomId, userId);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        dispatch(whiteboardActions.setError('WebSocket connection error'));
      };
      break;
      
    case WEBSOCKET_DISCONNECT:
      if (websocket) {
        websocket.close(1000, 'Client disconnecting');
        websocket = null;
      }
      
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      dispatch(whiteboardActions.setConnected(false));
      break;
      
    case WEBSOCKET_SEND:
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(action.payload));
      } else {
        console.warn('WebSocket not connected, queuing message');
        // In a real implementation, you'd queue messages for retry
      }
      break;
      
    case sendOperation.fulfilled.type:
      // Send operation to server when fulfilled
      const operation = action.meta.arg as any; // The operation from sendOperation
      const operationMessage: WebSocketMessage = {
        type: 'operation',
        room: getState().whiteboard.roomId,
        data: operation,
      };
      
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(operationMessage));
      }
      break;
  }
  
  return next(action);
};

function handleWebSocketMessage(
  dispatch: Dispatch,
  getState: () => any,
  message: WebSocketMessage
) {
  const state = getState();
  
  switch (message.type) {
    case 'joined':
      // Room join confirmation with initial data
      console.log('Joined room:', message.room);
      if (message.data && Array.isArray(message.data)) {
        // Load initial strokes
        const operations: Operation[] = message.data.map((strokeData: any) => ({
          id: strokeData.id || `stroke_${Date.now()}_${Math.random()}`,
          type: 'stroke_create',
          roomId: message.room,
          userId: 'system',
          version: strokeData.version || 0,
          data: { stroke_data: strokeData },
          createdAt: strokeData.created_at || new Date().toISOString(),
        }));
        
        dispatch(whiteboardActions.loadOperations(operations));
      }
      break;
      
    case 'operation':
      // Server operation received (transformed)
      if (message.data && message.data.operation) {
        const operation: Operation = message.data.operation;
        dispatch(whiteboardActions.receiveServerOperation(operation));
      }
      break;
      
    case 'sync_operation':
      // Operation sync during reconnection
      if (message.data && message.data.operation) {
        const operation: Operation = message.data.operation;
        dispatch(whiteboardActions.receiveServerOperation(operation));
      }
      break;
      
    case 'user_joined':
      // User joined the room
      if (message.data) {
        dispatch(whiteboardActions.updateUser({
          userId: message.data.user_id,
          isActive: true,
          lastActivity: new Date().toISOString(),
        }));
      }
      break;
      
    case 'user_left':
      // User left the room
      if (message.data) {
        dispatch(whiteboardActions.removeUser(message.data.user_id));
      }
      break;
      
    case 'cursor_update':
      // Cursor position update
      if (message.data) {
        dispatch(whiteboardActions.updateUser({
          userId: message.data.user_id,
          cursorPosition: { x: message.data.x, y: message.data.y },
          isActive: true,
          lastActivity: new Date().toISOString(),
        }));
      }
      break;
      
    case 'clear':
      // Canvas cleared
      dispatch(whiteboardActions.clearCanvas());
      break;
      
    case 'error':
      // Server error
      console.error('Server error:', message.data);
      dispatch(whiteboardActions.setError(message.data.message || 'Server error'));
      break;
      
    case 'sync_request':
      // Server requesting sync (client might be out of sync)
      const currentVersion = state.whiteboard.currentVersion;
      const syncMessage: WebSocketMessage = {
        type: 'sync_response',
        room: state.whiteboard.roomId,
        data: { version: currentVersion },
      };
      
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(syncMessage));
      }
      break;
      
    default:
      console.log('Unknown WebSocket message type:', message.type);
  }
}

function attemptReconnect(
  dispatch: Dispatch,
  url: string,
  roomId: string,
  userId: string
) {
  if (reconnectInterval) return; // Already attempting to reconnect
  
  let attempts = 0;
  const maxAttempts = 10;
  const baseDelay = 1000; // 1 second
  
  reconnectInterval = setInterval(() => {
    attempts++;
    const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), 30000); // Max 30 seconds
    
    console.log(`Attempting to reconnect (${attempts}/${maxAttempts}) in ${delay}ms...`);
    
    if (attempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
      dispatch(whiteboardActions.setError('Connection lost. Please refresh the page.'));
      return;
    }
    
    // Try to reconnect
    dispatch(websocketConnect(url, roomId, userId));
  }, 5000); // Try every 5 seconds
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  heartbeatInterval = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000); // Ping every 30 seconds
}

// Hook for components to use WebSocket actions
export const useWebSocket = () => {
  return {
    connect: websocketConnect,
    disconnect: websocketDisconnect,
    send: websocketSend,
  };
};