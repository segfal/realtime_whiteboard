import type { DrawingTool, ToolSettings } from "../types/tool";
import type { WASMPoint, WASMColor, WASMShape } from "../types/wasm";
import { generateSplinePoints, generateAdaptiveSpline } from "../utils/spline";
import type { Point } from "../interfaces/canvas";

export class SplineTool implements DrawingTool {
  id = "spline";
  name = "Spline";
  icon = "curve"; // Icon name for the toolbar
  cursor = "crosshair";
  
  isActive = false;
  color: WASMColor = { r: 0, g: 0, b: 0, a: 1 };
  thickness = 2;
  
  private controlPoints: Point[] = [];
  private isDrawingSpline = false;
  private segments = 15; // Number of segments for spline interpolation
  private alpha = 0.5; // Tension parameter (0.5 for centripetal)
  private adaptiveSegments = true; // Use adaptive segment count based on curvature
  
  startDrawing(point: WASMPoint): void {
    this.isDrawingSpline = true;
    this.controlPoints = [{ x: point.x, y: point.y }];
    console.log("SplineTool: Started drawing at", point);
  }
  
  continueDrawing(point: WASMPoint): void {
    if (!this.isDrawingSpline) return;
    
    // Add control point
    this.controlPoints.push({ x: point.x, y: point.y });
    
    // Limit control points to prevent performance issues
    if (this.controlPoints.length > 50) {
      this.controlPoints = this.controlPoints.slice(-50);
    }
    
    console.log("SplineTool: Added control point", point, "Total:", this.controlPoints.length);
  }
  
  finishDrawing(): WASMShape | null {
    if (!this.isDrawingSpline || this.controlPoints.length < 2) {
      this.isDrawingSpline = false;
      this.controlPoints = [];
      return null;
    }
    
    console.log("SplineTool: Finishing spline with", this.controlPoints.length, "control points");
    
    // Generate smooth spline points
    let splinePoints: Point[];
    if (this.adaptiveSegments) {
      splinePoints = generateAdaptiveSpline(
        this.controlPoints,
        this.segments,
        this.segments * 2,
        this.alpha
      );
    } else {
      splinePoints = generateSplinePoints(
        this.controlPoints,
        this.segments,
        this.alpha
      );
    }
    
    console.log("SplineTool: Generated", splinePoints.length, "spline points");
    
    // Create WASM shape
    const shape: WASMShape = {
      type: "stroke",
      points: splinePoints,
      color: this.color,
      thickness: this.thickness
    };
    
    // Reset state
    this.isDrawingSpline = false;
    this.controlPoints = [];
    
    return shape;
  }
  
  isDrawing(): boolean {
    return this.isDrawingSpline;
  }
  
  getCurrentBounds(): { x1: number; y1: number; x2: number; y2: number } | null {
    if (this.controlPoints.length === 0) return null;
    
    let minX = this.controlPoints[0].x;
    let minY = this.controlPoints[0].y;
    let maxX = this.controlPoints[0].x;
    let maxY = this.controlPoints[0].y;
    
    for (const point of this.controlPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }
  
  getSettings(): ToolSettings {
    return {
      color: this.color,
      thickness: this.thickness,
      smoothing: true,
      opacity: this.color.a
    };
  }
  
  updateSettings(settings: Partial<ToolSettings>): void {
    if (settings.color) this.color = settings.color;
    if (settings.thickness) this.thickness = settings.thickness;
    if (settings.opacity !== undefined) this.color.a = settings.opacity;
  }
  
  // Spline-specific settings
  setSegments(segments: number): void {
    this.segments = Math.max(5, Math.min(50, segments));
  }
  
  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }
  
  setAdaptiveSegments(enabled: boolean): void {
    this.adaptiveSegments = enabled;
  }
  
  // Get preview spline points for real-time display
  getPreviewPoints(): Point[] {
    if (this.controlPoints.length < 2) return this.controlPoints;
    
    if (this.adaptiveSegments) {
      return generateAdaptiveSpline(
        this.controlPoints,
        this.segments,
        this.segments * 2,
        this.alpha
      );
    } else {
      return generateSplinePoints(
        this.controlPoints,
        this.segments,
        this.alpha
      );
    }
  }
  
  // Get control points for debugging/visualization
  getControlPoints(): Point[] {
    return [...this.controlPoints];
  }
}
