import type { DrawingTool, ToolSettings } from "../types/tool";
import type { WASMShape, WASMPoint } from "../types/wasm";
import type { SelectionBounds } from "../interfaces/canvas";

export class SelectTool implements DrawingTool {
  id = "select";
  name = "Select";
  icon = "👆";
  cursor = "crosshair";

  public isActive: boolean = false;
  public color = { r: 0, g: 0, b: 0, a: 1 };
  public thickness = 2;

  private startPoint: WASMPoint | null = null;
  private currentPoint: WASMPoint | null = null;
  private isDragging: boolean = false;
  private _isSelecting: boolean = false;
  private selectedIndices: Set<number> = new Set();

  constructor(settings: ToolSettings) {
    this.color = settings.color;
    this.thickness = settings.thickness;
  }

  updateSettings(settings: ToolSettings): void {
    this.color = settings.color;
    this.thickness = settings.thickness;
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

  startDrawing(point: WASMPoint): void {
    this.startPoint = point;
    this.currentPoint = point;
    this._isSelecting = true;
  }

  continueDrawing(point: WASMPoint): void {
    this.currentPoint = point;
  }

  finishDrawing(): WASMShape | null {
    // Select tool doesn't create shapes
    this._isSelecting = false;
    this.isDragging = false;
    return null;
  }

  getSelectionBounds(): SelectionBounds | null {
    if (!this.startPoint || !this.currentPoint) return null;

    return {
      x1: Math.min(this.startPoint.x, this.currentPoint.x),
      y1: Math.min(this.startPoint.y, this.currentPoint.y),
      x2: Math.max(this.startPoint.x, this.currentPoint.x),
      y2: Math.max(this.startPoint.y, this.currentPoint.y),
    };
  }

  isSelecting(): boolean {
    return this._isSelecting;
  }

  isDraggingSelection(): boolean {
    return this.isDragging;
  }

  getSelectedIndices(): Set<number> {
    return new Set(this.selectedIndices);
  }

  setSelectedIndices(indices: Set<number>): void {
    this.selectedIndices = new Set(indices);
  }

  clearSelection(): void {
    this.selectedIndices.clear();
  }

  // Helper method to check if a point is near a stroke
  isPointNearStroke(
    point: WASMPoint,
    strokePoints: WASMPoint[],
    threshold: number = 8,
  ): boolean {
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

      if (dist <= threshold) return true;
    }
    return false;
  }

  // Helper method to check if a stroke intersects with selection rectangle
  strokeIntersectsRect(
    strokePoints: WASMPoint[],
    rect: SelectionBounds,
  ): boolean {
    return strokePoints.some(
      (point) =>
        point.x >= rect.x1 &&
        point.x <= rect.x2 &&
        point.y >= rect.y1 &&
        point.y <= rect.y2,
    );
  }
}
