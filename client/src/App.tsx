import { useEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  return (
    <div>
      <HexColorPicker color={color} onChange={onChange} />
      {console.log(color)}
    </div>
  )
}


interface CanvasProps {
  color: string;
  onChange: (color: string) => void;
  canvasRef: CanvasRef;
}
// canvas ref
interface CanvasRef {
  current: HTMLCanvasElement | null;
}

const Canvas: React.FC<CanvasProps> = ({ color, onChange, canvasRef }) => {
  return (
    <div>
      <canvas
        ref={canvasRef}
        width={1024}
        height={768}
        style={{
          display: "block",
          margin: "20px auto",
          backgroundColor: "white",
          border: "1px solid #ccc",
        }}
      />
    </div>
  )
}

interface WhiteboardProps {
  color: string;
  onChange: (color: string) => void;
  canvasRef: CanvasRef;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ color, onChange, canvasRef }) => {
  return (
    <div>
      <Canvas color={color} onChange={onChange} canvasRef={canvasRef} />
    </div>
  )
}

const App = () => {
  const [color, setColor] = useState("#000000");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setLastX(e.clientX);
    setLastY(e.clientY);
  }

  const handleMouseUp = () => {
    setIsDrawing(false);
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(e.clientX, e.clientY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.stroke();
      setLastX(e.clientX);
      setLastY(e.clientY);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("mouseup", handleMouseUp);
      canvas.addEventListener("mousemove", handleMouseMove);
    }
    return () => {
      canvas?.removeEventListener("mousedown", handleMouseDown);
      canvas?.removeEventListener("mouseup", handleMouseUp);
      canvas?.removeEventListener("mousemove", handleMouseMove);
    }
  }, [color, isDrawing, lastX, lastY, handleMouseDown, handleMouseUp, handleMouseMove]);

  return (
    <div>
      <h1>WHITEBOARD APP</h1>
      <ColorPicker color={color} onChange={setColor} />
      <Whiteboard color={color} onChange={setColor} canvasRef={canvasRef} />  
      <button onClick={() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }}>Clear</button>
      <button onClick={() => {
        if (canvasRef.current) {
          const dataURL = canvasRef.current.toDataURL();
          const link = document.createElement("a");
          link.href = dataURL;
          link.download = "whiteboard.png";
          link.click();
        }
      }}>Save</button> 
    </div>
  )
}

export default App;