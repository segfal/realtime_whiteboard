import React, { useRef, useState } from "react";
import { ToolType } from "../types/drawing";
import { EnhancedDrawingCanvasWithDetection } from "./EnhancedDrawingCanvasWithDetection";
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

export const ShapeDetectionDemo: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.BRUSH);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [shapeDetectionEnabled, setShapeDetectionEnabled] = useState(true);
  const [recentDetections, setRecentDetections] = useState<
    Array<{
      stroke: DrawingStroke;
      detection: string;
      confidence: number;
      timestamp: number;
    }>
  >([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleStrokeComplete = (stroke: DrawingStroke) => {
    console.log("🖌️ Stroke completed:", stroke);
    // Here you would typically send the stroke to WebSocket or save it
  };

  const handleCanvasUpdate = (canvasData: any) => {
    console.log("📊 Canvas updated:", canvasData);
    // Here you would typically broadcast canvas updates
  };

  const handleUndo = () => {
    console.log("↶ Undo triggered");
    // This would trigger undo logic in the canvas component
  };

  const handleRedo = () => {
    console.log("↷ Redo triggered");
    // This would trigger redo logic in the canvas component
  };

  const handleClearCanvas = () => {
    console.log("🗑️ Clear Canvas triggered");
    // This would trigger clear canvas logic in the canvas component
  };

  const handleSave = () => {
    console.log("💾 Manual save triggered");
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

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
      className="shape-detection-demo"
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={getCanUndo()}
        canRedo={getCanRedo()}
        onClear={handleClearCanvas}
        onSave={handleSave}
        isCollapsed={isToolbarCollapsed}
        onToggleCollapse={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
      />

      {/* Drawing Canvas with Shape Detection */}
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
          position: "relative",
        }}
      >
        <EnhancedDrawingCanvasWithDetection
          ref={canvasRef}
          currentTool={currentTool}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          onStrokeComplete={handleStrokeComplete}
          onCanvasUpdate={handleCanvasUpdate}
          width={1400}
          height={800}
          roomId="shape-detection-demo"
          shapeDetectionEnabled={shapeDetectionEnabled}
        />
      </div>

      {/* Shape Detection Controls */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "white",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "14px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ fontWeight: "600" }}>🤖 AI Shape Detection:</span>
        <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            type="checkbox"
            checked={shapeDetectionEnabled}
            onChange={(e) => setShapeDetectionEnabled(e.target.checked)}
            style={{ transform: "scale(1.2)" }}
          />
          <span>Enabled</span>
        </label>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "500",
            backgroundColor: shapeDetectionEnabled ? "#e8f5e8" : "#f0f0f0",
            color: shapeDetectionEnabled ? "#2d5016" : "#666",
          }}
        >
          {shapeDetectionEnabled ? "ACTIVE" : "OFF"}
        </span>
      </div>

      {/* Instructions Panel */}
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "white",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
          padding: "16px",
          fontSize: "12px",
          maxWidth: "280px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#333" }}>
          🎨 Shape Detection Demo
        </h4>

        <div style={{ marginBottom: "12px" }}>
          <strong>Try drawing these shapes:</strong>
          <ul
            style={{
              margin: "4px 0 0 0",
              paddingLeft: "16px",
              fontSize: "11px",
            }}
          >
            <li>📏 Lines (straight strokes)</li>
            <li>⬜ Rectangles (rough boxes)</li>
            <li>⭕ Circles (closed loops)</li>
            <li>🔺 Triangles (3-sided shapes)</li>
            <li>➡️ Arrows (line with point)</li>
            <li>⭐ Stars (5-pointed shapes)</li>
          </ul>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <strong>How it works:</strong>
          <ol
            style={{
              margin: "4px 0 0 0",
              paddingLeft: "16px",
              fontSize: "11px",
            }}
          >
            <li>Draw freehand with the brush tool</li>
            <li>AI analyzes your stroke</li>
            <li>If confident (&gt;70%), shows suggestion</li>
            <li>Accept to clean up the shape</li>
          </ol>
        </div>

        <div style={{ fontSize: "11px", color: "#666" }}>
          <strong>Keyboard shortcuts:</strong>
          <br />B (Brush), E (Eraser), R (Rectangle), C (Circle), L (Line)
          <br />
          Ctrl+Z (Undo), Ctrl+Y (Redo)
        </div>
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
        {shapeDetectionEnabled && " | 🤖 AI: ON"}
      </div>

      {/* Demo Info Banner */}
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          left: "10px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "8px 16px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "500",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        }}
      >
        🧪 Phase 6: ML Shape Detection Demo
      </div>
    </div>
  );
};
