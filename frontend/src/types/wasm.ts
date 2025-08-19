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
  
export interface DrawingEngineWASM {
    
    // New polymorphic shape methods
    addShape(shape: WASMShape): void;
    removeShape(index: number): void;
    moveShape(index: number, dx: number, dy: number): void;
    
    // Legacy methods for backward compatibility
    addStroke(stroke: WASMStroke): void;
    addPointToStroke(strokeIndex: number, point: WASMPoint): void;
    removeStroke(index: number): void;
    moveStroke(index: number, dx: number, dy: number): void;
    
    // Common methods
    clear(): void;
    getStrokes(): WASMStroke[];
    getVertexBufferData(): number[];
}