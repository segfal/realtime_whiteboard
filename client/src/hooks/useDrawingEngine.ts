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
 * Custom hook for managing the WebAssembly drawing engine
 * 
 * This hook provides a clean interface for React components to interact
 * with the C++ drawing engine through WebAssembly.
 */
export const useDrawingEngine = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const moduleRef = useRef<DrawingEngineModule.DrawingEngineInstance | null>(null);
  const engineRef = useRef<DrawingEngineModule.DrawingEngine | null>(null);

  /**
   * Initialize the WebAssembly module
   */
  const initializeModule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load the WASM loader script
      await loadDrawingEngineScript();

      // Use the global function exposed by the script
      const createDrawingEngineModule = window.createDrawingEngineModule;
      const module = await createDrawingEngineModule();
      moduleRef.current = module;
      
      // Create a new drawing engine instance
      engineRef.current = new module.DrawingEngine();
      
      setIsLoaded(true);
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
    
    // Reinitialize
    reinitialize: initializeModule
  };
}; 