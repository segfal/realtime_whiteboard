import type { DrawingTool, ToolSettings } from "../types/tool";
import type {
  WASMPoint,
  WASMColor,
  WASMShape,
  WASMStrokeShape,
} from "../types/wasm";

export class StrokeTool implements DrawingTool {
  id = "stroke";
  name = "Pen";
  icon = "✏️";
  cursor = "crosshair";

  isActive = false;
  color: WASMColor = { r: 0, g: 0, b: 0, a: 1 };
  thickness = 2;

  private currentPoints: WASMPoint[] = [];
  private _isDrawing = false;

  constructor(settings?: Partial<ToolSettings>) {
    if (settings) {
      this.updateSettings(settings);
    }
  }

  // Remove the event handlers since they're handled by Canvas component
  onPointerDown(_event: PointerEvent, _canvas: HTMLCanvasElement): void {
    // Event handling is done by Canvas component
  }

  onPointerMove(_event: PointerEvent, _canvas: HTMLCanvasElement): void {
    // Event handling is done by Canvas component
  }

  onPointerUp(): void {
    // Event handling is done by Canvas component
  }

  startDrawing(point: WASMPoint): void {
    this.currentPoints = [point];
    this._isDrawing = true;
  }

  continueDrawing(point: WASMPoint): void {
    if (this._isDrawing) {
      this.currentPoints.push(point);
    }
  }

  finishDrawing(): WASMShape | null {
    if (this.currentPoints.length < 2) {
      this.currentPoints = [];
      this._isDrawing = false;
      return null;
    }

    const stroke: WASMStrokeShape = {
      type: "stroke",
      points: [...this.currentPoints],
      color: this.color,
      thickness: this.thickness,
    };

    this.currentPoints = [];
    this._isDrawing = false;
    return stroke;
  }

  getSettings(): ToolSettings {
    return {
      color: this.color,
      thickness: this.thickness,
    };
  }

  isDrawing(): boolean {
    return this._isDrawing;
  }

  updateSettings(settings: Partial<ToolSettings>): void {
    if (settings.color) this.color = settings.color;
    if (settings.thickness) this.thickness = settings.thickness;
  }
}
