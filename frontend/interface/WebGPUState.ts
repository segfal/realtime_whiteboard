export interface WebGPUState {
    adapter: GPUAdapter | null
    device: GPUDevice | null
    context: GPUCanvasContext | null
    format: GPUTextureFormat | null
}