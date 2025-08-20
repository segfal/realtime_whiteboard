import type { DrawingTool, ToolSettings } from "../types/tool";
import type { WASMShape, WASMPoint } from "../types/wasm";

export class EraserTool implements DrawingTool {
  id = "eraser";
  name = "Eraser";
  icon = "🧽";
  cursor = "crosshair";

  public isActive: boolean = false;
  public color = { r: 0, g: 0, b: 0, a: 1 };
  public thickness = 2;

  private eraserSize: number = 10;
  private _isErasing: boolean = false;
  private erasedIndices: Set<number> = new Set();

  constructor(settings: ToolSettings) {
    this.color = settings.color;
    this.thickness = settings.thickness;
  }

  updateSettings(settings: ToolSettings): void {
    this.color = settings.color;
    this.thickness = settings.thickness;
    if (settings.eraserSize) {
      this.eraserSize = settings.eraserSize;
    }
  }

  // Remove the event handlers since they're handled by Canvas component
  onPointerDown(_event: PointerEvent, _canvas: HTMLCanvasElement): void {
    // Event handling is done by Canvas component
  }

  onPointerMove(_event: PointerEvent, _canvas: HTMLCanvasElement): void {
    // Event handling is done by Canvas component
  }

  onPointerUp(_event: PointerEvent, _canvas: HTMLCanvasElement): void {
    // Event handling is done by Canvas component
  }

  startDrawing(_point: WASMPoint): void {
    this._isErasing = true;
    this.erasedIndices.clear();
  }

  continueDrawing(_point: WASMPoint): void {
    // Eraser continues erasing as it moves
  }

  finishDrawing(): WASMShape | null {
    // Eraser doesn't create shapes
    this._isErasing = false;
    return null;
  }

  getEraserSize(): number {
    return this.eraserSize;
  }

  setEraserSize(size: number): void {
    this.eraserSize = size;
  }

  isErasing(): boolean {
    return this._isErasing;
  }

  getErasedIndices(): Set<number> {
    return new Set(this.erasedIndices);
  }

  addErasedIndex(index: number): void {
    this.erasedIndices.add(index);
  }

  clearErasedIndices(): void {
    this.erasedIndices.clear();
  }

  // Helper method to check if a point is within eraser radius of a stroke
  isPointInEraserRadius(point: WASMPoint, strokePoints: WASMPoint[]): boolean {
    return strokePoints.some((strokePoint) => {
      const distance = Math.hypot(
        point.x - strokePoint.x,
        point.y - strokePoint.y,
      );
      return distance <= this.eraserSize;
    });
  }

  // Helper method to check if eraser intersects with stroke line segments
  eraserIntersectsStroke(point: WASMPoint, strokePoints: WASMPoint[]): boolean {
    for (let i = 0; i < strokePoints.length - 1; i++) {
      const a = strokePoints[i];
      const b = strokePoints[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lengthSq = dx * dx + dy * dy;

      if (lengthSq === 0) continue;

      let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
      t = Math.max(0, Math.min(1, t));

      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.hypot(point.x - projX, point.y - projY);

      if (dist <= this.eraserSize) return true;
    }
    return false;
  }
}
