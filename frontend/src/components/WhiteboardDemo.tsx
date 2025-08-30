import React, { useRef, useState } from "react";
import { useShapeDetectionService } from "../hooks/useShapeDetectionService";
import { ToolType } from "../types/drawing";
import { EnhancedDrawingCanvasWithDetection } from "./EnhancedDrawingCanvasWithDetection";
import { EnhancedToolbar } from "./EnhancedToolbar";

// Define local interfaces to avoid conflicts
interface Point {
  x: number;
  y: number;
}

interface DrawingStroke {
  id: string;
  type: ToolType;
  points: Array<{ x: number; y: number }>;
  color: string;
  strokeWidth: number;
  timestamp: number;
  isSelected?: boolean;
}

export const WhiteboardDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.BRUSH);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Shape detection service integration
  const {
    isServiceAvailable,
    isEnabled: shapeDetectionEnabled,
    setEnabled: setShapeDetectionEnabled,
    checkServiceStatus,
  } = useShapeDetectionService(true);

  const handleUndo = () => {
    if (strokes.length > 0) {
      setStrokes((prev) => prev.slice(0, -1));
    }
  };

  const handleRedo = () => {
    // This would require a more sophisticated undo/redo system with a redo stack
    console.log("Redo functionality would be implemented here");
  };

  const handleClear = () => {
    setStrokes([]);
  };

  const handleSave = () => {
    // This would integrate with the canvas auto-save system
    console.log("Save functionality would be implemented here");
    alert("Canvas saved! (Demo)");
  };

  const handleStrokeAdd = (stroke: DrawingStroke) => {
    setStrokes((prev) => [...prev, stroke]);
  };

  const handleStrokeUpdate = (
    strokeId: string,
    updatedStroke: DrawingStroke
  ) => {
    setStrokes((prev) =>
      prev.map((stroke) => (stroke.id === strokeId ? updatedStroke : stroke))
    );
  };

  return (
    <div
      className="whiteboard-demo"
      style={{ height: "100vh", position: "relative" }}
    >
      {/* Enhanced Toolbar with Shape Detection */}
      <EnhancedToolbar
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        strokeWidth={strokeWidth}
        onStrokeWidthChange={setStrokeWidth}
        strokeColor={strokeColor}
        onStrokeColorChange={setStrokeColor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={strokes.length > 0}
        canRedo={false}
        onClear={handleClear}
        onSave={handleSave}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        shapeDetectionEnabled={shapeDetectionEnabled}
        onShapeDetectionToggle={setShapeDetectionEnabled}
        shapeDetectionAvailable={isServiceAvailable}
      />

      {/* Enhanced Drawing Canvas with Shape Detection */}
      <div
        style={{
          marginLeft: isCollapsed ? "60px" : "280px",
          height: "100vh",
          background: "#f8f9fa",
        }}
      >
        <EnhancedDrawingCanvasWithDetection
          ref={canvasRef}
          width={window.innerWidth - (isCollapsed ? 60 : 280)}
          height={window.innerHeight}
          currentTool={currentTool}
          strokeWidth={strokeWidth}
          strokeColor={strokeColor}
          strokes={strokes}
          onStrokeAdd={handleStrokeAdd}
          onStrokeUpdate={handleStrokeUpdate}
          roomId="whiteboard-demo"
          shapeDetectionEnabled={shapeDetectionEnabled}
        />
      </div>

      {/* Demo Info Panel */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: "300px",
          zIndex: 1000,
        }}
      >
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>
          🎨 Enhanced Whiteboard Demo
        </h3>
        <p style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#666" }}>
          Professional drawing tools with AI shape detection
        </p>

        <div style={{ fontSize: "12px", color: "#888" }}>
          <div>
            <strong>Current Tool:</strong> {currentTool}
          </div>
          <div>
            <strong>Stroke Width:</strong> {strokeWidth}px
          </div>
          <div>
            <strong>Color:</strong> {strokeColor}
          </div>
          <div>
            <strong>Strokes:</strong> {strokes.length}
          </div>
          <div>
            <strong>AI Detection:</strong>{" "}
            <span
              style={{
                color:
                  shapeDetectionEnabled && isServiceAvailable
                    ? "#28a745"
                    : "#dc3545",
                fontWeight: "600",
              }}
            >
              {shapeDetectionEnabled && isServiceAvailable ? "ACTIVE" : "OFF"}
            </span>
          </div>
          <div>
            <strong>ML Service:</strong>{" "}
            <span
              style={{
                color: isServiceAvailable ? "#28a745" : "#dc3545",
                fontWeight: "600",
              }}
            >
              {isServiceAvailable ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>

        <button
          onClick={checkServiceStatus}
          style={{
            marginTop: "12px",
            padding: "6px 12px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          🔄 Check Service Status
        </button>
      </div>
    </div>
  );
};
