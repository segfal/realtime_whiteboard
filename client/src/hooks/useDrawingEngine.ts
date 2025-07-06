import { useEffect, useRef, useState, useCallback } from 'react';
// import { createDrawingEngineModule, DrawingEngineModule } from '../types/drawing-engine';
import type { DrawingEngineModule } from '../types/drawing-engine';

/**
 * Load the drawing engine script dynamically
 */
function loadDrawingEngineScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.createDrawingEngineModule) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = '/drawing_engine.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load drawing_engine.js'));
    document.body.appendChild(script);
  });
}

/**
 * Simple mock drawing engine for native Mac development
 *
 * This allows you to test the React UI without the WASM module.
 * All methods just log actions to the console.
 */
class NativeDrawingEngineMock {
  private eraseMode: 'normal' | 'erase' | 'soft_erase' = 'normal';
  private eraseRadius: number = 10;
  private eraseOpacity: number = 0.5;
  private currentLayer: number = 0;
  private layers: any[] = [{ visible: true, opacity: 1.0 }];

  initialize(width: number, height: number) {
    console.log(`[NativeDrawingEngineMock] initialize(${width}, ${height})`);
    return true;
  }
  
  drawLine(x1: number, y1: number, x2: number, y2: number) {
    if (this.eraseMode === 'normal') {
      console.log(`[NativeDrawingEngineMock] drawLine(${x1}, ${y1}, ${x2}, ${y2})`);
    } else {
      console.log(`[NativeDrawingEngineMock] eraseLine(${x1}, ${y1}, ${x2}, ${y2}) - mode: ${this.eraseMode}`);
    }
  }
  
  drawRectangle(x: number, y: number, width: number, height: number) {
    console.log(`[NativeDrawingEngineMock] drawRectangle(${x}, ${y}, ${width}, ${height})`);
  }
  
  drawCircle(centerX: number, centerY: number, radius: number) {
    console.log(`[NativeDrawingEngineMock] drawCircle(${centerX}, ${centerY}, ${radius})`);
  }
  
  clear(r: number, g: number, b: number, a: number) {
    console.log(`[NativeDrawingEngineMock] clear(${r}, ${g}, ${b}, ${a})`);
  }

  // Erase functionality
  setEraseMode(mode: 'normal' | 'erase' | 'soft_erase') {
    this.eraseMode = mode;
    console.log(`[NativeDrawingEngineMock] setEraseMode(${mode})`);
  }

  getEraseMode() {
    return this.eraseMode;
  }

  setEraseRadius(radius: number) {
    this.eraseRadius = radius;
    console.log(`[NativeDrawingEngineMock] setEraseRadius(${radius})`);
  }

  getEraseRadius() {
    return this.eraseRadius;
  }

  setEraseOpacity(opacity: number) {
    this.eraseOpacity = Math.max(0, Math.min(1, opacity));
    console.log(`[NativeDrawingEngineMock] setEraseOpacity(${this.eraseOpacity})`);
  }

  getEraseOpacity() {
    return this.eraseOpacity;
  }

  eraseAt(x: number, y: number) {
    console.log(`[NativeDrawingEngineMock] eraseAt(${x}, ${y}) - radius: ${this.eraseRadius}, mode: ${this.eraseMode}`);
  }

  // Layer management
  addLayer() {
    this.layers.push({ visible: true, opacity: 1.0 });
    this.currentLayer = this.layers.length - 1;
    console.log(`[NativeDrawingEngineMock] addLayer() - total layers: ${this.layers.length}`);
  }

  removeLayer() {
    if (this.layers.length > 1) {
      this.layers.splice(this.currentLayer, 1);
      this.currentLayer = Math.max(0, this.currentLayer - 1);
      console.log(`[NativeDrawingEngineMock] removeLayer() - current layer: ${this.currentLayer}`);
    } else {
      console.log(`[NativeDrawingEngineMock] removeLayer() - cannot remove last layer`);
    }
  }

  setCurrentLayer(layerIndex: number) {
    if (layerIndex >= 0 && layerIndex < this.layers.length) {
      this.currentLayer = layerIndex;
      console.log(`[NativeDrawingEngineMock] setCurrentLayer(${layerIndex})`);
    }
  }

  getCurrentLayer() {
    return this.currentLayer;
  }

  getLayerCount() {
    return this.layers.length;
  }

  clearAllLayers() {
    this.layers = [{ visible: true, opacity: 1.0 }];
    this.currentLayer = 0;
    console.log(`[NativeDrawingEngineMock] clearAllLayers()`);
  }
}

/**
 * Detect if we are running in a browser with WASM support
 */
function isWasmAvailable() {
  // This checks if the WASM loader function is present
  return typeof window !== 'undefined' && typeof window.createDrawingEngineModule === 'function';
}

/**
 * Custom hook for managing the WebAssembly drawing engine
 * 
 * This hook provides a clean interface for React components to interact
 * with the C++ drawing engine through WebAssembly.
 */
export const useDrawingEngine = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Erase state
  const [eraseMode, setEraseMode] = useState<'normal' | 'erase' | 'soft_erase'>('normal');
  const [eraseRadius, setEraseRadius] = useState(10);
  const [eraseOpacity, setEraseOpacity] = useState(0.5);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [layerCount, setLayerCount] = useState(1);

  const moduleRef = useRef<any>(null);
  const engineRef = useRef<any>(null);

  /**
   * Initialize the drawing engine (WASM or native mock)
   */
  const initializeModule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Try to load WASM if available
      let useWasm = false;
      try {
        await loadDrawingEngineScript();
        useWasm = isWasmAvailable();
      } catch {
        useWasm = false;
      }

      if (useWasm) {
        // Use the WASM module (browser)
        const createDrawingEngineModule = window.createDrawingEngineModule;
        const module = await createDrawingEngineModule();
        moduleRef.current = module;
        engineRef.current = new module.DrawingEngine();
        setIsLoaded(true);
      } else {
        // Use the native mock (Mac/local dev)
        engineRef.current = new NativeDrawingEngineMock();
        setIsLoaded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drawing engine');
      console.error('Failed to initialize drawing engine:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set the drawing color from hex string
   */
  const setColor = useCallback((hexColor: string) => {
    if (!engineRef.current) return;
    
    try {
      const rgba = engineRef.current.hexToRgba(hexColor);
      engineRef.current.setColor(rgba[0], rgba[1], rgba[2], rgba[3]);
    } catch (err) {
      console.error('Failed to set color:', err);
    }
  }, []);

  /**
   * Set the line width
   */
  const setLineWidth = useCallback((width: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.setLineWidth(width);
    } catch (err) {
      console.error('Failed to set line width:', err);
    }
  }, []);

  /**
   * Draw a line segment
   */
  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.drawLine(x1, y1, x2, y2);
    } catch (err) {
      console.error('Failed to draw line:', err);
    }
  }, []);

  /**
   * Draw a rectangle
   */
  const drawRectangle = useCallback((x: number, y: number, width: number, height: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.drawRectangle(x, y, width, height);
    } catch (err) {
      console.error('Failed to draw rectangle:', err);
    }
  }, []);

  /**
   * Draw a circle
   */
  const drawCircle = useCallback((centerX: number, centerY: number, radius: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.drawCircle(centerX, centerY, radius);
    } catch (err) {
      console.error('Failed to draw circle:', err);
    }
  }, []);

  /**
   * Draw an ellipse
   */
  const drawEllipse = useCallback((centerX: number, centerY: number, radiusX: number, radiusY: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.drawEllipse(centerX, centerY, radiusX, radiusY);
    } catch (err) {
      console.error('Failed to draw ellipse:', err);
    }
  }, []);

  /**
   * Start a new path
   */
  const beginPath = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.beginPath();
    } catch (err) {
      console.error('Failed to begin path:', err);
    }
  }, []);

  /**
   * Move to a point without drawing
   */
  const moveTo = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.moveTo(x, y);
    } catch (err) {
      console.error('Failed to move to:', err);
    }
  }, []);

  /**
   * Draw a line to a point
   */
  const lineTo = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.lineTo(x, y);
    } catch (err) {
      console.error('Failed to line to:', err);
    }
  }, []);

  /**
   * Stroke the current path
   */
  const stroke = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.stroke();
    } catch (err) {
      console.error('Failed to stroke:', err);
    }
  }, []);

  /**
   * Fill the current path
   */
  const fill = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.fill();
    } catch (err) {
      console.error('Failed to fill:', err);
    }
  }, []);

  /**
   * Clear the canvas
   */
  const clear = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.clear();
    } catch (err) {
      console.error('Failed to clear:', err);
    }
  }, []);

  /**
   * Get the drawing buffer
   */
  const getDrawingBuffer = useCallback(() => {
    if (!engineRef.current) return [];
    
    try {
      return engineRef.current.getDrawingBuffer();
    } catch (err) {
      console.error('Failed to get drawing buffer:', err);
      return [];
    }
  }, []);

  /**
   * Get the stroke buffer
   */
  const getStrokeBuffer = useCallback(() => {
    if (!engineRef.current) return [];
    
    try {
      return engineRef.current.getStrokeBuffer();
    } catch (err) {
      console.error('Failed to get stroke buffer:', err);
      return [];
    }
  }, []);

  /**
   * Clear the stroke buffer
   */
  const clearStrokeBuffer = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.clearStrokeBuffer();
    } catch (err) {
      console.error('Failed to clear stroke buffer:', err);
    }
  }, []);

  /**
   * Undo the last command
   */
  const undo = useCallback(() => {
    if (!engineRef.current) return false;
    
    try {
      return engineRef.current.undo();
    } catch (err) {
      console.error('Failed to undo:', err);
      return false;
    }
  }, []);

  /**
   * Redo the last undone command
   */
  const redo = useCallback(() => {
    if (!engineRef.current) return false;
    
    try {
      return engineRef.current.redo();
    } catch (err) {
      console.error('Failed to redo:', err);
      return false;
    }
  }, []);

  /**
   * Get the current drawing style
   */
  const getCurrentStyle = useCallback(() => {
    if (!engineRef.current) return null;
    
    try {
      return engineRef.current.getCurrentStyle();
    } catch (err) {
      console.error('Failed to get current style:', err);
      return null;
    }
  }, []);

  /**
   * Set the erase mode
   * @param mode The erase mode: 'normal', 'erase', or 'soft_erase'
   */
  const setEraseModeHandler = useCallback((mode: 'normal' | 'erase' | 'soft_erase') => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.setEraseMode(mode);
      setEraseMode(mode);
    } catch (err) {
      console.error('Failed to set erase mode:', err);
    }
  }, []);

  /**
   * Set the erase radius
   * @param radius Radius in pixels
   */
  const setEraseRadiusHandler = useCallback((radius: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.setEraseRadius(radius);
      setEraseRadius(radius);
    } catch (err) {
      console.error('Failed to set erase radius:', err);
    }
  }, []);

  /**
   * Set the erase opacity (for soft erase)
   * @param opacity Opacity value (0.0 to 1.0)
   */
  const setEraseOpacityHandler = useCallback((opacity: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.setEraseOpacity(opacity);
      setEraseOpacity(opacity);
    } catch (err) {
      console.error('Failed to set erase opacity:', err);
    }
  }, []);

  /**
   * Erase at a specific point
   * @param x X coordinate
   * @param y Y coordinate
   */
  const eraseAt = useCallback((x: number, y: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.eraseAt(x, y);
    } catch (err) {
      console.error('Failed to erase at point:', err);
    }
  }, []);

  /**
   * Erase along a line
   * @param x1 Start X coordinate
   * @param y1 Start Y coordinate
   * @param x2 End X coordinate
   * @param y2 End Y coordinate
   */
  const eraseLine = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.eraseLine(x1, y1, x2, y2);
    } catch (err) {
      console.error('Failed to erase line:', err);
    }
  }, []);

  /**
   * Add a new layer
   */
  const addLayer = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.addLayer();
      setLayerCount(engineRef.current.getLayerCount());
      setCurrentLayer(engineRef.current.getCurrentLayer());
    } catch (err) {
      console.error('Failed to add layer:', err);
    }
  }, []);

  /**
   * Remove the current layer
   */
  const removeLayer = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.removeLayer();
      setLayerCount(engineRef.current.getLayerCount());
      setCurrentLayer(engineRef.current.getCurrentLayer());
    } catch (err) {
      console.error('Failed to remove layer:', err);
    }
  }, []);

  /**
   * Set the current layer
   * @param layerIndex Layer index
   */
  const setCurrentLayerHandler = useCallback((layerIndex: number) => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.setCurrentLayer(layerIndex);
      setCurrentLayer(layerIndex);
    } catch (err) {
      console.error('Failed to set current layer:', err);
    }
  }, []);

  /**
   * Clear all layers
   */
  const clearAllLayers = useCallback(() => {
    if (!engineRef.current) return;
    
    try {
      engineRef.current.clearAllLayers();
      setLayerCount(engineRef.current.getLayerCount());
      setCurrentLayer(engineRef.current.getCurrentLayer());
    } catch (err) {
      console.error('Failed to clear all layers:', err);
    }
  }, []);

  // Initialize the module on mount
  useEffect(() => {
    initializeModule();
  }, [initializeModule]);

  return {
    // State
    isLoaded,
    isLoading,
    error,
    
    // Engine instance
    engine: engineRef.current,
    module: moduleRef.current,
    
    // Style management
    setColor,
    setLineWidth,
    
    // Drawing primitives
    drawLine,
    drawRectangle,
    drawCircle,
    drawEllipse,
    
    // Path management
    beginPath,
    moveTo,
    lineTo,
    stroke,
    fill,
    
    // Canvas management
    clear,
    getDrawingBuffer,
    getStrokeBuffer,
    clearStrokeBuffer,
    
    // Undo/Redo
    undo,
    redo,
    
    // Utility
    getCurrentStyle,
    
    // Erase functionality
    eraseMode,
    eraseRadius,
    eraseOpacity,
    currentLayer,
    layerCount,
    
    // Erase methods
    setEraseMode: setEraseModeHandler,
    setEraseRadius: setEraseRadiusHandler,
    setEraseOpacity: setEraseOpacityHandler,
    eraseAt,
    eraseLine,
    
    // Layer management
    addLayer,
    removeLayer,
    setCurrentLayer: setCurrentLayerHandler,
    clearAllLayers,
    
    // Reinitialize
    reinitialize: initializeModule
  };
}; 