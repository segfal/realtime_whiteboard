export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  typingUsers: Set<string>;
  unreadCount: number;
}

export interface ChatPayload {
  userId: string;
  username: string;
  content: string;
  timestamp: number;
}

export interface TypingPayload {
  userId: string;
  isTyping: boolean;
}

export interface ChatSyncPayload {
  chatHistory: ChatMessage[];
}

export interface UserJoinPayload {
  userId: string;
  username: string;
  timestamp: number;
}

export interface UserLeavePayload {
  userId: string;
  timestamp: number;
}
