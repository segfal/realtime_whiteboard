import React, { useEffect, useRef, useState } from 'react';
import { useWhiteboard } from '../../contexts/ctx';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import './ChatPanel.css';

export const ChatPanel: React.FC = () => {
  const { state, sendChatMessage, sendTypingStatus, markChatAsRead } = useWhiteboard();
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  console.log("ChatPanel render - messages count:", state.chat.messages.length);
  console.log("ChatPanel render - messages:", state.chat.messages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chat.messages]);

  useEffect(() => {
    if (isOpen) {
      markChatAsRead();
    }
  }, [isOpen, markChatAsRead]);

  // Test function to add a message locally
  const addTestMessage = () => {
    const testMessage = {
      id: crypto.randomUUID(),
      userId: 'test-user',
      username: 'Test User',
      content: 'This is a test message',
      timestamp: Date.now(),
      type: 'text' as const
    };
    // Dispatch directly to test UI
    // This bypasses WebSocket to test if the UI works
  };

  return (
    <div className={`chat-panel ${isOpen ? 'open' : 'closed'}`}>
      <ChatHeader 
        isOpen={isOpen} 
        onToggle={() => setIsOpen(!isOpen)}
        userCount={state.chat.typingUsers.size}
        unreadCount={state.chat.unreadCount}
      />
      
      {isOpen && (
        <>
          <div className="chat-messages">
            {state.chat.messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                No messages yet. Start chatting!
              </div>
            )}
            {state.chat.messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message}
                isOwnMessage={message.userId === state.userId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <ChatInput 
            onSendMessage={sendChatMessage}
            onTyping={sendTypingStatus}
            isTyping={state.chat.isTyping}
            disabled={!state.isConnected}
          />
        </>
      )}
    </div>
  );
};
