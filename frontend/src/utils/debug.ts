// Debug utilities for the whiteboard application

// Simple logger implementation
export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', ...args);
    }
  },
  
  info: (...args: unknown[]) => {
    console.log('[INFO]', ...args);
  },
  
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  
  logDrawing: async (tool: string, data: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DRAWING]', tool, data);
    }
  },
  
  logErasing: async (tool: string, data: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ERASING]', tool, data);
    }
  },
  
  setWASMLoaded: (loaded: boolean) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[WASM_STATUS]', loaded ? 'Loaded' : 'Not loaded');
    }
  }
};

// Tool debugger for tracking tool changes
export class ToolDebugger {
  private static toolHistory: Array<{ from: string; to: string; timestamp: number }> = [];
  
  static logToolChange(fromTool: string, toTool: string) {
    if (process.env.NODE_ENV === 'development') {
      this.toolHistory.push({
        from: fromTool,
        to: toTool,
        timestamp: Date.now()
      });
      
      // Keep only last 50 tool changes
      if (this.toolHistory.length > 50) {
        this.toolHistory = this.toolHistory.slice(-50);
      }
      
      console.log('[TOOL_CHANGE]', `${fromTool} → ${toTool}`);
    }
  }
  
  static logPointerEvent(toolId: string, event: string, coords: { x: number; y: number }) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[TOOL_POINTER]', `${toolId} ${event}:`, coords);
    }
  }
  
  static logToolAction(toolId: string, action: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[TOOL_ACTION]', `${toolId} ${action}:`, data);
    }
  }
  
  static getToolHistory() {
    return [...this.toolHistory];
  }
  
  static clearHistory() {
    this.toolHistory = [];
  }
}

// Event debugging utilities
export class EventDebugger {
  static logCanvasEvent(event: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[CANVAS_EVENT]', event, data);
    }
  }
  
  static logMouseEvent(event: string, coords: { x: number; y: number }, buttons?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MOUSE_EVENT]', event, { coords, buttons });
    }
  }
  
  static logPointerEvent(event: string, coords: { x: number; y: number }, buttons?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[POINTER_EVENT]', event, { coords, buttons });
    }
  }
}
interface WASMModule {
  DrawingEngine: unknown;
  engine: unknown;
  isReady: () => boolean;
  [key: string]: unknown;
}
interface WASMEngine {
  getStrokes: () => WASMStroke[];
  [key: string]: unknown;
}
interface WASMStroke {
  points: unknown[];
  color: unknown;
  thickness: number;
  isEraser: boolean;
}

// WASM debugging utilities
export class WASMDebugger {
  static logWASMLoad(module: WASMModule) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[WASM_LOAD] Module loaded:', {
        hasDrawingEngine: !!module.DrawingEngine,
        hasEngine: !!module.engine,
        isReady: module.isReady ? module.isReady() : 'method not available',
        methods: Object.getOwnPropertyNames(module).filter(name => 
          typeof module[name] === 'function'
        )
      });
    }
  }
  
  static logEngineState(engine: WASMEngine) {
    if (process.env.NODE_ENV === 'development') {
      if (!engine) {
        console.log('[WASM_STATE] Engine is null or undefined');
        return;
      }

      try {
        const strokes = engine.getStrokes ? engine.getStrokes() : [];
        console.log('[WASM_STATE] Engine state:', {
          strokeCount: strokes.length,
          strokes: strokes.map((stroke: WASMStroke, index: number) => ({
            index,
            pointCount: stroke.points?.length || 0,
            color: stroke.color,
            thickness: stroke.thickness
          }))
        });
      } catch (error) {
        console.log('[WASM_STATE] Error getting engine state:', error);
      }
    }
  }
  
  static logStrokeOperation(operation: string, stroke: WASMStroke, index?: number) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[WASM_${operation.toUpperCase()}]`, {
        index,
        pointCount: stroke.points?.length || 0,
        color: stroke.color,
        thickness: stroke.thickness
      });
    }
  }
}

// Performance tracker for measuring operation times    
export class PerformanceTracker {
  private static measurements: Map<string, { start: number; end?: number }> = new Map();
  
  static start(operation: string) {
    if (process.env.NODE_ENV === 'development') {
      this.measurements.set(operation, { start: performance.now() });
    }
  }
  
  static end(operation: string) {
    if (process.env.NODE_ENV === 'development') {
      const measurement = this.measurements.get(operation);
      if (measurement) {
        measurement.end = performance.now();
        const duration = measurement.end - measurement.start;
        console.log(`[PERF] ${operation}: ${duration.toFixed(2)}ms`);
        this.measurements.delete(operation);
      }
    }
  }
  
  static getMeasurement(operation: string) {
    const measurement = this.measurements.get(operation);
    if (measurement && measurement.end) {
      return measurement.end - measurement.start;
    }
    return null;
  }
  
  static clearMeasurements() {
    this.measurements.clear();
  }
}

// Debug session manager
export class DebugSession {
  private static sessionId: string = '';
  private static isActive: boolean = false;
  
  static start() {
    if (process.env.NODE_ENV === 'development') {
      this.sessionId = `debug_${Date.now()}`;
      this.isActive = true;
      console.log('[DEBUG_SESSION] Started:', this.sessionId);
    }
  }
  
  static end() {
    if (process.env.NODE_ENV === 'development') {
      this.isActive = false;
      console.log('[DEBUG_SESSION] Ended:', this.sessionId);
    }
  }
  
  static getSessionId() {
    return this.sessionId;
  }
  
  static isSessionActive() {
    return this.isActive;
  }
  
  static log(message: string, data?: unknown) {
    if (process.env.NODE_ENV === 'development' && this.isActive) {
      console.log(`[DEBUG_SESSION:${this.sessionId}]`, message, data);
    }
  }
}

// Initialize debug session in development
if (process.env.NODE_ENV === 'development') {
  DebugSession.start();
} 