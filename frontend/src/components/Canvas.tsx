import { useRef, useState, useEffect } from 'react'

type Point = { x: number; y: number }
type Stroke = { points: Point[]; color: string; thickness: number }

export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentColor, setCurrentColor] = useState<string>("#000000")
  const [currentThickness, setCurrentThickness] = useState<number>(2)
  // Add 'erase' to the tool state
  const [tool, setTool] = useState<"draw" | "select" | "erase">("draw")
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null)
  const [selectedStrokes, setSelectedStrokes] = useState<Set<number>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [exportFormat, setExportFormat] = useState<'png' | 'svg'>('png')

  // Helper: Check if a point is inside a rectangle
  const isPointInRect = (pt: Point, x1: number, y1: number, x2: number, y2: number) =>
    pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2

  // Helper: Check if a point is near a stroke (for erasing)
  const isPointNearStroke = (pt: Point, stroke: Stroke, threshold = 8) => {
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const a = stroke.points[i]
      const b = stroke.points[i + 1]
      // Distance from pt to segment ab
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

  // Mouse events
  const handlePointerDown = (e: React.PointerEvent) => {
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    if (tool === "erase") {
      // On eraser down, remove any stroke near the pointer
      setStrokes(strokes =>
        strokes.filter(stroke => !isPointNearStroke(mouse, stroke))
      )
      return
    }
    if (tool === "select") {
      // If already have a selection and click inside it, start dragging
      if (
        selectedStrokes.size > 0 &&
        selectionStart == null &&
        selectionEnd == null
      ) {
        // Check if click is inside any selected stroke's bounding box
        let inside = false
        strokes.forEach((stroke, i) => {
          if (selectedStrokes.has(i)) {
            for (const pt of stroke.points) {
              if (
                isPointInRect(
                  mouse,
                  pt.x - 5, pt.y - 5, pt.x + 5, pt.y + 5 // small area around point
                )
              ) {
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
      // Otherwise, start a new selection rectangle
      setSelectionStart(mouse)
      setSelectionEnd(null)
      setIsDragging(false)
      setDragStart(null)
    } else {
      setCurrentStroke({
        points: [mouse],
        color: currentColor,
        thickness: currentThickness
      })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const mouse = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    if (tool === "erase" && e.buttons) {
      // On eraser drag, remove any stroke near the pointer
      setStrokes(strokes =>
        strokes.filter(stroke => !isPointNearStroke(mouse, stroke))
      )
      return
    }
    if (tool === "select") {
      if (isDragging && dragStart) {
        // Calculate offset
        const dx = mouse.x - dragStart.x
        const dy = mouse.y - dragStart.y
        setStrokes(strokes =>
          strokes.map((stroke, i) =>
            selectedStrokes.has(i)
              ? {
                  ...stroke,
                  points: stroke.points.map(pt => ({
                    x: pt.x + dx,
                    y: pt.y + dy
                  }))
                }
              : stroke
          )
        )
        setDragStart(mouse)
      } else if (selectionStart) {
        setSelectionEnd(mouse)
      }
    } else if (currentStroke) {
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
        setIsDragging(false)
        setDragStart(null)
      } else if (selectionStart && selectionEnd) {
        // Calculate selection rectangle
        const x1 = Math.min(selectionStart.x, selectionEnd.x)
        const y1 = Math.min(selectionStart.y, selectionEnd.y)
        const x2 = Math.max(selectionStart.x, selectionEnd.x)
        const y2 = Math.max(selectionStart.y, selectionEnd.y)
        // Find strokes with any point inside the rectangle
        const selected = new Set<number>()
        strokes.forEach((stroke, i) => {
          if (stroke.points.some(pt => isPointInRect(pt, x1, y1, x2, y2))) {
            selected.add(i)
          }
        })
        setSelectedStrokes(selected)
        setSelectionStart(null)
        setSelectionEnd(null)
      }
    } else if (currentStroke && currentStroke.points.length > 0) {
      setStrokes(prev => [...prev, currentStroke])
      setCurrentStroke(null)
    }
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

  // Draw all strokes + current stroke + selection rectangle
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all strokes (highlight selected)
    strokes.forEach((stroke, i) => {
      ctx.save()
      ctx.strokeStyle = selectedStrokes.has(i) ? "rgba(0, 255, 0, 0.8)" : stroke.color
      ctx.lineWidth = stroke.thickness
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.forEach(pt => ctx.lineTo(pt.x, pt.y))
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