import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { WebSocketStatus } from "./components/WebSocketStatus";
import { WhiteboardProvider } from "./contexts/WhiteboardContext";

import type { ToolType } from "./types/tool";
import "./App.css";
import { useWhiteboard } from "./contexts/ctx";

// Inner App component that uses the context
const AppContent: React.FC = () => {
  const { state, setActiveTool, updateSettings } = useWhiteboard();

  const handleToolSelect = (toolType: ToolType) => {
    setActiveTool(toolType);
  };

  const handleSettingsChange = (
    newSettings: Partial<typeof state.settings>,
  ) => {
    updateSettings(newSettings);
  };

  return (
    <div className="App">
      <h1>Whiteboard</h1>
      <WebSocketStatus />
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "white",
          border: "1px solid #ccc",
          padding: "10px",
          borderRadius: "8px",
          fontSize: "12px",
          zIndex: 1001,
        }}
      >
        <div>Active Tool: {state.activeTool?.id || "UNDEFINED"}</div>
        <div>
          Color: RGB({Math.round(state.settings.color.r * 255)},{" "}
          {Math.round(state.settings.color.g * 255)},{" "}
          {Math.round(state.settings.color.b * 255)})
        </div>
        <div>Thickness: {state.settings.thickness}px</div>
        <div>Eraser Size: {state.settings.eraserSize || 10}px</div>
        <div>
          WASM Status: {state.isWasmLoaded ? "✅ Loaded" : "⏳ Loading..."}
        </div>
        {state.wasmError && (
          <div style={{ color: "red" }}>WASM Error: {state.wasmError}</div>
        )}
      </div>
      <Toolbar
        activeTool={(state.activeTool?.id as ToolType) || "stroke"}
        onToolSelect={handleToolSelect}
        settings={state.settings}
        onSettingsChange={handleSettingsChange}
      />
      <Canvas />
    </div>
  );
};

// Main App component that provides the context
export const App: React.FC = () => {
  return (
    <WhiteboardProvider>
      <AppContent />
    </WhiteboardProvider>
  );
};
