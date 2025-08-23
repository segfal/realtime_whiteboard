import { fireEvent, render, screen } from '@testing-library/react';
import { WhiteboardProvider } from '../../contexts/WhiteboardContext';
import { ChatPanel } from './ChatPanel';

// Mock the useWhiteboard hook
jest.mock('../../contexts/ctx', () => ({
  useWhiteboard: () => ({
    state: {
      userId: 'test-user-123',
      isConnected: true,
      chat: {
        messages: [],
        isTyping: false,
        typingUsers: new Set(),
        unreadCount: 0,
      },
    },
    sendChatMessage: jest.fn(),
    sendTypingStatus: jest.fn(),
    markChatAsRead: jest.fn(),
  }),
}));

describe('ChatPanel', () => {
  it('renders chat panel when closed', () => {
    render(
      <WhiteboardProvider>
        <ChatPanel />
      </WhiteboardProvider>
    );
    
    expect(screen.getByText('💬 Chat')).toBeInTheDocument();
  });

  it('opens chat panel when header is clicked', () => {
    render(
      <WhiteboardProvider>
        <ChatPanel />
      </WhiteboardProvider>
    );
    
    const header = screen.getByText('💬 Chat');
    fireEvent.click(header);
    
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });
});
