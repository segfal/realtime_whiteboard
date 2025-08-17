// WebGPU type declarations (these will be available in browsers that support WebGPU)
declare global {
  interface Navigator {
    gpu?: {
      requestAdapter(): Promise<GPUAdapter | null>
      getPreferredCanvasFormat(): GPUTextureFormat
    }
  }
  
  interface GPUAdapter {
    requestDevice(): Promise<GPUDevice>
  }
  
  interface GPUDevice {
    createBuffer(): GPUBuffer
  }
  
  interface GPUBuffer {}
  
  interface GPUCanvasContext {
    configure(config: any): void
  }
  
  type GPUTextureFormat = string
}

export interface WebGPUState {
  adapter: GPUAdapter | null
  device: GPUDevice | null
  context: GPUCanvasContext | null
  format: GPUTextureFormat | null
} 