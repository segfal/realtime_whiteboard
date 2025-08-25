import type { Point, Stroke } from "../interfaces/canvas";
import type { ChatState, WASMStroke, WebSocketMessage } from "../types";
import type { DrawingTool, ToolSettings, ToolType } from "../types/tool";

// State interface for the whiteboard
export interface WhiteboardState {
  // WebSocket State
  websocket: WebSocket | null;
  isConnected: boolean;
  userId: string;
  currentStrokeId: string | null;

  // Tool management
  activeTool: DrawingTool;
  settings: ToolSettings;
  allTools: DrawingTool[];

  // Drawing state
  currentStroke: Stroke | null;
  strokes: Stroke[];
  selectedStrokes: Set<number>;
  previewShape: Stroke | null;
  splinePreview: { controlPoints: Point[]; splinePoints: Point[]; color: string; thickness: number } | null;

  // UI state
  isDragging: boolean;
  dragStart: Point | null;
  exportFormat: "png" | "svg";

  // WASM state
  isWasmLoaded: boolean;
  wasmError: string | null;

  // Performance tracking
  strokeUpdateTrigger: number;

  // Chat state
  chat: ChatState;
}

// Context interface
export interface WhiteboardContextType {
  // State
  state: WhiteboardState;

  // Tool management
  setActiveTool: (toolType: ToolType) => void;
  updateSettings: (settings: Partial<ToolSettings>) => void;

  // Drawing operations
  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  finishDrawing: () => void;

  // Eraser operations
  eraseAtPoint: (point: Point) => void;

  // Selection operations
  selectStrokes: (indices: Set<number>) => void;
  moveSelectedStrokes: (dx: number, dy: number) => void;
  deleteSelectedStrokes: () => void;

  // Canvas operations
  clearCanvas: () => void;
  exportCanvas: (format: "png" | "svg") => void;

  // Stroke simplification operations
  simplifyStroke: (strokeIndex: number, epsilon?: number) => void;
  simplifyAllStrokes: (epsilon?: number) => void;

  // Utility
  triggerStrokeUpdate: () => void;
  syncStrokesFromWasm: () => void;
  connectWebSocket: () => void;
  strokeToJSON: (wasmStroke: WASMStroke) => unknown;
  sendStrokeViaWebSocket: (strokeData: unknown) => void;
  handleWebSocketMessage: (event: MessageEvent) => void;
  sendStrokeStart: (point: Point) => void;
  sendStrokePoint: (strokeId: string, point: Point) => void;
  sendStrokeFinish: (strokeId: string) => void;

  // Chat operations
  sendChatMessage: (content: string) => void;
  sendTypingStatus: (isTyping: boolean) => void;
  clearChat: () => void;
  markChatAsRead: () => void;
  
  // Enhanced WebSocket operations with proper typing
  sendWebSocketMessage: (message: WebSocketMessage) => void;
}
