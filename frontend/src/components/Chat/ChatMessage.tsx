import React from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwnMessage: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isOwnMessage }) => {
  const messageClass = `chat-message ${isOwnMessage ? 'own' : 'other'} ${message.type}`;
  
  return (
    <div className={messageClass}>
      {message.type === 'text' && (
        <>
          <div className="message-header">
            <span className="username">{message.username}</span>
            <span className="timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className="message-content">{message.content}</div>
        </>
      )}
      
      {message.type === 'system' && (
        <div className="system-message">{message.content}</div>
      )}
    </div>
  );
};
