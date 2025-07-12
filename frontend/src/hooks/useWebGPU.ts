
import { useEffect, useRef, useState } from 'react'

interface WebGPUState {
  adapter: GPUAdapter | null
  device: GPUDevice | null
  context: GPUCanvasContext | null
  format: GPUTextureFormat | null
}

export const useWebGPU = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [webGPUState, setWebGPUState] = useState<WebGPUState>({
    adapter: null,
    device: null,
    context: null,
    format: null
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeWebGPU = async () => {
      try {
        const canvas = canvasRef.current
        if (!canvas) return

        // Get WebGPU adapter
        const adapter = await navigator.gpu?.requestAdapter()
        if (!adapter) {
          throw new Error('Failed to get WebGPU adapter')
        }

        // Get WebGPU device
        const device = await adapter.requestDevice()
        if (!device) {
          throw new Error('Failed to get WebGPU device')
        }

        // Get canvas context
        const context = canvas.getContext('webgpu')
        if (!context) {
          throw new Error('Failed to get WebGPU context')
        }

        // Get preferred format
        const format = navigator.gpu.getPreferredCanvasFormat()

        // Configure context
        context.configure({
          device,
          format,
          alphaMode: 'premultiplied',
        })

        setWebGPUState({ adapter, device, context, format })
        setIsInitialized(true)
        console.log('WebGPU initialized successfully!')

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('WebGPU initialization failed:', err)
      }
    }

    initializeWebGPU()
  }, [canvasRef])

  return { webGPUState, isInitialized, error }
}