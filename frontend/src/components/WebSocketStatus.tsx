import React from 'react';
import { useWhiteboard } from '../contexts/ctx';

export const WebSocketStatus: React.FC = () => {
  const { state } = useWhiteboard();
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      zIndex: 1000,
      backgroundColor: state.isConnected ? '#4CAF50' : '#f44336',
      color: 'white'
    }}>
      WebSocket: {state.isConnected ? 'Connected' : 'Disconnected'}
    </div>
  );
};
