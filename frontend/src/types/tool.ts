import type { WASMPoint, WASMColor, WASMShape } from "./wasm";

export interface DrawingTool {
  id: string;
  name: string;
  icon: string; // Icon name or component
  cursor: string; // CSS cursor style

  // Tool state
  isActive: boolean;
  color: WASMColor;
  thickness: number;

  // Event handlers
  onPointerDown?(event: PointerEvent, canvas: HTMLCanvasElement): void;
  onPointerMove?(event: PointerEvent, canvas: HTMLCanvasElement): void;
  onPointerUp?(event: PointerEvent, canvas: HTMLCanvasElement): void;

  // Tool-specific methods
  startDrawing?(point: WASMPoint): void;
  continueDrawing?(point: WASMPoint): void;
  finishDrawing?(): WASMShape | null;

  // Tool state methods
  isDrawing?(): boolean;
  getCurrentBounds?(): {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null;

  // Tool settings
  getSettings?(): ToolSettings;
  updateSettings?(settings: Partial<ToolSettings>): void;
}

export interface ToolSettings {
  color: WASMColor;
  thickness: number;
  eraserSize?: number;
  opacity?: number;
  smoothing?: boolean;
  pressure?: boolean;
}

export type ToolType = "stroke" | "rectangle" | "ellipse" | "eraser" | "select" | "spline";

export interface ToolState {
  activeTool: ToolType;
  tools: Record<ToolType, DrawingTool>;
  settings: ToolSettings;
}
