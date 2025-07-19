import type { DrawingTool, ToolSettings } from '../types/tool';
import type { WASMShape, WASMRectangleShape, WASMPoint } from '../types/wasm';
import type { SelectionBounds } from '../interfaces/canvas';

export class RectangleTool implements DrawingTool {
    id = 'rectangle';
    name = 'Rectangle';
    icon = '⬜';
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

        const shape: WASMRectangleShape = {
            type: 'rectangle',
            topLeft: {
                x: Math.min(this.startPoint.x, this.currentPoint.x),
                y: Math.min(this.startPoint.y, this.currentPoint.y)
            },
            bottomRight: {
                x: Math.max(this.startPoint.x, this.currentPoint.x),
                y: Math.max(this.startPoint.y, this.currentPoint.y)
            },
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
} 