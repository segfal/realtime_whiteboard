import { fireEvent, render, screen } from '@testing-library/react';
import { WhiteboardProvider } from '../../contexts/WhiteboardContext';
import { ChatPanel } from './ChatPanel';
import { vi } from 'vitest';
// Mock the useWhiteboard hook

window.HTMLElement.prototype.scrollIntoView = vi.fn();
vi.mock('../../contexts/ctx', async (importOriginal) => {
  const actual = await importOriginal(); // import real exports
  return {
    ...actual, // keep all original exports
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
      sendChatMessage: vi.fn(),
      sendTypingStatus: vi.fn(),
      markChatAsRead: vi.fn(),
    }),
  };
});
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
