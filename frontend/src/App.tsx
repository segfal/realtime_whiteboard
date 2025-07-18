import { Canvas } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { useToolManager } from './hooks/useToolManager'
import type { ToolType } from './types/tool'
import './App.css'

const App: React.FC = () => {
  const {
    activeTool,
    settings,
    setActiveTool,
    updateSettings
  } = useToolManager()

  const handleToolSelect = (toolType: ToolType) => {
    setActiveTool(toolType)
  }

  const handleSettingsChange = (newSettings: Partial<typeof settings>) => {
    updateSettings(newSettings)
  }

  return (
    <div className="App">
      <h1>Whiteboard</h1>
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        background: 'white', 
        border: '1px solid #ccc', 
        padding: '10px', 
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1001
      }}>
        <div>Active Tool: {activeTool.id}</div>
        <div>Color: RGB({Math.round(settings.color.r * 255)}, {Math.round(settings.color.g * 255)}, {Math.round(settings.color.b * 255)})</div>
        <div>Thickness: {settings.thickness}px</div>
        <div>Eraser Size: {settings.eraserSize || 10}px</div>
      </div>
      <Toolbar
        activeTool={activeTool.id as ToolType}
        onToolSelect={handleToolSelect}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      <Canvas />
    </div>
  )
}

export default App