// Debug utilities for the whiteboard app

export interface DebugConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  logWASM: boolean;
  logToolState: boolean;
  logEvents: boolean;
  logPerformance: boolean;
  logToFile: boolean;
  logFilePath: string;
}

// Global debug configuration
export const debugConfig: DebugConfig = {
  enabled: true,
  logLevel: 'info', // Reduced from 'debug' to 'info'
  logWASM: false, // Disabled by default to reduce overhead
  logToolState: true,
  logEvents: false, // Disabled by default to reduce overhead
  logPerformance: false,
  logToFile: true,
  logFilePath: 'debug-session.json'
};

// Debug session interface
export interface DebugSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  operations: DebugOperation[];
  metadata: {
    userAgent: string;
    screenSize: { width: number; height: number };
    wasmLoaded: boolean;
    totalStrokes: number;
    totalOperations: number;
  };
}

export interface DebugOperation {
  id: string;
  timestamp: string;
  type: 'drawing' | 'erasing' | 'add' | 'remove' | 'move' | 'clear' | 'tool_change' | 'wasm_error' | 'performance';
  tool: string;
  data: any;
  strokesBefore: StrokeSnapshot[];
  strokesAfter: StrokeSnapshot[];
  performance?: {
    duration: number;
    memory?: number;
  };
}

export interface StrokeSnapshot {
  id: number;
  points: { x: number; y: number }[];
  color: { r: number; g: number; b: number; a: number };
  thickness: number;
  timestamp: string;
}

// Debug session manager
export class DebugSessionManager {
  private static instance: DebugSessionManager;
  private session: DebugSession;
  private operationCounter: number = 0;

  private constructor() {
    this.session = {
      sessionId: this.generateSessionId(),
      startTime: new Date().toISOString(),
      operations: [],
      metadata: {
        userAgent: navigator.userAgent,
        screenSize: { width: window.screen.width, height: window.screen.height },
        wasmLoaded: false,
        totalStrokes: 0,
        totalOperations: 0
      }
    };
    
    // Save session on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });
  }

  static getInstance(): DebugSessionManager {
    if (!DebugSessionManager.instance) {
      DebugSessionManager.instance = new DebugSessionManager();
    }
    return DebugSessionManager.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveToFile(): Promise<void> {
    if (!debugConfig.logToFile) return;

    try {
      const sessionData = JSON.stringify(this.session, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `debug-session-${timestamp}.json`;
      
      // Try to save to the project directory using fetch to a local endpoint
      const response = await fetch('/api/debug/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data: sessionData,
          sessionId: this.session.sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save debug file: ${response.statusText}`);
      }

      console.log(`Debug session saved: ${filename}`);
    } catch (error) {
      console.error('Failed to save debug session:', error);
      
      // Fallback: try to use File System Access API if available
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `debug-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] },
            }],
          });
          
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(this.session, null, 2));
          await writable.close();
          
          console.log('Debug session saved using File System Access API');
        } else {
          // Final fallback: download prompt
          const blob = new Blob([JSON.stringify(this.session, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `debug-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (fallbackError) {
        console.error('All save methods failed:', fallbackError);
      }
    }
  }

  async logOperation(
    type: DebugOperation['type'],
    tool: string,
    data: any,
    strokesBefore: any[],
    strokesAfter: any[],
    performance?: { duration: number; memory?: number }
  ): Promise<void> {
    const operation: DebugOperation = {
      id: `op_${++this.operationCounter}`,
      timestamp: new Date().toISOString(),
      type,
      tool,
      data,
      strokesBefore: this.snapshotStrokes(strokesBefore),
      strokesAfter: this.snapshotStrokes(strokesAfter),
      performance
    };

    this.session.operations.push(operation);
    this.session.metadata.totalOperations = this.session.operations.length;
    this.session.metadata.totalStrokes = strokesAfter.length;

    // Limit operations in memory to prevent memory leaks
    if (this.session.operations.length > 1000) {
      // Keep only the last 500 operations in memory
      this.session.operations = this.session.operations.slice(-500);
    }

    // Save to file after each operation
    await this.saveToFile();
  }

  private snapshotStrokes(strokes: any[]): StrokeSnapshot[] {
    return strokes.map((stroke, index) => ({
      id: index,
      points: stroke.points || [],
      color: stroke.color || { r: 0, g: 0, b: 0, a: 1 },
      thickness: stroke.thickness || 1,
      timestamp: new Date().toISOString()
    }));
  }

  setWASMLoaded(loaded: boolean): void {
    this.session.metadata.wasmLoaded = loaded;
  }

  endSession(): void {
    this.session.endTime = new Date().toISOString();
    this.saveToFile();
  }

  getSession(): DebugSession {
    return this.session;
  }

  clearSession(): void {
    this.session.operations = [];
    this.operationCounter = 0;
    this.session.metadata.totalOperations = 0;
    this.session.metadata.totalStrokes = 0;
  }
}

// Debug logger with levels
export class DebugLogger {
  private static instance: DebugLogger;
  private config: DebugConfig;
  private sessionManager: DebugSessionManager;

  private constructor(config: DebugConfig) {
    this.config = config;
    this.sessionManager = DebugSessionManager.getInstance();
  }

  static getInstance(config?: DebugConfig): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger(config || debugConfig);
    }
    return DebugLogger.instance;
  }

  private shouldLog(level: string): boolean {
    if (!this.config.enabled) return false;
    
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = levels[this.config.logLevel as keyof typeof levels] || 0;
    const messageLevel = levels[level as keyof typeof levels] || 0;
    
    return messageLevel <= currentLevel;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`🔴 [ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`🟡 [WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`🔵 [INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`🟢 [DEBUG] ${message}`, ...args);
    }
  }

  // Specialized debug methods
  wasm(message: string, ...args: any[]): void {
    if (this.config.logWASM && this.shouldLog('debug')) {
      console.log(`⚡ [WASM] ${message}`, ...args);
    }
  }

  tool(message: string, ...args: any[]): void {
    if (this.config.logToolState && this.shouldLog('debug')) {
      console.log(`🔧 [TOOL] ${message}`, ...args);
    }
  }

  event(message: string, ...args: any[]): void {
    if (this.config.logEvents && this.shouldLog('debug')) {
      console.log(`📡 [EVENT] ${message}`, ...args);
    }
  }

  perf(message: string, ...args: any[]): void {
    if (this.config.logPerformance && this.shouldLog('debug')) {
      console.log(`⏱️ [PERF] ${message}`, ...args);
    }
  }

  // Throttling for high-frequency operations
  private lastLogTime: { [key: string]: number } = {};
  private readonly LOG_THROTTLE_MS = 100; // Minimum 100ms between logs of same type

  private shouldThrottle(operationType: string): boolean {
    const now = Date.now();
    const lastTime = this.lastLogTime[operationType] || 0;
    if (now - lastTime < this.LOG_THROTTLE_MS) {
      return true;
    }
    this.lastLogTime[operationType] = now;
    return false;
  }

  // Operation logging methods
  async logDrawing(tool: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    // Throttle high-frequency drawing operations
    if (this.shouldThrottle('drawing')) {
      return;
    }
    
    await this.sessionManager.logOperation('drawing', tool, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Drawing operation logged: ${tool}`, data);
  }

  async logErasing(tool: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    // Throttle high-frequency erasing operations
    if (this.shouldThrottle('erasing')) {
      return;
    }
    
    await this.sessionManager.logOperation('erasing', tool, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Erasing operation logged: ${tool}`, data);
  }

  async logAddShape(shapeType: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    await this.sessionManager.logOperation('add', shapeType, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Add shape operation logged: ${shapeType}`, data);
  }

  async logRemove(tool: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    await this.sessionManager.logOperation('remove', tool, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Remove operation logged: ${tool}`, data);
  }

  async logMove(tool: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    await this.sessionManager.logOperation('move', tool, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Move operation logged: ${tool}`, data);
  }

  async logClear(tool: string, data: any, strokesBefore: any[], strokesAfter: any[], duration?: number): Promise<void> {
    await this.sessionManager.logOperation('clear', tool, data, strokesBefore, strokesAfter, duration ? { duration } : undefined);
    this.tool(`Clear operation logged: ${tool}`, data);
  }

  async logToolChange(oldTool: string, newTool: string): Promise<void> {
    await this.sessionManager.logOperation('tool_change', newTool, { oldTool, newTool }, [], []);
    this.tool(`Tool change logged: ${oldTool} → ${newTool}`);
  }

  async logWASMError(error: any, context: string): Promise<void> {
    await this.sessionManager.logOperation('wasm_error', 'wasm', { error: error.message, context }, [], []);
    this.error(`WASM error logged: ${context}`, error);
  }

  setWASMLoaded(loaded: boolean): void {
    this.sessionManager.setWASMLoaded(loaded);
  }

  getSession(): DebugSession {
    return this.sessionManager.getSession();
  }

  clearSession(): void {
    this.sessionManager.clearSession();
  }
}

// Performance measurement utilities
export class PerformanceTracker {
  private static timers: Map<string, number> = new Map();

  static start(label: string): void {
    this.timers.set(label, performance.now());
  }

  static end(label: string): number {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      console.warn(`Performance timer '${label}' was not started`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    
    const logger = DebugLogger.getInstance();
    logger.perf(`${label}: ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    const result = await fn();
    this.end(label);
    return result;
  }
}

// WASM debugging utilities
export class WASMDebugger {
  private static logger = DebugLogger.getInstance();

  static logWASMLoad(module: any): void {
    this.logger.wasm('WASM module loaded:', {
      hasDrawingEngine: !!module.DrawingEngine,
      hasStrokeShape: !!module.StrokeShape,
      hasPointVector: !!module.PointVector,
      methods: Object.getOwnPropertyNames(module).filter(name => 
        typeof module[name] === 'function'
      )
    });
    this.logger.setWASMLoaded(true);
  }

  static logEngineState(engine: any): void {
    if (!engine) {
      this.logger.wasm('Engine is null or undefined');
      return;
    }

    try {
      const strokes = engine.getStrokes();
      this.logger.wasm('Engine state:', {
        strokeCount: strokes.length,
        strokes: strokes.map((stroke: any, index: number) => ({
          index,
          pointCount: stroke.points?.length || 0,
          color: stroke.color,
          thickness: stroke.thickness
        }))
      });
    } catch (error) {
      this.logger.wasm('Error getting engine state:', error);
    }
  }

  static logStrokeOperation(operation: string, stroke: any, index?: number): void {
    this.logger.wasm(`${operation}:`, {
      index,
      pointCount: stroke.points?.length || 0,
      color: stroke.color,
      thickness: stroke.thickness
    });
  }
}

// Tool state debugging
export class ToolDebugger {
  private static logger = DebugLogger.getInstance();

  static logToolChange(oldTool: string, newTool: string): void {
    this.logger.tool(`Tool changed: ${oldTool} → ${newTool}`);
    this.logger.logToolChange(oldTool, newTool);
  }

  static logToolAction(toolId: string, action: string, data?: any): void {
    this.logger.tool(`${toolId} ${action}:`, data);
  }

  static logPointerEvent(toolId: string, event: string, coords: { x: number; y: number }): void {
    this.logger.event(`${toolId} ${event}:`, coords);
  }
}

// Event debugging
export class EventDebugger {
  private static logger = DebugLogger.getInstance();

  static logCanvasEvent(event: string, data?: any): void {
    this.logger.event(`Canvas ${event}:`, data);
  }

  static logMouseEvent(event: string, coords: { x: number; y: number }, buttons?: number): void {
    this.logger.event(`Mouse ${event}:`, { coords, buttons });
  }
}

// Debug breakpoint helper
export function debugBreak(message?: string): void {
  if (debugConfig.enabled) {
    if (message) {
      console.log(`🔴 BREAKPOINT: ${message}`);
    }
    debugger; // This will pause execution in debugger
  }
}

// Conditional debug breakpoint
export function debugBreakIf(condition: boolean, message?: string): void {
  if (condition) {
    debugBreak(message);
  }
}

// Debug state inspector
export function inspectState(state: any, label: string = 'State'): void {
  const logger = DebugLogger.getInstance();
  logger.debug(`${label}:`, JSON.stringify(state, null, 2));
}

// Export default logger instance
export const logger = DebugLogger.getInstance();

// Debug configuration setter
export function setDebugConfig(config: Partial<DebugConfig>): void {
  Object.assign(debugConfig, config);
  logger.info('Debug configuration updated:', debugConfig);
}

// Enable/disable debug features
export function enableDebug(features?: (keyof DebugConfig)[]): void {
  if (features) {
    features.forEach(feature => {
      if (feature in debugConfig) {
        (debugConfig as any)[feature] = true;
      }
    });
  } else {
    debugConfig.enabled = true;
  }
  logger.info('Debug features enabled:', features || 'all');
}

export function disableDebug(features?: (keyof DebugConfig)[]): void {
  if (features) {
    features.forEach(feature => {
      if (feature in debugConfig) {
        (debugConfig as any)[feature] = false;
      }
    });
  } else {
    debugConfig.enabled = false;
  }
  logger.info('Debug features disabled:', features || 'all');
}

// Session management functions
export function getDebugSession(): DebugSession {
  return logger.getSession();
}

export function clearDebugSession(): void {
  logger.clearSession();
}

export function downloadDebugSession(): void {
  const session = getDebugSession();
  const blob = new Blob([JSON.stringify(session, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `debug-session-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
} 