import React from "react";
import type { ToolbarProps } from "../interfaces/components";

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
  settings,
  onSettingsChange,
}) => {
  const tools = [
    { id: "stroke" as const, name: "Pen", icon: "✏️" },
    { id: "rectangle" as const, name: "Rectangle", icon: "⬜" },
    { id: "ellipse" as const, name: "Ellipse", icon: "⭕" },
    { id: "eraser" as const, name: "Eraser", icon: "🧽" },
    { id: "select" as const, name: "Select", icon: "👆" },
  ];

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = hexToRgb(event.target.value);
    if (color) {
      onSettingsChange({ color });
    }
  };

  const handleThicknessChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const thickness = parseInt(event.target.value, 10);
    onSettingsChange({ thickness });
  };

  const handleEraserSizeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const eraserSize = parseInt(event.target.value, 10);
    onSettingsChange({ eraserSize });
  };

  return (
    <div
      className="toolbar"
      style={{
        position: "fixed",
        top: "20px",
        left: "20px",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      <div className="tools" style={{ marginBottom: "15px" }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            style={{
              width: "40px",
              height: "40px",
              margin: "2px",
              border:
                activeTool === tool.id ? "2px solid #007bff" : "1px solid #ddd",
              borderRadius: "4px",
              background: activeTool === tool.id ? "#e3f2fd" : "white",
              cursor: "pointer",
              fontSize: "16px",
            }}
            title={tool.name}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div
        className="settings"
        style={{ borderTop: "1px solid #eee", paddingTop: "10px" }}
      >
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}
          >
            Color:
          </label>
          <input
            type="color"
            value={rgbToHex(settings.color)}
            onChange={handleColorChange}
            style={{ width: "100%", height: "30px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label
            style={{ display: "block", fontSize: "12px", marginBottom: "5px" }}
          >
            Thickness: {settings.thickness}px
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={settings.thickness}
            onChange={handleThicknessChange}
            style={{ width: "100%" }}
          />
        </div>

        {activeTool === "eraser" && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              Eraser Size: {settings.eraserSize || 10}px
            </label>
            <input
              type="range"
              min="5"
              max="50"
              value={settings.eraserSize || 10}
              onChange={handleEraserSizeChange}
              style={{ width: "100%" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions for color conversion
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
        a: 1,
      }
    : null;
}

function rgbToHex(color: { r: number; g: number; b: number; a: number }) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
