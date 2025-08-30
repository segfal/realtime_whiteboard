import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebGPU (Windows compatible)
Object.defineProperty(global.navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn(),
    getPreferredCanvasFormat: vi.fn(() => 'bgra8unorm'),
  },
  writable: true,
});

// Mock WebSocket (Windows compatible)
global.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
})) as unknown as typeof WebSocket;

// Mock canvas context (Windows compatible)
const mockContext = {
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setTransform: vi.fn(),
};

Object.defineProperty(global.HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockContext),
});

// Mock ResizeObserver (Windows compatible)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame (Windows compatible)
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn();

// Windows-specific: Mock fetch if needed
global.fetch = vi.fn();

// Windows-specific: Mock crypto if needed
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr) => {
      // Fill array with random values
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(2)),
  },
  writable: true,
});



