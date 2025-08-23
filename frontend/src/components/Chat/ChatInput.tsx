import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  onTyping: (isTyping: boolean) => void;
  isTyping: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onTyping, 
  isTyping, 
  disabled = false 
}) => {
  const [inputValue, setInputValue] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Send typing status
    onTyping(value.length > 0);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  }, [onTyping]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || disabled) return;
    
    onSendMessage(inputValue);
    setInputValue('');
    onTyping(false);
  }, [inputValue, onSendMessage, onTyping, disabled]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="chat-input">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Type a message..."
        disabled={disabled}
        className="chat-input-field"
      />
      <button 
        type="submit" 
        disabled={!inputValue.trim() || disabled}
        className="chat-send-button"
      >
        Send
      </button>
    </form>
  );
};
