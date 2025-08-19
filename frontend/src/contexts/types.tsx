import type { ToolType, ToolSettings, DrawingTool } from '../types/tool';
import type { Point, Stroke } from '../interfaces/canvas';
import type { WASMStroke } from '../types';


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
  
  // UI state
  isDragging: boolean;
  dragStart: Point | null;
  exportFormat: 'png' | 'svg';
  
  // WASM state
  isWasmLoaded: boolean;
  wasmError: string | null;
  
  // Performance tracking
  strokeUpdateTrigger: number;
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
  exportCanvas: (format: 'png' | 'svg') => void;
  
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
}
