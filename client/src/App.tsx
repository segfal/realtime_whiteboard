import { useEffect, useRef, useState, useCallback } from "react"
import { HexColorPicker } from "react-colorful"
import { CanvasRenderer } from "./components/CanvasRenderer"
import { useDrawingEngine } from "./hooks/useDrawingEngine"

/**
 * Color picker component with improved styling
 */
interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  return (
    <div className="color-picker">
      <h3>Choose Color</h3>
      <HexColorPicker color={color} onChange={onChange} />
      <div className="color-preview" style={{ backgroundColor: color }}></div>
    </div>
  )
}

/**
 * Toolbar component with drawing tools and actions
 */
interface ToolbarProps {
  onClear: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onClear, 
  onSave, 
  onUndo, 
  onRedo, 
  canUndo, 
  canRedo 
}) => {
  return (
    <div className="toolbar">
      <button onClick={onClear} className="tool-button">
        🗑️ Clear
      </button>
      <button onClick={onSave} className="tool-button">
        💾 Save
      </button>
      <button 
        onClick={onUndo} 
        disabled={!canUndo}
        className="tool-button"
      >
        ↩️ Undo
      </button>
      <button 
        onClick={onRedo} 
        disabled={!canRedo}
        className="tool-button"
      >
        ↪️ Redo
      </button>
    </div>
  )
}

/**
 * Line width selector component
 */
interface LineWidthSelectorProps {
  lineWidth: number;
  onChange: (width: number) => void;
}

const LineWidthSelector: React.FC<LineWidthSelectorProps> = ({ lineWidth, onChange }) => {
  const widths = [1, 2, 3, 5, 8, 12, 16, 20];
  
  return (
    <div className="line-width-selector">
      <h3>Line Width</h3>
      <div className="width-options">
        {widths.map((width) => (
          <button
            key={width}
            onClick={() => onChange(width)}
            className={`width-option ${lineWidth === width ? 'active' : ''}`}
            style={{
              width: `${width * 2}px`,
              height: `${width * 2}px`,
              borderRadius: '50%'
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Main whiteboard component
 */
interface WhiteboardProps {
  color: string;
  lineWidth: number;
  onDrawingStart?: () => void;
  onDrawingEnd?: () => void;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ 
  color, 
  lineWidth, 
  onDrawingStart, 
  onDrawingEnd 
}) => {
  return (
    <div className="whiteboard">
      <CanvasRenderer
        width={1024}
        height={768}
        color={color}
        lineWidth={lineWidth}
        onDrawingStart={onDrawingStart}
        onDrawingEnd={onDrawingEnd}
      />
    </div>
  )
}

/**
 * Main application component
 * 
 * This component demonstrates several design patterns:
 * - Custom Hooks Pattern: useDrawingEngine hook
 * - Component Composition Pattern: Breaking down UI into smaller components
 * - Strategy Pattern: Different drawing tools (implemented in C++)
 * - Observer Pattern: Drawing events and state management
 */
const App = () => {
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use the WebAssembly drawing engine
  const {
    isLoaded,
    isLoading,
    error,
    clear,
    undo: engineUndo,
    redo: engineRedo,
    getCurrentStyle
  } = useDrawingEngine();

  /**
   * Handle clear canvas action
   */
  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    clear();
  }, [clear]);

  /**
   * Handle save canvas action
   */
  const handleSave = useCallback(() => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL();
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "whiteboard.png";
      link.click();
    }
  }, []);

  /**
   * Handle undo action
   */
  const handleUndo = useCallback(() => {
    const success = engineUndo();
    setCanUndo(success);
    setCanRedo(true);
  }, [engineUndo]);

  /**
   * Handle redo action
   */
  const handleRedo = useCallback(() => {
    const success = engineRedo();
    setCanRedo(success);
    setCanUndo(true);
  }, [engineRedo]);

  /**
   * Handle drawing start
   */
  const handleDrawingStart = useCallback(() => {
    setIsDrawing(true);
  }, []);

  /**
   * Handle drawing end
   */
  const handleDrawingEnd = useCallback(() => {
    setIsDrawing(false);
    // Update undo/redo state after drawing
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  // Update undo/redo state when engine loads
  useEffect(() => {
    if (isLoaded) {
      const style = getCurrentStyle();
      if (style) {
        setCanUndo(false);
        setCanRedo(false);
      }
    }
  }, [isLoaded, getCurrentStyle]);

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <h1>Loading Drawing Engine...</h1>
          <p>Initializing WebAssembly module...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h1>Error Loading Drawing Engine</h1>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎨 WebAssembly Drawing Board</h1>
        <p>Powered by C++ Drawing Engine</p>
      </header>
      
      <main className="app-main">
        <div className="sidebar">
          <ColorPicker color={color} onChange={setColor} />
          <LineWidthSelector lineWidth={lineWidth} onChange={setLineWidth} />
        </div>
        
        <div className="main-content">
          <Whiteboard
            color={color}
            lineWidth={lineWidth}
            onDrawingStart={handleDrawingStart}
            onDrawingEnd={handleDrawingEnd}
          />
          
          <Toolbar
            onClear={handleClear}
            onSave={handleSave}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </main>
      
      <footer className="app-footer">
        <p>
          Drawing Status: {isDrawing ? "🟢 Drawing" : "⚪ Ready"} | 
          Engine: {isLoaded ? "🟢 Loaded" : "🔴 Not Loaded"}
        </p>
        <p>Keyboard Shortcuts: Ctrl+Z (Undo), Ctrl+Y (Redo)</p>
      </footer>
    </div>
  )
}

export default App;