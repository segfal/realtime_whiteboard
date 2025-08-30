import React from 'react';

interface ChatHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  userCount: number;
  unreadCount: number;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  isOpen, 
  onToggle, 
  userCount, 
  unreadCount 
}) => {
  return (
    <div className="chat-header" onClick={onToggle}>
      <div className="chat-header-content">
        <span className="chat-title">
          💬 Chat
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount}</span>
          )}
        </span>
        <span className="chat-toggle">
          {isOpen ? '−' : '+'}
        </span>
      </div>
      {isOpen && userCount > 0 && (
        <div className="typing-indicator">
          {userCount} user{userCount > 1 ? 's' : ''} typing...
        </div>
      )}
    </div>
  );
};
