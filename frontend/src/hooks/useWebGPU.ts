
import { useEffect, useState } from 'react'
import type { WebGPUState } from '../types/webgpu'

export const useWebGPU = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [state, setState] = useState<WebGPUState>({
    adapter: null,
    device: null,
    context: null,
    format: null
  })

  useEffect(() => {
    const initWebGPU = async () => {
      if (!canvasRef.current) return

      try {
        // Check if WebGPU is supported
        if (!navigator.gpu) {
          console.warn('WebGPU not supported')
          return
        }

        // Request adapter
        const adapter = await navigator.gpu?.requestAdapter()
        if (!adapter) {
          console.warn('No WebGPU adapter found')
          return
        }

        // Request device
        const device = await adapter.requestDevice()

        // Get canvas context
        const canvas = canvasRef.current
        // TypeScript fix: cast to unknown first, then to GPUCanvasContext
        const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext
        if (!context) {
          console.warn('WebGPU context not available')
          return
        }

        // Get preferred format
        const format = navigator.gpu.getPreferredCanvasFormat()

        // Configure context
        context.configure({
          device,
          format,
          alphaMode: 'premultiplied'
        })

        setState({ adapter, device, context, format })
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error)
      }
    }

    initWebGPU()
  }, [canvasRef])

  return state
}