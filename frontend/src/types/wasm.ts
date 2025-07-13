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
  
export interface WASMStroke {
    points: WASMPoint[];
    color: WASMColor;
    thickness: number;
}
  
export interface DrawingEngineWASM {
    new(): DrawingEngineWASM;
    addStroke(stroke: WASMStroke): void;
    addPointToStroke(strokeIndex: number, point: WASMPoint): void;
    removeStroke(index: number): void;
    moveStroke(index: number, dx: number, dy: number): void;
    clear(): void;
    getStrokes(): WASMStroke[];
    getVertexBufferData(): number[];
}