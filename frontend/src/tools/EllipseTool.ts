import type { DrawingTool, ToolSettings } from '../types/tool';
import type { WASMShape, WASMStrokeShape, WASMPoint } from '../types/wasm';
import type { SelectionBounds } from '../interfaces/canvas';

export class EllipseTool implements DrawingTool {
    id = 'ellipse';
    name = 'Ellipse';
    icon = '⭕';
    cursor = 'crosshair';
    
    public isActive: boolean = false;
    public color = { r: 0, g: 0, b: 0, a: 1 };
    public thickness = 2;
    
    private settings: ToolSettings;
    private startPoint: WASMPoint | null = null;
    private currentPoint: WASMPoint | null = null;
    private _isDrawing: boolean = false;

    constructor(settings: ToolSettings) {
        this.settings = settings;
        this.color = settings.color;
        this.thickness = settings.thickness;
    }

    updateSettings(settings: ToolSettings): void {
        this.settings = settings;
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
        this._isDrawing = true;
    }

    continueDrawing(point: WASMPoint): void {
        this.currentPoint = point;
    }

    finishDrawing(): WASMShape | null {
        if (!this.startPoint || !this.currentPoint) return null;

        // Create a stroke-based ellipse since ellipse shapes aren't implemented in WASM yet
        const centerX = (this.startPoint.x + this.currentPoint.x) / 2;
        const centerY = (this.startPoint.y + this.currentPoint.y) / 2;
        const radiusX = Math.abs(this.currentPoint.x - this.startPoint.x) / 2;
        const radiusY = Math.abs(this.currentPoint.y - this.startPoint.y) / 2;

        // Create ellipse points
        const points: WASMPoint[] = [];
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            points.push({
                x: centerX + radiusX * Math.cos(angle),
                y: centerY + radiusY * Math.sin(angle)
            });
        }

        const shape: WASMStrokeShape = {
            type: 'stroke',
            points: points,
            color: this.color,
            thickness: this.thickness
        };

        this.startPoint = null;
        this.currentPoint = null;
        this._isDrawing = false;
        return shape;
    }

    getSettings(): ToolSettings {
        return { ...this.settings };
    }

    isDrawing(): boolean {
        return this._isDrawing;
    }

    getCurrentBounds(): SelectionBounds | null {
        if (!this.startPoint || !this.currentPoint) return null;
        
        return {
            x1: Math.min(this.startPoint.x, this.currentPoint.x),
            y1: Math.min(this.startPoint.y, this.currentPoint.y),
            x2: Math.max(this.startPoint.x, this.currentPoint.x),
            y2: Math.max(this.startPoint.y, this.currentPoint.y)
        };
    }

    // Helper method to generate ellipse points for preview
    generateEllipsePoints(centerX: number, centerY: number, radiusX: number, radiusY: number, segments: number = 32): WASMPoint[] {
        const points: WASMPoint[] = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI;
            points.push({
                x: centerX + radiusX * Math.cos(angle),
                y: centerY + radiusY * Math.sin(angle)
            });
        }
        return points;
    }
} 