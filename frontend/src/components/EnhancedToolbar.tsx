import React, { useState } from "react";
import { ToolType } from "../types/drawing";
import "./EnhancedToolbar.css";

interface EnhancedToolbarProps {
  currentTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onClear?: () => void;
  onSave?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  shapeDetectionEnabled?: boolean;
  onShapeDetectionToggle?: (enabled: boolean) => void;
  shapeDetectionAvailable?: boolean;
}

export const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  currentTool,
  onToolChange,
  strokeWidth,
  onStrokeWidthChange,
  strokeColor,
  onStrokeColorChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onClear,
  onSave,
  isCollapsed = false,
  onToggleCollapse,
  shapeDetectionEnabled = false,
  onShapeDetectionToggle,
  shapeDetectionAvailable = false,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const tools = [
    { type: ToolType.BRUSH, icon: "🖌️", label: "Brush", shortcut: "B" },
    { type: ToolType.ERASER, icon: "🧹", label: "Eraser", shortcut: "E" },
    { type: ToolType.SELECT, icon: "👆", label: "Select", shortcut: "S" },
    { type: ToolType.RECTANGLE, icon: "⬜", label: "Rectangle", shortcut: "R" },
    { type: ToolType.CIRCLE, icon: "⭕", label: "Circle", shortcut: "C" },
    { type: ToolType.LINE, icon: "📏", label: "Line", shortcut: "L" },
    { type: ToolType.TEXT, icon: "📝", label: "Text", shortcut: "T" },
  ];

  const colorPalette = [
    "#000000",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFFF00",
    "#FF00FF",
    "#00FFFF",
    "#FFA500",
    "#800080",
    "#A52A2A",
    "#808080",
    "#FFFFFF",
    "#FFB6C1",
    "#98FB98",
    "#87CEEB",
    "#DDA0DD",
  ];

  const strokeWidths = [1, 2, 3, 5, 8, 12, 16, 20];

  if (isCollapsed) {
    return (
      <div className="enhanced-toolbar collapsed">
        <button
          onClick={onToggleCollapse}
          className="toolbar-toggle"
          title="Show Toolbar"
        >
          🔧
        </button>
      </div>
    );
  }

  return (
    <div className="enhanced-toolbar expanded">
      <div className="toolbar-header">
        <h3>🎨 Enhanced Tools</h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="toolbar-toggle"
            title="Hide Toolbar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Drawing Tools */}
      <div className="tool-section">
        <h4>Drawing Tools</h4>
        <div className="tool-grid">
          {tools.map((tool) => (
            <button
              key={tool.type}
              className={`tool-button ${currentTool === tool.type ? "active" : ""}`}
              onClick={() => onToolChange(tool.type)}
              title={`${tool.label} (${tool.shortcut})`}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stroke Settings */}
      <div className="tool-section">
        <h4>Stroke Settings</h4>

        {/* Stroke Width */}
        <div className="setting-group">
          <label>Width: {strokeWidth}px</label>
          <div className="width-options">
            {strokeWidths.map((width) => (
              <button
                key={width}
                className={`width-button ${strokeWidth === width ? "active" : ""}`}
                onClick={() => onStrokeWidthChange(width)}
                title={`${width}px`}
              >
                <div
                  className="width-preview"
                  style={{
                    width: `${Math.max(width, 2)}px`,
                    height: `${Math.max(width, 2)}px`,
                    backgroundColor: strokeColor,
                    borderRadius: "50%",
                  }}
                />
              </button>
            ))}
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(parseInt(e.target.value))}
            className="width-slider"
          />
        </div>

        {/* Color Selection */}
        <div className="setting-group">
          <label>Color:</label>
          <div className="color-section">
            <div className="color-palette">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  className={`color-button ${strokeColor === color ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onStrokeColorChange(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="custom-color">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => onStrokeColorChange(e.target.value)}
                className="color-picker"
              />
              <span className="color-value">{strokeColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="tool-section">
        <h4>Actions</h4>

        <div className="action-buttons">
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="action-button"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
          )}

          {onRedo && (
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="action-button"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>
          )}

          {onSave && (
            <button
              onClick={onSave}
              className="action-button save"
              title="Save Canvas (Ctrl+S)"
            >
              💾 Save
            </button>
          )}

          {onClear && (
            <button
              onClick={onClear}
              className="action-button danger"
              title="Clear Canvas"
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="tool-section">
        <details className="shortcuts-help">
          <summary>⌨️ Keyboard Shortcuts</summary>
          <div className="shortcuts-list">
            <div>
              <kbd>B</kbd> - Brush tool
            </div>
            <div>
              <kbd>E</kbd> - Eraser tool
            </div>
            <div>
              <kbd>S</kbd> - Select tool
            </div>
            <div>
              <kbd>R</kbd> - Rectangle tool
            </div>
            <div>
              <kbd>C</kbd> - Circle tool
            </div>
            <div>
              <kbd>L</kbd> - Line tool
            </div>
            <div>
              <kbd>T</kbd> - Text tool
            </div>
            <div>
              <kbd>Ctrl+Z</kbd> - Undo
            </div>
            <div>
              <kbd>Ctrl+Y</kbd> - Redo
            </div>
            <div>
              <kbd>Del</kbd> - Delete selected
            </div>
            <div>
              <kbd>Ctrl+S</kbd> - Save
            </div>
            <div>
              <kbd>+</kbd>/<kbd>-</kbd> - Zoom in/out
            </div>
          </div>
        </details>
      </div>

      {/* AI Shape Detection Controls */}
      {onShapeDetectionToggle && (
        <div className="tool-section">
          <div className="section-title">🤖 AI Shape Detection</div>
          <div className="shape-detection-controls">
            <div className="detection-status">
              <span
                className={`status-indicator ${shapeDetectionAvailable ? "available" : "unavailable"}`}
              >
                {shapeDetectionAvailable ? "🟢" : "🔴"}
              </span>
              <span className="status-text">
                Service: {shapeDetectionAvailable ? "Online" : "Offline"}
              </span>
            </div>

            <div className="detection-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={shapeDetectionEnabled}
                  onChange={(e) => onShapeDetectionToggle(e.target.checked)}
                  disabled={!shapeDetectionAvailable}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">
                  {shapeDetectionEnabled ? "Enabled" : "Disabled"}
                </span>
              </label>
            </div>

            {shapeDetectionEnabled && shapeDetectionAvailable && (
              <div className="detection-info">
                <div className="info-item">
                  <span className="info-icon">🎯</span>
                  <span className="info-text">
                    Auto-detect shapes as you draw
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-icon">✨</span>
                  <span className="info-text">
                    Suggests perfect geometric shapes
                  </span>
                </div>
              </div>
            )}

            {!shapeDetectionAvailable && (
              <div className="detection-warning">
                <span className="warning-icon">⚠️</span>
                <span className="warning-text">
                  AI service unavailable. Drawing without shape detection.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tool Info */}
      <div className="tool-section">
        <div className="current-tool-info">
          <strong>Current Tool:</strong>{" "}
          {tools.find((t) => t.type === currentTool)?.label || "Unknown"}
          <br />
          <strong>Settings:</strong> {strokeWidth}px, {strokeColor}
          {onShapeDetectionToggle && (
            <>
              <br />
              <strong>AI Detection:</strong>{" "}
              <span className={shapeDetectionEnabled ? "ai-on" : "ai-off"}>
                {shapeDetectionEnabled ? "ON" : "OFF"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
