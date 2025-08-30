// Drawing types for enhanced tools
export enum ToolType {
  BRUSH = "brush",
  ERASER = "eraser",
  SELECT = "select",
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  LINE = "line",
  TEXT = "text",
}

export interface Point {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  timestamp: number;
  isSelected?: boolean;
}

export interface DrawingState {
  strokes: DrawingStroke[];
  selectedTool: ToolType;
  strokeColor: string;
  strokeWidth: number;
  backgroundColor: string;
  zoom: number;
  pan: Point;
}

export interface CanvasSettings {
  width: number;
  height: number;
  allowUndo: boolean;
  maxUndoLevels: number;
  autoSave: boolean;
  autoSaveInterval: number;
}
