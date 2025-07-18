import { useRef, useState, useEffect } from 'react'
import { useWASM } from '../hooks/useWasm'
import { useToolManager } from '../hooks/useToolManager'
import type { WASMStroke } from '../types/wasm'
import type { Point, Stroke } from '../interfaces/canvas'

// Helper function to convert WASM stroke to React stroke
const wasmStrokeToReact = (wasmStroke: WASMStroke): Stroke => {
  // Add safety checks for undefined properties
  if (!wasmStroke) {
    console.error('wasmStroke is undefined or null');
    return {
      points: [],
      color: 'rgb(0, 0, 0)',
      thickness: 1
    };
  }
  
  if (!wasmStroke.color) {
    console.error('wasmStroke.color is undefined:', wasmStroke);
    return {
      points: wasmStroke.points || [],
      color: 'rgb(0, 0, 0)',
      thickness: wasmStroke.thickness || 1
    };
  }
  
  return {
    points: wasmStroke.points || [],
    color: `rgb(${Math.round((wasmStroke.color.r || 0) * 255)}, ${Math.round((wasmStroke.color.g || 0) * 255)}, ${Math.round((wasmStroke.color.b || 0) * 255)})`,
    thickness: wasmStroke.thickness || 1
  }
}

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { drawingEngine: wasmEngine, isLoaded, error } = useWASM()
  const {
    activeTool,
    settings,
    handlePointerDown: toolPointerDown,
    handlePointerMove: toolPointerMove,
    handlePointerUp: toolPointerUp
  } = useToolManager()
  
  // Keep React state for UI-only features
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [selectedStrokes, setSelectedStrokes] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png')
  const [previewShape, setPreviewShape] = useState<Stroke | null>(null)

  // Force re-render when strokes change (this is a workaround since we can't easily track WASM changes)
  const [strokeUpdateTrigger, setStrokeUpdateTrigger] = useState(0)
  
  const triggerStrokeUpdate = () => {
    setStrokeUpdateTrigger(prev => prev + 1)
  }

  // Sync strokes from WASM to React state
  useEffect(() => {
    if (!isLoaded) return; // Don't call WASM until loaded
    try {
      const wasmStrokes = wasmEngine.getStrokes()
      const reactStrokes = wasmStrokes.map(wasmStrokeToReact)
      console.log('Syncing strokes from WASM:', wasmStrokes.length, 'strokes')
      setStrokes(reactStrokes)
    } catch (err) {
      console.error('Failed to get strokes from WASM:', err)
    }
  }, [isLoaded, wasmEngine, strokeUpdateTrigger])

  // Helper functions
  const isPointInRect = (pt: Point, x1: number, y1: number, x2: number, y2: number) =>
    pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2

  const isPointNearStroke = (pt: Point, stroke: Stroke, threshold = 8) => {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const a = stroke.points[i]
      const b = stroke.points[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const lengthSq = dx * dx + dy * dy
      let t = 0
      if (lengthSq > 0) {
        t = ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / lengthSq
        t = Math.max(0, Math.min(1, t))
      }
      const projX = a.x + t * dx
      const projY = a.y + t * dy
      const dist = Math.hypot(pt.x - projX, pt.y - projY)
      if (dist <= threshold) return true
    }
    return false
  }

  // Unified event handlers that integrate with tool manager
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isLoaded || !canvasRef.current) return
    
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    
    console.log('Tool active:', activeTool.id, 'Mouse:', mouse)
    
    // Call tool manager first to set up tool state
    toolPointerDown(e.nativeEvent, canvasRef.current)
    
    // Handle tool-specific logic based on active tool
    if (activeTool.id === 'eraser') {
      handleEraserDown(mouse)
    } else if (activeTool.id === 'select') {
      handleSelectDown(mouse)
    } else if (activeTool.id === 'stroke') {
      handleStrokeDown(mouse)
    } else if (activeTool.id === 'rectangle' || activeTool.id === 'ellipse') {
      handleShapeDown(mouse)
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLoaded || !canvasRef.current) return
    
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    
    // Call tool manager first to update tool state
    toolPointerMove(e.nativeEvent, canvasRef.current)
    
    // Handle tool-specific logic based on active tool
    if (activeTool.id === 'eraser' && e.buttons) {
      handleEraserMove(mouse)
    } else if (activeTool.id === 'select') {
      handleSelectMove(mouse)
    } else if (activeTool.id === 'stroke') {
      handleStrokeMove(mouse)
    } else if (activeTool.id === 'rectangle' || activeTool.id === 'ellipse') {
      handleShapeMove(mouse)
    }
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isLoaded || !canvasRef.current) return
    
    // Handle tool-specific logic based on active tool
    if (activeTool.id === 'select') {
      handleSelectUp()
    } else if (activeTool.id === 'stroke') {
      handleStrokeUp()
    } else if (activeTool.id === 'rectangle' || activeTool.id === 'ellipse') {
      handleShapeUp()
    }
    
    // Call tool manager last to finalize tool state
    toolPointerUp(e.nativeEvent, canvasRef.current)
  }

  // Tool-specific handlers
  const handleEraserDown = (mouse: Point) => {
    try {
      const wasmStrokes = wasmEngine.getStrokes()
      const eraserSize = settings.eraserSize || 10
      for (let i = wasmStrokes.length - 1; i >= 0; i--) {
        const stroke = wasmStrokes[i]
        const reactStroke = wasmStrokeToReact(stroke)
        if (isPointNearStroke(mouse, reactStroke, eraserSize)) {
          wasmEngine.removeStroke(i)
          triggerStrokeUpdate()
          break
        }
      }
    } catch (err) {
      console.log('WASM not ready yet:', err)
    }
  }

  const handleEraserMove = (mouse: Point) => {
    try {
      const wasmStrokes = wasmEngine.getStrokes()
      const eraserSize = settings.eraserSize || 10
      for (let i = wasmStrokes.length - 1; i >= 0; i--) {
        const stroke = wasmStrokes[i]
        const reactStroke = wasmStrokeToReact(stroke)
        if (isPointNearStroke(mouse, reactStroke, eraserSize)) {
          wasmEngine.removeStroke(i)
          triggerStrokeUpdate()
          break
        }
      }
    } catch (err) {
      console.log('WASM not ready yet:', err)
    }
  }

  const handleSelectDown = (mouse: Point) => {
    // Check if clicking on a selected item to start dragging
    if (selectedStrokes.size > 0) {
      let inside = false
      strokes.forEach((stroke, i) => {
        if (selectedStrokes.has(i)) {
          for (const pt of stroke.points) {
            if (isPointInRect(mouse, pt.x - 5, pt.y - 5, pt.x + 5, pt.y + 5)) {
              inside = true
              break
            }
          }
        }
      })
      if (inside) {
        setIsDragging(true)
        setDragStart(mouse)
        return
      }
    }
    
    // Start new selection
    setSelectedStrokes(new Set())
    setIsDragging(false)
    setDragStart(null)
  }

  const handleSelectMove = (mouse: Point) => {
    if (isDragging && dragStart) {
      try {
        const dx = mouse.x - dragStart.x
        const dy = mouse.y - dragStart.y
        selectedStrokes.forEach(index => {
          wasmEngine.moveStroke(index, dx, dy)
        })
        triggerStrokeUpdate()
      } catch (err) {
        console.log('WASM not ready yet:', err)
      }
      setDragStart(mouse)
    }
  }

  const handleSelectUp = () => {
    if (isDragging) {
      setIsDragging(false)
      setDragStart(null)
    }
  }

  const handleStrokeDown = (mouse: Point) => {
    // Start drawing with the active tool
    activeTool.startDrawing?.(mouse)
    
    try {
      // Start new stroke in WASM
      const wasmStroke: WASMStroke = {
        points: [mouse],
        color: settings.color,
        thickness: settings.thickness
      }
      wasmEngine.addStroke(wasmStroke)
      triggerStrokeUpdate()
    } catch (err) {
      console.error('WASM stroke error:', err)
      return
    }
    
    // Also keep in React state for immediate UI feedback
    setCurrentStroke({
      points: [mouse],
      color: `rgb(${Math.round(settings.color.r * 255)}, ${Math.round(settings.color.g * 255)}, ${Math.round(settings.color.b * 255)})`,
      thickness: settings.thickness
    })
  }

  const handleStrokeMove = (mouse: Point) => {
    // Continue drawing with the active tool
    activeTool.continueDrawing?.(mouse)
    
    if (currentStroke) {
      try {
        // Add point to current stroke in WASM
        const strokeIndex = wasmEngine.getStrokes().length - 1
        wasmEngine.addPointToStroke(strokeIndex, mouse)
        triggerStrokeUpdate()
      } catch (err) {
        console.log('WASM not ready yet:', err)
        return
      }
      
      // Update React state for immediate feedback
      setCurrentStroke({
        points: [...currentStroke.points, mouse],
        color: currentStroke.color,
        thickness: currentStroke.thickness
      })
    }
  }

  const handleStrokeUp = () => {
    // Finish drawing with the active tool
    activeTool.finishDrawing?.()
    
    if (currentStroke && currentStroke.points.length > 0) {
      try {
        // Ensure the last point is added to the WASM stroke
        const wasmStrokes = wasmEngine.getStrokes()
        const strokeIndex = wasmStrokes.length - 1
        const lastPoint = currentStroke.points[currentStroke.points.length - 1]
        wasmEngine.addPointToStroke(strokeIndex, lastPoint)
        triggerStrokeUpdate()
      } catch (err) {
        console.log('WASM not ready yet:', err)
      }
      
      // Clear current stroke
      setCurrentStroke(null)
    }
  }

  const handleShapeDown = (mouse: Point) => {
    // Start drawing with the active tool
    activeTool.startDrawing?.(mouse)
    setPreviewShape(null)
  }

  const handleShapeMove = (mouse: Point) => {
    // Continue drawing with the active tool
    activeTool.continueDrawing?.(mouse)
    
    // Create preview for shape tools
    if (activeTool.id === 'rectangle') {
      const tool = activeTool
      if (tool.isDrawing && tool.getCurrentBounds) {
        const bounds = tool.getCurrentBounds()
        if (bounds) {
          // Create preview rectangle
          const points = [
            { x: bounds.x1, y: bounds.y1 },
            { x: bounds.x2, y: bounds.y1 },
            { x: bounds.x2, y: bounds.y2 },
            { x: bounds.x1, y: bounds.y2 },
            { x: bounds.x1, y: bounds.y1 }
          ]
          setPreviewShape({
            points,
            color: `rgb(${Math.round(settings.color.r * 255)}, ${Math.round(settings.color.g * 255)}, ${Math.round(settings.color.b * 255)})`,
            thickness: settings.thickness
          })
        }
      }
    } else if (activeTool.id === 'ellipse') {
      const tool = activeTool
      if (tool.isDrawing && tool.getCurrentBounds) {
        const bounds = tool.getCurrentBounds()
        if (bounds) {
          // Create preview ellipse
          const centerX = (bounds.x1 + bounds.x2) / 2
          const centerY = (bounds.y1 + bounds.y2) / 2
          const radiusX = Math.abs(bounds.x2 - bounds.x1) / 2
          const radiusY = Math.abs(bounds.y2 - bounds.y1) / 2
          
          const points: Point[] = []
          const segments = 32
          for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * 2 * Math.PI
            points.push({
              x: centerX + radiusX * Math.cos(angle),
              y: centerY + radiusY * Math.sin(angle)
            })
          }
          
          setPreviewShape({
            points,
            color: `rgb(${Math.round(settings.color.r * 255)}, ${Math.round(settings.color.g * 255)}, ${Math.round(settings.color.b * 255)})`,
            thickness: settings.thickness
          })
        }
      }
    }
  }

  const handleShapeUp = () => {
    // Finish drawing with the active tool
    const shape = activeTool.finishDrawing?.()
    if (shape) {
      try {
        wasmEngine.addShape(shape)
        triggerStrokeUpdate()
      } catch (err) {
        console.error('WASM shape error:', err)
      }
    }
    setPreviewShape(null)
  }

  const handleExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (exportFormat === 'png') {
      // Export as PNG
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = 'whiteboard.png'
      link.click()
    } else if (exportFormat === 'svg') {
      // Export as SVG (draw strokes as SVG paths)
      const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">`
      const svgFooter = `</svg>`
      const svgStrokes = strokes.map(stroke => {
        if (stroke.points.length < 2) return ''
        const d = stroke.points.map((pt, i) =>
          i === 0 ? `M${pt.x},${pt.y}` : `L${pt.x},${pt.y}`
        ).join(' ')
        return `<path d="${d}" stroke="${stroke.color}" stroke-width="${stroke.thickness}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      }).join('')
      const svgContent = svgHeader + svgStrokes + svgFooter
      const blob = new Blob([svgContent], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'whiteboard.svg'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  // Draw all strokes + current stroke + selection rectangle + preview shapes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all strokes (highlight selected)
    strokes.forEach((stroke, i) => {
      if (!stroke.points || stroke.points.length === 0) return;
      ctx.save()
      ctx.strokeStyle = selectedStrokes.has(i) ? "rgba(0, 255, 0, 0.8)" : stroke.color
      ctx.lineWidth = stroke.thickness
      ctx.beginPath()
      if (stroke.points[0] && typeof stroke.points[0].x === 'number' && typeof stroke.points[0].y === 'number') {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        stroke.points.forEach(pt => {
          if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
            ctx.lineTo(pt.x, pt.y)
          }
        })
      }
      ctx.stroke()
      ctx.restore()
    })

    // Draw the current stroke
    if (currentStroke && currentStroke.points.length > 1) {
      ctx.save()
      ctx.strokeStyle = currentStroke.color
      ctx.lineWidth = currentStroke.thickness
      ctx.beginPath()
      ctx.moveTo(currentStroke.points[0].x, currentStroke.points[0].y)
      currentStroke.points.forEach(pt => ctx.lineTo(pt.x, pt.y))
      ctx.stroke()
      ctx.restore()
    }

    // Draw preview shape
    if (previewShape && previewShape.points.length > 1) {
      ctx.save()
      ctx.strokeStyle = previewShape.color
      ctx.lineWidth = previewShape.thickness
      ctx.setLineDash([5, 5]) // Dashed line for preview
      ctx.beginPath()
      ctx.moveTo(previewShape.points[0].x, previewShape.points[0].y)
      previewShape.points.forEach(pt => ctx.lineTo(pt.x, pt.y))
      ctx.stroke()
      ctx.restore()
    }
  }, [strokes, currentStroke, activeTool.id, selectedStrokes, previewShape])

  if (error) {
    return <div>Error loading WASM: {error}</div>
  }

  if (!isLoaded) {
    return <div>Loading WASM...</div>
  }

  return (
    <>
      <div style={{ margin: "1em 0" }}>
        <label>
          Export as:{" "}
          <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'png' | 'svg')}>
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
        </label>
        <button
          onClick={() => {
            // Remove selected strokes from WASM
            const indicesToRemove = Array.from(selectedStrokes).sort((a, b) => b - a); // Sort in descending order
            indicesToRemove.forEach(index => {
              wasmEngine.removeStroke(index);
            });
            setSelectedStrokes(new Set());
            triggerStrokeUpdate(); // Trigger re-render after deleting
          }}
          disabled={selectedStrokes.size === 0}
        >
          Delete Selected
        </button>
        <button onClick={handleExport}>Save</button>
        <button onClick={() => {
          if (wasmEngine) {
            wasmEngine.clear()
            setSelectedStrokes(new Set())
            triggerStrokeUpdate() // Trigger re-render after clearing
          }
        }}>Clear All</button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '2px solid #333', background: 'white', cursor: activeTool.cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </>
  )
}