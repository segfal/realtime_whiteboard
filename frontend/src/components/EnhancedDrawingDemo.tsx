import React, { useRef, useState } from "react";
import { ToolType } from "../types/drawing";
import { EnhancedDrawingCanvas } from "./EnhancedDrawingCanvas";
import { EnhancedToolbar } from "./EnhancedToolbar";

// Define local interface to avoid conflicts
interface DrawingStroke {
  id: string;
  type: ToolType;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  timestamp: number;
  isSelected?: boolean;
}

export const EnhancedDrawingDemo: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.BRUSH);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleStrokeComplete = (stroke: DrawingStroke) => {
    console.log("Stroke completed:", stroke);
    // Here you would typically send the stroke to WebSocket or save it
  };

  const handleCanvasUpdate = (canvasData: any) => {
    console.log("Canvas updated:", canvasData);
    // Here you would typically broadcast canvas updates
  };

  const handleUndo = () => {
    if (canvasRef.current && (canvasRef.current as any).undo) {
      (canvasRef.current as any).undo();
    }
  };

  const handleRedo = () => {
    if (canvasRef.current && (canvasRef.current as any).redo) {
      (canvasRef.current as any).redo();
    }
  };

  const handleClear = () => {
    if (canvasRef.current && (canvasRef.current as any).clear) {
      (canvasRef.current as any).clear();
    }
  };

  const handleSave = () => {
    console.log("Manual save triggered");
    // Here you would typically trigger a manual save to backend
  };

  const getCanUndo = () => {
    return canvasRef.current
      ? (canvasRef.current as any).canUndo || false
      : false;
  };

  const getCanRedo = () => {
    return canvasRef.current
      ? (canvasRef.current as any).canRedo || false
      : false;
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Tool shortcuts
      if (event.target === document.body) {
        switch (event.key.toLowerCase()) {
          case "b":
            setCurrentTool(ToolType.BRUSH);
            break;
          case "e":
            setCurrentTool(ToolType.ERASER);
            break;
          case "s":
            if (!event.ctrlKey && !event.metaKey) {
              setCurrentTool(ToolType.SELECT);
            }
            break;
          case "r":
            setCurrentTool(ToolType.RECTANGLE);
            break;
          case "c":
            setCurrentTool(ToolType.CIRCLE);
            break;
          case "l":
            setCurrentTool(ToolType.LINE);
            break;
          case "t":
            setCurrentTool(ToolType.TEXT);
            break;
        }
      }

      // Global shortcuts
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="enhanced-drawing-demo"
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Enhanced Toolbar */}
      <EnhancedToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={getCanUndo()}
        canRedo={getCanRedo()}
        onClear={handleClear}
        onSave={handleSave}
        isCollapsed={isToolbarCollapsed}
        onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
      />

      {/* Drawing Canvas */}
      <div
        style={{
          maxWidth: "calc(100vw - 320px)",
          maxHeight: "calc(100vh - 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          margin: "20px",
        }}
      >
        <EnhancedDrawingCanvas
          ref={canvasRef}
          currentTool={currentTool}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          onStrokeComplete={handleStrokeComplete}
          onCanvasUpdate={handleCanvasUpdate}
          width={1200}
          height={800}
        />
      </div>

      {/* Status Bar */}
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          background: "rgba(0, 0, 0, 0.8)",
          color: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        Tool: {currentTool} | Width: {strokeWidth}px | Color: {strokeColor}
      </div>

      {/* Instructions */}
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "white",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "12px",
          fontSize: "12px",
          maxWidth: "200px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h4 style={{ margin: "0 0 8px 0", fontSize: "13px" }}>
          🎨 Enhanced Drawing Tools Demo
        </h4>
        <p style={{ margin: "0 0 4px 0" }}>
          Use keyboard shortcuts or toolbar to switch tools:
        </p>
        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px" }}>
          <li>B - Brush</li>
          <li>E - Eraser</li>
          <li>R - Rectangle</li>
          <li>C - Circle</li>
          <li>L - Line</li>
          <li>Ctrl+Z - Undo</li>
          <li>Ctrl+Y - Redo</li>
        </ul>
      </div>
    </div>
  );
};
