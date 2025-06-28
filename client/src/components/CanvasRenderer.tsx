import React, { useRef, useEffect, useCallback } from 'react';
import { useDrawingEngine } from '../hooks/useDrawingEngine';

/**
 * Props for the CanvasRenderer component
 */
interface CanvasRendererProps {
  width: number;
  height: number;
  color: string;
  lineWidth: number;
  onDrawingStart?: () => void;
  onDrawingEnd?: () => void;
}

/**
 * Canvas renderer component that uses the WebAssembly drawing engine
 * 
 * This component renders drawing commands from the C++ engine onto
 * an HTML canvas element, providing real-time drawing capabilities.
 */
export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  width,
  height,
  color,
  lineWidth,
  onDrawingStart,
  onDrawingEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  const {
    isLoaded,
    isLoading,
    error,
    setColor,
    setLineWidth,
    drawLine,
    getDrawingBuffer,
    getStrokeBuffer,
    clearStrokeBuffer,
    undo,
    redo
  } = useDrawingEngine();

  /**
   * Initialize the canvas context
   */
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;
    
    // Set initial canvas properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
  }, [color, lineWidth, width, height]);

  /**
   * Render drawing commands from the WebAssembly engine
   */
  const renderDrawingBuffer = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !isLoaded) return;

    const buffer = getDrawingBuffer();
    let index = 0;

    while (index < buffer.length) {
      // Read command type
      const commandType = Math.floor(buffer[index++]);
      
      // Read style information
      const r = buffer[index++];
      const g = buffer[index++];
      const b = buffer[index++];
      const a = buffer[index++];
      const width = buffer[index++];
      const fill = buffer[index++] > 0.5;
      
      // Read point count
      const pointCount = Math.floor(buffer[index++]);
      
      // Apply style
      ctx.strokeStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
      ctx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`;
      ctx.lineWidth = width;
      
      if (pointCount > 0) {
        // Read points
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < pointCount; i++) {
          points.push({
            x: buffer[index++],
            y: buffer[index++]
          });
        }
        
        // Render based on command type
        switch (commandType) {
          case 0: // LINE
            if (points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(points[0].x, points[0].y);
              ctx.lineTo(points[1].x, points[1].y);
              ctx.stroke();
            }
            break;
            
          case 1: // RECTANGLE
            if (points.length >= 4) {
              const x = points[0].x;
              const y = points[0].y;
              const w = points[1].x - x;
              const h = points[2].y - y;
              
              ctx.beginPath();
              ctx.rect(x, y, w, h);
              if (fill) {
                ctx.fill();
              } else {
                ctx.stroke();
              }
            }
            break;
            
          case 2: // CIRCLE
          case 3: // ELLIPSE
            if (points.length >= 2) {
              const center = points[0];
              const radius = Math.sqrt(
                Math.pow(points[1].x - center.x, 2) + 
                Math.pow(points[1].y - center.y, 2)
              );
              
              ctx.beginPath();
              ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
              if (fill) {
                ctx.fill();
              } else {
                ctx.stroke();
              }
            }
            break;
            
          case 4: // PATH
            if (points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(points[0].x, points[0].y);
              
              for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
              }
              
              if (fill) {
                ctx.fill();
              } else {
                ctx.stroke();
              }
            }
            break;
        }
      }
    }
  }, [isLoaded, getDrawingBuffer]);

  /**
   * Handle mouse down event
   */
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    isDrawingRef.current = true;
    lastPointRef.current = { x, y };
    
    // Update engine color and line width
    setColor(color);
    setLineWidth(lineWidth);
    
    onDrawingStart?.();
  }, [isLoaded, color, lineWidth, setColor, setLineWidth, onDrawingStart]);

  /**
   * Handle mouse move event
   */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !isLoaded) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const lastPoint = lastPointRef.current;
    if (lastPoint) {
      // Draw line using WebAssembly engine
      drawLine(lastPoint.x, lastPoint.y, x, y);
      
      // Update canvas immediately for real-time feedback
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      lastPointRef.current = { x, y };
    }
  }, [isLoaded, drawLine]);

  /**
   * Handle mouse up event
   */
  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    onDrawingEnd?.();
  }, [onDrawingEnd]);

  /**
   * Handle mouse leave event
   */
  const handleMouseLeave = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    onDrawingEnd?.();
  }, [onDrawingEnd]);

  /**
   * Clear the canvas
   */
  const clearCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.clearRect(0, 0, width, height);
    }
  }, [width, height]);

  // Initialize canvas when component mounts
  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  // Update canvas style when color or line width changes
  useEffect(() => {
    const ctx = ctxRef.current;
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
    }
  }, [color, lineWidth]);

  // Render drawing buffer when it changes
  useEffect(() => {
    if (isLoaded) {
      renderDrawingBuffer();
    }
  }, [isLoaded, renderDrawingBuffer]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  if (isLoading) {
    return (
      <div className="canvas-container">
        <div className="loading">Loading drawing engine...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="canvas-container">
        <div className="error">Error: {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          display: 'block',
          margin: '20px auto',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          cursor: 'crosshair'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}; 