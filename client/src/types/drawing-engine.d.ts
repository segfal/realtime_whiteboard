/**
 * TypeScript definitions for the WebAssembly Drawing Engine
 * 
 * This file provides type safety when calling C++ functions from JavaScript
 * through the Emscripten bindings.
 */

declare namespace DrawingEngineModule {
  /**
   * Drawing primitive types supported by the engine
   */
  enum PrimitiveType {
    LINE = 0,
    RECTANGLE = 1,
    CIRCLE = 2,
    ELLIPSE = 3,
    PATH = 4
  }

  /**
   * Drawing style configuration
   */
  interface DrawingStyle {
    color: [number, number, number, number]; // RGBA
    lineWidth: number;
    fill: boolean;
    lineCap: string;
    lineJoin: string;
  }

  /**
   * Point structure for 2D coordinates
   */
  interface Point2D {
    x: number;
    y: number;
  }

  /**
   * Main DrawingEngine class exposed through WebAssembly
   */
  class DrawingEngine {
    constructor();

    // Style management
    setColor(r: number, g: number, b: number, a: number): void;
    setLineWidth(width: number): void;
    setFill(fill: boolean): void;
    setLineCap(cap: string): void;
    setLineJoin(join: string): void;

    // Drawing primitives
    drawLine(x1: number, y1: number, x2: number, y2: number): void;
    drawRectangle(x: number, y: number, width: number, height: number): void;
    drawCircle(centerX: number, centerY: number, radius: number): void;
    drawEllipse(centerX: number, centerY: number, radiusX: number, radiusY: number): void;

    // Path management
    beginPath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(controlX: number, controlY: number, endX: number, endY: number): void;
    bezierCurveTo(control1X: number, control1Y: number, control2X: number, control2Y: number, endX: number, endY: number): void;
    closePath(): void;
    stroke(): void;
    fill(): void;

    // Canvas management
    clear(): void;
    getDrawingBuffer(): number[];
    getStrokeBuffer(): number[];
    clearStrokeBuffer(): void;

    // Undo/Redo
    saveState(): void;
    undo(): boolean;
    redo(): boolean;

    // Utility functions
    hexToRgba(hexColor: string): number[];
    getCurrentStyle(): DrawingStyle;
  }

  /**
   * Emscripten module instance
   */
  interface DrawingEngineInstance {
    DrawingEngine: typeof DrawingEngine;
    HEAPU8: Uint8Array;
    HEAPU32: Uint32Array;
    HEAPF32: Float32Array;
    _malloc: (size: number) => number;
    _free: (ptr: number) => void;
  }
}

/**
 * Global function to create the DrawingEngine module
 * This is exposed by Emscripten's MODULARIZE option
 */
declare function createDrawingEngineModule(): Promise<DrawingEngineModule.DrawingEngineInstance>;

declare global {
  interface Window {
    createDrawingEngineModule: typeof createDrawingEngineModule;
  }
}

export { DrawingEngineModule, createDrawingEngineModule }; 