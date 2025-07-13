import { useRef, useState, useEffect } from 'react'
import { useWASM } from '../hooks/useWasm'
import { drawingEngine } from '../wasm/drawingEngine'
import type { WASMStroke, WASMPoint, WASMColor } from '../types/wasm'

type Point = { x: number; y: number }
type Stroke = { points: Point[]; color: string; thickness: number }







// TODO: Fix the WASM engine to be able to handle the last point of the stroke
// CHECK WHY WASM ENGINE IS NOT UPDATING THE STROKES WHEN THE POINT IS ADDED

// Helper function to convert hex color to WASM color
const hexToWasmColor = (hex: string): WASMColor => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return { r, g, b, a: 1 }
}

// Helper function to convert WASM stroke to React stroke
const wasmStrokeToReact = (wasmStroke: WASMStroke): Stroke => {
  return {
    points: wasmStroke.points,
    color: `rgb(${Math.round(wasmStroke.color.r * 255)}, ${Math.round(wasmStroke.color.g * 255)}, ${Math.round(wasmStroke.color.b * 255)})`,
    thickness: wasmStroke.thickness
  }
}

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { drawingEngine, isLoaded, error } = useWASM()
  
  // Keep React state for UI-only features
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentColor, setCurrentColor] = useState<string>("#000000")
  const [currentThickness, setCurrentThickness] = useState<number>(2)
  const [tool, setTool] = useState<"draw" | "select" | "erase">("draw")
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null)
  const [selectedStrokes, setSelectedStrokes] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png')

  // Sync strokes from WASM to React state
  useEffect(() => {
    if (!isLoaded) return; // Don't call WASM until loaded
    try {
      const wasmStrokes = drawingEngine.getStrokes()
      const reactStrokes = wasmStrokes.map(wasmStrokeToReact)
      setStrokes(reactStrokes)
      console.log(strokes)
    } catch (err) {
      console.error('Failed to get strokes from WASM:', err)
    }
  }, [isLoaded, drawingEngine])

  // Helper functions (keep existing ones)
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

  // Updated mouse events to use WASM
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isLoaded) return
    
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    
    if (tool === "erase") {
      try {
        const wasmStrokes = drawingEngine.getStrokes()
        for (let i = wasmStrokes.length - 1; i >= 0; i--) {
          const stroke = wasmStrokes[i]
          const reactStroke = wasmStrokeToReact(stroke)
          if (isPointNearStroke(mouse, reactStroke)) {
            drawingEngine.removeStroke(i)
            break
          }
        }
      } catch (err) {
        console.log('WASM not ready yet:', err)
      }
      return
    }
    
    if (tool === "select") {
      // Keep existing select logic for now
      if (selectedStrokes.size > 0 && selectionStart == null && selectionEnd == null) {
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
      setSelectionStart(mouse)
      setSelectionEnd(null)
      setIsDragging(false)
      setDragStart(null)
    } else {
      try {
        // Start new stroke in WASM
        const wasmColor = hexToWasmColor(currentColor)
        const wasmStroke: WASMStroke = {
          points: [mouse],
          color: wasmColor,
          thickness: currentThickness
        }
        drawingEngine.addStroke(wasmStroke)
      } catch (err) {
        console.log('WASM not ready yet:', err)
        return
      }
      
      // Also keep in React state for immediate UI feedback
      setCurrentStroke({
        points: [mouse],
        color: currentColor,
        thickness: currentThickness
      })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isLoaded) return
    
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    console.log(tool)
    
    if (tool === "erase" && e.buttons) {
      try {
        const wasmStrokes = drawingEngine.getStrokes()
        for (let i = wasmStrokes.length - 1; i >= 0; i--) {
          const stroke = wasmStrokes[i]
          const reactStroke = wasmStrokeToReact(stroke)
          if (isPointNearStroke(mouse, reactStroke)) {
            drawingEngine.removeStroke(i)
            break
          }
        }
      } catch (err) {
        console.log('WASM not ready yet:', err)
      }
      return
    }
    
    if (tool === "select") {
      if (isDragging && dragStart) {
        try {
          const dx = mouse.x - dragStart.x
          const dy = mouse.y - dragStart.y
          selectedStrokes.forEach(index => {
            drawingEngine.moveStroke(index, dx, dy)
          })
        } catch (err) {
          console.log('WASM not ready yet:', err)
        }
        setDragStart(mouse)
      } else if (selectionStart) {
        setSelectionEnd(mouse)
      }
    } else if (currentStroke) {
      try {
        console.log("STROKES",strokes)
      // Add point to current stroke in WASM
      const strokeIndex = drawingEngine.getStrokes().length - 1
      drawingEngine.addPointToStroke(strokeIndex, mouse)
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

  const handlePointerUp = () => {
    if (tool === "select") {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
      } else if (selectionStart && selectionEnd) {
        try {
          const x1 = Math.min(selectionStart.x, selectionEnd.x);
          const y1 = Math.min(selectionStart.y, selectionEnd.y);
          const x2 = Math.max(selectionStart.x, selectionEnd.x);
          const y2 = Math.max(selectionStart.y, selectionEnd.y);

          const selected = new Set<number>();
          const wasmStrokes = drawingEngine.getStrokes();
          wasmStrokes.forEach((stroke, i) => {
            if (stroke.points.some(pt => pt && isPointInRect(pt, x1, y1, x2, y2))) {
              selected.add(i);
            }
          });
          setSelectedStrokes(selected);
        } catch (err) {
          console.log('WASM not ready yet:', err)
        }
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    } else if (currentStroke && currentStroke.points.length > 0) {
      try {
        // --- PATCH START ---
        // Ensure the last point is added to the WASM stroke
        const wasmStrokes = drawingEngine.getStrokes();
        const strokeIndex = wasmStrokes.length - 1;
        const lastPoint = currentStroke.points[currentStroke.points.length - 1];

        if (
          wasmStrokes[strokeIndex] &&
          Array.isArray(wasmStrokes[strokeIndex].points) &&
          (
            wasmStrokes[strokeIndex].points.length === 0 ||
            (
              wasmStrokes[strokeIndex].points[wasmStrokes[strokeIndex].points.length - 1] &&
              (
                wasmStrokes[strokeIndex].points[wasmStrokes[strokeIndex].points.length - 1].x !== lastPoint.x ||
                wasmStrokes[strokeIndex].points[wasmStrokes[strokeIndex].points.length - 1].y !== lastPoint.y
              )
            )
          )
        ) {
          drawingEngine.addPointToStroke(strokeIndex, lastPoint);
        }
        // --- PATCH END ---
      } catch (err) {
        console.log('WASM not ready yet:', err)
      }

      setCurrentStroke(null);

      // Re-fetch strokes from WASM to update the UI
      if (isLoaded) {
        try {
          const updatedStrokes = drawingEngine.getStrokes();
          const reactStrokes = updatedStrokes.map(wasmStrokeToReact);
          setStrokes(reactStrokes);
        } catch (err) {
          console.log('WASM not ready yet:', err)
        }
      }
    }
  };

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

  // Draw all strokes + current stroke + selection rectangle
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

    // Draw selection rectangle if in select mode
    if (tool === "select" && selectionStart && selectionEnd) {
      ctx.save()
      ctx.strokeStyle = "rgba(0, 120, 255, 0.8)"
      ctx.setLineDash([6])
      ctx.lineWidth = 2
      ctx.strokeRect(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x - selectionStart.x,
        selectionEnd.y - selectionStart.y
      )
      ctx.restore()
    }
  }, [strokes, currentStroke, tool, selectionStart, selectionEnd, selectedStrokes])

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
          Color:{" "}
          <input
            type="color"
            value={currentColor}
            onChange={e => setCurrentColor(e.target.value)}
          />
        </label>
        <label style={{ marginLeft: "1em" }}>
          Thickness:{" "}
          <input
            type="range"
            min={1}
            max={20}
            value={currentThickness}
            onChange={e => setCurrentThickness(Number(e.target.value))}
          />
          <span style={{ marginLeft: 8 }}>{currentThickness}px</span>
        </label>
        <label>
          Export as:{" "}
          <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'png' | 'svg')}>
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
        </label>
        <button onClick={() => setTool("draw")}>Draw</button>
        <button onClick={() => setTool("select")}>Select</button>
        <button onClick={() => setTool("erase")}>Eraser</button>
        <button
          onClick={() => {
            setStrokes(strokes => strokes.filter((_, i) => !selectedStrokes.has(i)))
            setSelectedStrokes(new Set())
          }}
          disabled={selectedStrokes.size === 0}
        >
          Delete Selected
        </button>
        <button onClick={handleExport}>Save</button>
        <button onClick={() => {
          if (drawingEngine) {
            drawingEngine.clear()
            setSelectedStrokes(new Set())
          }
        }}>Clear All</button>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '2px solid #333', background: 'white', cursor: tool === "select" ? "pointer" : tool === "erase" ? "not-allowed" : "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </>
  )
}