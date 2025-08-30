import React, { useCallback, useEffect, useRef, useState } from "react";
import { ToolType } from "../types/drawing";

// Define local interfaces to avoid conflicts
interface Point {
  x: number;
  y: number;
}

interface DrawingStroke {
  id: string;
  type: ToolType;
  points: Point[];
  color: string;
  strokeWidth: number;
  timestamp: number;
  isSelected?: boolean;
}

interface EnhancedDrawingCanvasProps {
  currentTool: ToolType;
  strokeWidth: number;
  strokeColor: string;
  onStrokeComplete?: (stroke: DrawingStroke) => void;
  onCanvasUpdate?: (canvasData: any) => void;
  width?: number;
  height?: number;
  className?: string;
}

export const EnhancedDrawingCanvas: React.FC<EnhancedDrawingCanvasProps> = ({
  currentTool,
  strokeWidth,
  strokeColor,
  onStrokeComplete,
  onCanvasUpdate,
  width = 1920,
  height = 1080,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(
    null
  );
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [undoStack, setUndoStack] = useState<DrawingStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);

  // Generate unique stroke ID
  const generateStrokeId = () => {
    return `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Get mouse position relative to canvas
  const getMousePos = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement> | MouseEvent): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (point: Point) => {
      setIsDrawing(true);
      setStartPoint(point);

      const newStroke: DrawingStroke = {
        id: generateStrokeId(),
        type: currentTool,
        points: [point],
        color: strokeColor,
        strokeWidth,
        timestamp: Date.now(),
      };

      setCurrentStroke(newStroke);

      // For freehand drawing, start with the initial point
      if (currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
        }
      }
    },
    [currentTool, strokeColor, strokeWidth]
  );

  // Continue drawing
  const continueDrawing = useCallback(
    (point: Point) => {
      if (!isDrawing || !currentStroke) return;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      if (currentTool === ToolType.BRUSH || currentTool === ToolType.ERASER) {
        // Freehand drawing
        setCurrentStroke((prev) =>
          prev
            ? {
                ...prev,
                points: [...prev.points, point],
              }
            : null
        );

        ctx.globalCompositeOperation =
          currentTool === ToolType.ERASER ? "destination-out" : "source-over";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      } else if (startPoint) {
        // Shape drawing - clear and redraw
        redrawCanvas();
        drawPreviewShape(startPoint, point);
      }
    },
    [
      isDrawing,
      currentStroke,
      currentTool,
      strokeColor,
      strokeWidth,
      startPoint,
    ]
  );

  // End drawing
  const endDrawing = useCallback(() => {
    if (!isDrawing || !currentStroke) return;

    setIsDrawing(false);

    let finalStroke = currentStroke;

    // For shapes, update the final points
    if (
      startPoint &&
      currentTool !== ToolType.BRUSH &&
      currentTool !== ToolType.ERASER
    ) {
      const endPoint = currentStroke.points[currentStroke.points.length - 1];
      finalStroke = {
        ...currentStroke,
        points: getShapePoints(startPoint, endPoint, currentTool),
      };
    }

    // Save to undo stack
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]); // Clear redo stack on new action

    // Add stroke to canvas
    setStrokes((prev) => [...prev, finalStroke]);
    setCurrentStroke(null);
    setStartPoint(null);

    // Notify parent
    onStrokeComplete?.(finalStroke);

    // Redraw canvas with all strokes
    setTimeout(() => redrawCanvas(), 0);
  }, [
    isDrawing,
    currentStroke,
    startPoint,
    currentTool,
    strokes,
    onStrokeComplete,
  ]);

  // Get points for different shapes
  const getShapePoints = (
    start: Point,
    end: Point,
    toolType: ToolType
  ): Point[] => {
    switch (toolType) {
      case ToolType.LINE:
        return [start, end];

      case ToolType.RECTANGLE:
        return [
          start,
          { x: end.x, y: start.y },
          end,
          { x: start.x, y: end.y },
          start, // Close the rectangle
        ];

      case ToolType.CIRCLE:
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius =
          Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          ) / 2;

        const points: Point[] = [];
        for (let i = 0; i <= 36; i++) {
          const angle = (i * Math.PI * 2) / 36;
          points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
        return points;

      default:
        return [start, end];
    }
  };

  // Draw preview shape
  const drawPreviewShape = (start: Point, end: Point) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();

    switch (currentTool) {
      case ToolType.LINE:
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        break;

      case ToolType.RECTANGLE:
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.rect(start.x, start.y, width, height);
        break;

      case ToolType.CIRCLE:
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        const radius =
          Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
          ) / 2;
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        break;
    }

    ctx.stroke();
  };

  // Redraw entire canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length === 0) return;

      ctx.globalCompositeOperation =
        stroke.type === ToolType.ERASER ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });
  }, [strokes]);

  // Undo function
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previousState);
    setUndoStack((prev) => prev.slice(0, -1));

    setTimeout(() => redrawCanvas(), 0);
  }, [undoStack, strokes, redrawCanvas]);

  // Redo function
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes(nextState);
    setRedoStack((prev) => prev.slice(0, -1));

    setTimeout(() => redrawCanvas(), 0);
  }, [redoStack, strokes, redrawCanvas]);

  // Clear canvas
  const clear = useCallback(() => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes([]);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [strokes]);

  // Mouse event handlers
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(event);
    startDrawing(point);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(event);
    continueDrawing(point);
  };

  const handleMouseUp = () => {
    endDrawing();
  };

  // Touch event handlers for mobile
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const point = {
        x: (touch.clientX - rect.left) * (width / rect.width),
        y: (touch.clientY - rect.top) * (height / rect.height),
      };
      startDrawing(point);
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const point = {
        x: (touch.clientX - rect.left) * (width / rect.width),
        y: (touch.clientY - rect.top) * (height / rect.height),
      };
      continueDrawing(point);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    endDrawing();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        undo();
      } else if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === "y" || (event.key === "z" && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Update canvas data when strokes change
  useEffect(() => {
    onCanvasUpdate?.({
      strokes,
      timestamp: Date.now(),
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
    });
  }, [strokes, undoStack, redoStack, onCanvasUpdate]);

  // Expose functions to parent
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).undo = undo;
      (canvasRef.current as any).redo = redo;
      (canvasRef.current as any).clear = clear;
      (canvasRef.current as any).canUndo = undoStack.length > 0;
      (canvasRef.current as any).canRedo = redoStack.length > 0;
    }
  }, [undo, redo, clear, undoStack, redoStack]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`enhanced-drawing-canvas ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: getCursorForTool(currentTool),
        touchAction: "none",
        display: "block",
        maxWidth: "100%",
        maxHeight: "100%",
        border: "1px solid #e0e0e0",
      }}
    />
  );
};

// Helper function to get cursor style for tool
function getCursorForTool(tool: ToolType): string {
  switch (tool) {
    case ToolType.BRUSH:
      return "crosshair";
    case ToolType.ERASER:
      return "grab";
    case ToolType.SELECT:
      return "default";
    case ToolType.RECTANGLE:
    case ToolType.CIRCLE:
    case ToolType.LINE:
      return "crosshair";
    case ToolType.TEXT:
      return "text";
    default:
      return "default";
  }
}
