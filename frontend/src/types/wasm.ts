export interface WASMPoint {
    x: number;
    y: number;
}
  
export interface WASMColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export type WASMShapeType = 'stroke' | 'rectangle' | 'ellipse';

export interface WASMBaseShape {
    type: WASMShapeType;
    color: WASMColor;
    thickness: number;
}

export interface WASMStrokeShape extends WASMBaseShape {
    type: 'stroke';
    points: WASMPoint[];
}

export interface WASMRectangleShape extends WASMBaseShape {
    type: 'rectangle';
    topLeft: WASMPoint;
    bottomRight: WASMPoint;
}

export type WASMShape = WASMStrokeShape | WASMRectangleShape;

// Legacy interface for backward compatibility
export interface WASMStroke {
    points: WASMPoint[];
    color: WASMColor;
    thickness: number;
}
  
export abstract class DrawingEngineWASM {
    
    // New polymorphic shape methods
    abstract addShape(shape: WASMShape): void;
    abstract removeShape(index: number): void;
    abstract moveShape(index: number, dx: number, dy: number): void;
    
    // Legacy methods for backward compatibility
    abstract addStroke(stroke: WASMStroke): void;
    abstract addPointToStroke(strokeIndex: number, point: WASMPoint): void;
    abstract removeStroke(index: number): void;
    abstract moveStroke(index: number, dx: number, dy: number): void;
    
    // Common methods
    abstract clear(): void;
    abstract getStrokes(): WASMStroke[];
    abstract getVertexBufferData(): number[];
}