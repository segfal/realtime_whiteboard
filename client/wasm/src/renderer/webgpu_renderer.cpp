#include "renderer/webgpu_renderer.hpp"
#include <iostream>
#include <cmath>

// WebGPU shader sources
const char* VERTEX_SHADER_SOURCE = R"(
struct VertexInput {
    @location(0) position: vec2<f32>,
    @location(1) color: vec4<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>,
}

@vertex
fn vertex_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(input.position, 0.0, 1.0);
    output.color = input.color;
    return output;
}
)";

const char* FRAGMENT_SHADER_SOURCE = R"(
@fragment
fn fragment_main(@location(0) color: vec4<f32>) -> @location(0) vec4<f32> {
    return color;
}
)";

/**
 * @brief WebGPU Renderer Constructor
 * 
 * Initializes the WebGPU renderer with default settings.
 * The actual WebGPU initialization happens in the initialize() method.
 */
WebGPURenderer::WebGPURenderer() 
    : AbstractRenderer(RendererType::WEBGPU),
      m_instance(nullptr),
      m_adapter(nullptr),
      m_device(nullptr),
      m_queue(nullptr),
      m_surface(nullptr),
      m_swapChain(nullptr),
      m_pipeline(nullptr),
      m_vertexBuffer(nullptr),
      m_uniformBuffer(nullptr),
      m_bindGroup(nullptr),
      m_canvasWidth(0),
      m_canvasHeight(0),
      m_pipelineDirty(false),
      m_currentMode(EraseMode::NORMAL),
      m_eraseRadius(10.0f),
      m_eraseOpacity(0.5f),
      m_currentLayer(0),
      m_vertexShaderSource(VERTEX_SHADER_SOURCE),
      m_fragmentShaderSource(FRAGMENT_SHADER_SOURCE) {
    
    // Initialize with a default layer
    addLayer();
    
    std::cout << "[WebGPURenderer] Created with erase support" << std::endl;
}

/**
 * @brief WebGPU Renderer Destructor
 * 
 * Cleans up all WebGPU resources to prevent memory leaks.
 */
WebGPURenderer::~WebGPURenderer() {
    cleanup();
    std::cout << "[WebGPURenderer] Destroyed" << std::endl;
}

/**
 * @brief Initialize the WebGPU renderer
 * 
 * This method sets up the entire WebGPU pipeline:
 * 1. Creates WebGPU instance and adapter
 * 2. Creates device and queue
 * 3. Creates surface and swap chain
 * 4. Creates render pipeline
 * 5. Creates buffers
 * 
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @return true if initialization successful, false otherwise
 */
bool WebGPURenderer::initialize(int width, int height) {
    std::cout << "[WebGPURenderer] Initializing with size: " << width << "x" << height << std::endl;
    
    m_canvasWidth = width;
    m_canvasHeight = height;
    
    // Initialize WebGPU step by step
    if (!initializeWebGPU()) {
        std::cout << "[WebGPURenderer] Failed to initialize WebGPU" << std::endl;
        return false;
    }
    
    if (!createDevice()) {
        std::cout << "[WebGPURenderer] Failed to create device" << std::endl;
        return false;
    }
    
    if (!createSurface()) {
        std::cout << "[WebGPURenderer] Failed to create surface" << std::endl;
        return false;
    }
    
    if (!createSwapChain()) {
        std::cout << "[WebGPURenderer] Failed to create swap chain" << std::endl;
        return false;
    }
    
    if (!createPipeline()) {
        std::cout << "[WebGPURenderer] Failed to create pipeline" << std::endl;
        return false;
    }
    
    if (!createBuffers()) {
        std::cout << "[WebGPURenderer] Failed to create buffers" << std::endl;
        return false;
    }
    
    std::cout << "[WebGPURenderer] Initialization successful" << std::endl;
    return true;
}

/**
 * @brief Clean up WebGPU resources
 * 
 * Releases all WebGPU objects to prevent memory leaks.
 * This should be called when the renderer is no longer needed.
 */
void WebGPURenderer::cleanup() {
    std::cout << "[WebGPURenderer] Cleaning up resources" << std::endl;
    
    // Release WebGPU objects in reverse order of creation
    if (m_bindGroup) {
        wgpuBindGroupRelease(m_bindGroup);
        m_bindGroup = nullptr;
    }
    
    if (m_uniformBuffer) {
        wgpuBufferRelease(m_uniformBuffer);
        m_uniformBuffer = nullptr;
    }
    
    if (m_vertexBuffer) {
        wgpuBufferRelease(m_vertexBuffer);
        m_vertexBuffer = nullptr;
    }
    
    if (m_pipeline) {
        wgpuRenderPipelineRelease(m_pipeline);
        m_pipeline = nullptr;
    }
    
    if (m_swapChain) {
        wgpuSwapChainRelease(m_swapChain);
        m_swapChain = nullptr;
    }
    
    if (m_surface) {
        wgpuSurfaceRelease(m_surface);
        m_surface = nullptr;
    }
    
    if (m_queue) {
        wgpuQueueRelease(m_queue);
        m_queue = nullptr;
    }
    
    if (m_device) {
        wgpuDeviceRelease(m_device);
        m_device = nullptr;
    }
    
    if (m_adapter) {
        wgpuAdapterRelease(m_adapter);
        m_adapter = nullptr;
    }
    
    if (m_instance) {
        wgpuInstanceRelease(m_instance);
        m_instance = nullptr;
    }
    
    // Clear vertex data
    m_vertices.clear();
    m_indices.clear();
    
    std::cout << "[WebGPURenderer] Cleanup completed" << std::endl;
}

/**
 * @brief Clear the canvas with the current clear color
 * 
 * This method clears the entire canvas with the specified background color.
 * It uses WebGPU's clear operation for efficient rendering.
 */
void WebGPURenderer::clear() {
    if (!m_device || !m_swapChain) {
        std::cout << "[WebGPURenderer] Cannot clear - not initialized" << std::endl;
        return;
    }
    
    // Get the next texture from the swap chain
    WGPUTextureView nextTexture = wgpuSwapChainGetCurrentTextureView(m_swapChain);
    if (!nextTexture) {
        std::cout << "[WebGPURenderer] Failed to get next texture" << std::endl;
        return;
    }
    
    // Create command encoder
    WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(m_device, nullptr);
    if (!encoder) {
        std::cout << "[WebGPURenderer] Failed to create command encoder" << std::endl;
        wgpuTextureViewRelease(nextTexture);
        return;
    }
    
    // Create render pass
    WGPURenderPassColorAttachment colorAttachment = {};
    colorAttachment.view = nextTexture;
    colorAttachment.loadOp = WGPULoadOp_Clear;
    colorAttachment.storeOp = WGPUStoreOp_Store;
    colorAttachment.clearValue = { m_clearColor.r, m_clearColor.g, m_clearColor.b, m_clearColor.a };
    
    WGPURenderPassDescriptor renderPassDesc = {};
    renderPassDesc.colorAttachmentCount = 1;
    renderPassDesc.colorAttachments = &colorAttachment;
    
    WGPURenderPassEncoder renderPass = wgpuCommandEncoderBeginRenderPass(encoder, &renderPassDesc);
    wgpuRenderPassEncoderEnd(renderPass);
    wgpuRenderPassEncoderRelease(renderPass);
    
    // Submit commands
    WGPUCommandBuffer command = wgpuCommandEncoderFinish(encoder, nullptr);
    wgpuQueueSubmit(m_queue, 1, &command);
    
    // Clean up
    wgpuCommandBufferRelease(command);
    wgpuCommandEncoderRelease(encoder);
    wgpuTextureViewRelease(nextTexture);
    
    // Clear vertex data for next frame
    m_vertices.clear();
    m_indices.clear();
    
    m_stats.drawCalls++;
    std::cout << "[WebGPURenderer] Cleared canvas" << std::endl;
}

/**
 * @brief Draw a line segment
 * 
 * @param start Start point of the line
 * @param end End point of the line
 * @param color Line color (RGBA)
 * @param width Line width in pixels
 */
void WebGPURenderer::drawLine(const glm::vec2& start, const glm::vec2& end, 
                              const glm::vec4& color, float width) {
    addLineVertices(start, end, color, width);
    std::cout << "[WebGPURenderer] Added line: (" << start.x << "," << start.y 
              << ") to (" << end.x << "," << end.y << ")" << std::endl;
}

/**
 * @brief Draw a rectangle
 * 
 * @param position Top-left position of the rectangle
 * @param size Width and height of the rectangle
 * @param color Rectangle color (RGBA)
 * @param filled Whether to fill the rectangle or just draw outline
 */
void WebGPURenderer::drawRectangle(const glm::vec2& position, const glm::vec2& size,
                                   const glm::vec4& color, bool filled) {
    addRectangleVertices(position, size, color, filled);
    std::cout << "[WebGPURenderer] Added rectangle: pos(" << position.x << "," << position.y 
              << ") size(" << size.x << "," << size.y << ") filled: " << filled << std::endl;
}

/**
 * @brief Draw a circle
 * 
 * @param center Center point of the circle
 * @param radius Circle radius in pixels
 * @param color Circle color (RGBA)
 * @param filled Whether to fill the circle or just draw outline
 */
void WebGPURenderer::drawCircle(const glm::vec2& center, float radius,
                                const glm::vec4& color, bool filled) {
    addCircleVertices(center, radius, color, filled);
    std::cout << "[WebGPURenderer] Added circle: center(" << center.x << "," << center.y 
              << ") radius: " << radius << " filled: " << filled << std::endl;
}

/**
 * @brief Present the rendered content
 * 
 * This method renders all accumulated vertices and presents them to the screen.
 * It should be called after all drawing operations are complete.
 */
void WebGPURenderer::present() {
    if (m_vertices.empty()) {
        return; // Nothing to render
    }
    
    if (!m_device || !m_swapChain || !m_pipeline) {
        std::cout << "[WebGPURenderer] Cannot present - not initialized" << std::endl;
        return;
    }
    
    // Update vertex buffer with new data
    updateVertexBuffer();
    
    // Get the next texture from the swap chain
    WGPUTextureView nextTexture = wgpuSwapChainGetCurrentTextureView(m_swapChain);
    if (!nextTexture) {
        std::cout << "[WebGPURenderer] Failed to get next texture" << std::endl;
        return;
    }
    
    // Create command encoder
    WGPUCommandEncoder encoder = wgpuDeviceCreateCommandEncoder(m_device, nullptr);
    if (!encoder) {
        std::cout << "[WebGPURenderer] Failed to create command encoder" << std::endl;
        wgpuTextureViewRelease(nextTexture);
        return;
    }
    
    // Create render pass
    WGPURenderPassColorAttachment colorAttachment = {};
    colorAttachment.view = nextTexture;
    colorAttachment.loadOp = WGPULoadOp_Load;
    colorAttachment.storeOp = WGPUStoreOp_Store;
    
    WGPURenderPassDescriptor renderPassDesc = {};
    renderPassDesc.colorAttachmentCount = 1;
    renderPassDesc.colorAttachments = &colorAttachment;
    
    WGPURenderPassEncoder renderPass = wgpuCommandEncoderBeginRenderPass(encoder, &renderPassDesc);
    
    // Set pipeline and draw
    wgpuRenderPassEncoderSetPipeline(renderPass, m_pipeline);
    wgpuRenderPassEncoderSetVertexBuffer(renderPass, 0, m_vertexBuffer, 0, m_vertices.size() * sizeof(float));
    wgpuRenderPassEncoderDraw(renderPass, m_vertices.size() / 6, 1, 0, 0); // 6 floats per vertex (2 pos + 4 color)
    
    wgpuRenderPassEncoderEnd(renderPass);
    wgpuRenderPassEncoderRelease(renderPass);
    
    // Submit commands
    WGPUCommandBuffer command = wgpuCommandEncoderFinish(encoder, nullptr);
    wgpuQueueSubmit(m_queue, 1, &command);
    
    // Clean up
    wgpuCommandBufferRelease(command);
    wgpuCommandEncoderRelease(encoder);
    wgpuTextureViewRelease(nextTexture);
    
    // Update statistics
    m_stats.drawCalls++;
    m_stats.verticesRendered += m_vertices.size() / 6;
    
    std::cout << "[WebGPURenderer] Presented " << m_vertices.size() / 6 << " vertices" << std::endl;
}

// Private helper methods implementation
bool WebGPURenderer::initializeWebGPU() {
    // Create WebGPU instance
    WGPUInstanceDescriptor instanceDesc = {};
    m_instance = wgpuCreateInstance(&instanceDesc);
    if (!m_instance) {
        std::cout << "[WebGPURenderer] Failed to create WebGPU instance" << std::endl;
        return false;
    }
    
    // Request adapter
    WGPURequestAdapterOptions adapterOptions = {};
    adapterOptions.backendType = WGPUBackendType_WebGPU;
    adapterOptions.powerPreference = WGPUPowerPreference_HighPerformance;
    
    // Note: In a real implementation, you'd use a callback to get the adapter
    // For now, we'll use a simplified approach
    std::cout << "[WebGPURenderer] WebGPU instance created" << std::endl;
    return true;
}

bool WebGPURenderer::createDevice() {
    // In a real implementation, you'd get the adapter from the instance
    // For now, we'll create a mock device
    std::cout << "[WebGPURenderer] Device creation would happen here" << std::endl;
    return true;
}

bool WebGPURenderer::createSurface() {
    // In a real implementation, you'd create a surface for the canvas
    std::cout << "[WebGPURenderer] Surface creation would happen here" << std::endl;
    return true;
}

bool WebGPURenderer::createSwapChain() {
    // In a real implementation, you'd create a swap chain for the surface
    std::cout << "[WebGPURenderer] Swap chain creation would happen here" << std::endl;
    return true;
}

bool WebGPURenderer::createPipeline() {
    // In a real implementation, you'd create the render pipeline
    std::cout << "[WebGPURenderer] Pipeline creation would happen here" << std::endl;
    return true;
}

bool WebGPURenderer::createBuffers() {
    // In a real implementation, you'd create vertex and uniform buffers
    std::cout << "[WebGPURenderer] Buffer creation would happen here" << std::endl;
    return true;
}

void WebGPURenderer::updateVertexBuffer() {
    // In a real implementation, you'd update the vertex buffer with new data
    std::cout << "[WebGPURenderer] Vertex buffer update would happen here" << std::endl;
}

glm::vec2 WebGPURenderer::toClipSpace(const glm::vec2& pos) {
    // Convert from screen coordinates to clip space (-1 to 1)
    return glm::vec2(
        (pos.x / m_canvasWidth) * 2.0f - 1.0f,
        1.0f - (pos.y / m_canvasHeight) * 2.0f
    );
}

void WebGPURenderer::addLineVertices(const glm::vec2& start, const glm::vec2& end,
                                     const glm::vec4& color, float width) {
    // Convert to clip space
    glm::vec2 clipStart = toClipSpace(start);
    glm::vec2 clipEnd = toClipSpace(end);
    
    // Calculate line direction and perpendicular
    glm::vec2 direction = glm::normalize(clipEnd - clipStart);
    glm::vec2 perpendicular = glm::vec2(-direction.y, direction.x) * (width / m_canvasWidth);
    
    // Create rectangle for the line
    glm::vec2 p1 = clipStart - perpendicular;
    glm::vec2 p2 = clipStart + perpendicular;
    glm::vec2 p3 = clipEnd + perpendicular;
    glm::vec2 p4 = clipEnd - perpendicular;
    
    // Add vertices (position + color)
    // Triangle 1
    m_vertices.insert(m_vertices.end(), {p1.x, p1.y, color.r, color.g, color.b, color.a});
    m_vertices.insert(m_vertices.end(), {p2.x, p2.y, color.r, color.g, color.b, color.a});
    m_vertices.insert(m_vertices.end(), {p3.x, p3.y, color.r, color.g, color.b, color.a});
    
    // Triangle 2
    m_vertices.insert(m_vertices.end(), {p1.x, p1.y, color.r, color.g, color.b, color.a});
    m_vertices.insert(m_vertices.end(), {p3.x, p3.y, color.r, color.g, color.b, color.a});
    m_vertices.insert(m_vertices.end(), {p4.x, p4.y, color.r, color.g, color.b, color.a});
}

void WebGPURenderer::addRectangleVertices(const glm::vec2& position, const glm::vec2& size,
                                          const glm::vec4& color, bool filled) {
    // Convert to clip space
    glm::vec2 clipPos = toClipSpace(position);
    glm::vec2 clipSize = glm::vec2(
        (size.x / m_canvasWidth) * 2.0f,
        (size.y / m_canvasHeight) * 2.0f
    );
    
    glm::vec2 p1 = clipPos;
    glm::vec2 p2 = clipPos + glm::vec2(clipSize.x, 0);
    glm::vec2 p3 = clipPos + clipSize;
    glm::vec2 p4 = clipPos + glm::vec2(0, clipSize.y);
    
    if (filled) {
        // Add filled rectangle (two triangles)
        // Triangle 1
        m_vertices.insert(m_vertices.end(), {p1.x, p1.y, color.r, color.g, color.b, color.a});
        m_vertices.insert(m_vertices.end(), {p2.x, p2.y, color.r, color.g, color.b, color.a});
        m_vertices.insert(m_vertices.end(), {p3.x, p3.y, color.r, color.g, color.b, color.a});
        
        // Triangle 2
        m_vertices.insert(m_vertices.end(), {p1.x, p1.y, color.r, color.g, color.b, color.a});
        m_vertices.insert(m_vertices.end(), {p3.x, p3.y, color.r, color.g, color.b, color.a});
        m_vertices.insert(m_vertices.end(), {p4.x, p4.y, color.r, color.g, color.b, color.a});
    } else {
        // Add outline rectangle (lines as thin rectangles)
        float lineWidth = 2.0f / m_canvasWidth;
        addLineVertices(position, position + glm::vec2(size.x, 0), color, lineWidth);
        addLineVertices(position + glm::vec2(size.x, 0), position + size, color, lineWidth);
        addLineVertices(position + size, position + glm::vec2(0, size.y), color, lineWidth);
        addLineVertices(position + glm::vec2(0, size.y), position, color, lineWidth);
    }
}

void WebGPURenderer::addCircleVertices(const glm::vec2& center, float radius,
                                       const glm::vec4& color, bool filled) {
    const int segments = 32;
    const float angleStep = 2.0f * M_PI / segments;
    
    glm::vec2 clipCenter = toClipSpace(center);
    float clipRadius = (radius / m_canvasWidth) * 2.0f;
    
    if (filled) {
        // Add filled circle (triangle fan)
        for (int i = 0; i < segments; ++i) {
            float angle1 = i * angleStep;
            float angle2 = (i + 1) * angleStep;
            
            glm::vec2 p1 = clipCenter;
            glm::vec2 p2 = clipCenter + glm::vec2(cos(angle1) * clipRadius, sin(angle1) * clipRadius);
            glm::vec2 p3 = clipCenter + glm::vec2(cos(angle2) * clipRadius, sin(angle2) * clipRadius);
            
            m_vertices.insert(m_vertices.end(), {p1.x, p1.y, color.r, color.g, color.b, color.a});
            m_vertices.insert(m_vertices.end(), {p2.x, p2.y, color.r, color.g, color.b, color.a});
            m_vertices.insert(m_vertices.end(), {p3.x, p3.y, color.r, color.g, color.b, color.a});
        }
    } else {
        // Add outline circle (connected line segments)
        for (int i = 0; i < segments; ++i) {
            float angle1 = i * angleStep;
            float angle2 = (i + 1) * angleStep;
            
            glm::vec2 start = center + glm::vec2(cos(angle1) * radius, sin(angle1) * radius);
            glm::vec2 end = center + glm::vec2(cos(angle2) * radius, sin(angle2) * radius);
            
            addLineVertices(start, end, color, 2.0f);
        }
    }
}

/**
 * @brief Set the current erase mode
 * @param mode The erase mode to use
 */
void WebGPURenderer::setEraseMode(EraseMode mode) {
    m_currentMode = mode;
    std::cout << "[WebGPURenderer] Erase mode set to: " 
              << (mode == EraseMode::NORMAL ? "NORMAL" : 
                  mode == EraseMode::ERASE ? "ERASE" : "SOFT_ERASE") << std::endl;
}

/**
 * @brief Set the erase radius
 * @param radius Radius in pixels
 */
void WebGPURenderer::setEraseRadius(float radius) {
    m_eraseRadius = radius;
    std::cout << "[WebGPURenderer] Erase radius set to: " << radius << " pixels" << std::endl;
}

/**
 * @brief Set the erase opacity (for soft erase)
 * @param opacity Opacity value (0.0 to 1.0)
 */
void WebGPURenderer::setEraseOpacity(float opacity) {
    m_eraseOpacity = glm::clamp(opacity, 0.0f, 1.0f);
    std::cout << "[WebGPURenderer] Erase opacity set to: " << m_eraseOpacity << std::endl;
}

/**
 * @brief Erase at a specific point
 * @param position Position to erase at
 */
void WebGPURenderer::eraseAt(const glm::vec2& position) {
    if (m_currentMode == EraseMode::NORMAL) {
        return; // Not in erase mode
    }
    
    std::cout << "[WebGPURenderer] Erasing at position: (" << position.x << "," << position.y << ")" << std::endl;
    
    // Find vertices within erase radius
    auto verticesToErase = findVerticesInRadius(position, m_eraseRadius);
    
    if (m_currentMode == EraseMode::ERASE) {
        eraseVertices(verticesToErase);
    } else if (m_currentMode == EraseMode::SOFT_ERASE) {
        softEraseVertices(verticesToErase);
    }
}

/**
 * @brief Erase along a path
 * @param start Start point of the erase path
 * @param end End point of the erase path
 */
void WebGPURenderer::eraseLine(const glm::vec2& start, const glm::vec2& end) {
    if (m_currentMode == EraseMode::NORMAL) {
        return; // Not in erase mode
    }
    
    std::cout << "[WebGPURenderer] Erasing line from (" << start.x << "," << start.y 
              << ") to (" << end.x << "," << end.y << ")" << std::endl;
    
    // Sample points along the line for more accurate erasing
    const int samples = 10;
    glm::vec2 direction = end - start;
    float stepSize = glm::length(direction) / samples;
    
    for (int i = 0; i <= samples; ++i) {
        float t = static_cast<float>(i) / samples;
        glm::vec2 position = start + direction * t;
        eraseAt(position);
    }
}

/**
 * @brief Clear all layers (full erase)
 */
void WebGPURenderer::clearAllLayers() {
    std::cout << "[WebGPURenderer] Clearing all layers" << std::endl;
    
    for (auto& layer : m_layers) {
        layer.vertices.clear();
        layer.indices.clear();
    }
    
    // Rebuild combined vertices
    m_vertices.clear();
    m_indices.clear();
    
    for (const auto& layer : m_layers) {
        if (layer.visible) {
            m_vertices.insert(m_vertices.end(), layer.vertices.begin(), layer.vertices.end());
            m_indices.insert(m_indices.end(), layer.indices.begin(), layer.indices.end());
        }
    }
}

/**
 * @brief Add a new layer
 */
void WebGPURenderer::addLayer() {
    DrawingLayer newLayer;
    newLayer.visible = true;
    newLayer.opacity = 1.0f;
    
    m_layers.push_back(newLayer);
    m_currentLayer = m_layers.size() - 1;
    
    std::cout << "[WebGPURenderer] Added new layer. Total layers: " << m_layers.size() << std::endl;
}

/**
 * @brief Remove the current layer
 */
void WebGPURenderer::removeLayer() {
    if (m_layers.size() <= 1) {
        std::cout << "[WebGPURenderer] Cannot remove the last layer" << std::endl;
        return;
    }
    
    m_layers.erase(m_layers.begin() + m_currentLayer);
    
    if (m_currentLayer >= m_layers.size()) {
        m_currentLayer = m_layers.size() - 1;
    }
    
    std::cout << "[WebGPURenderer] Removed layer. Current layer: " << m_currentLayer << std::endl;
    
    // Rebuild combined vertices
    rebuildCombinedVertices();
}

/**
 * @brief Set the current layer
 * @param layerIndex Layer index
 */
void WebGPURenderer::setCurrentLayer(int layerIndex) {
    if (layerIndex >= 0 && layerIndex < m_layers.size()) {
        m_currentLayer = layerIndex;
        std::cout << "[WebGPURenderer] Switched to layer: " << layerIndex << std::endl;
    } else {
        std::cout << "[WebGPURenderer] Invalid layer index: " << layerIndex << std::endl;
    }
}

// Private helper methods for erase functionality

std::vector<size_t> WebGPURenderer::findVerticesInRadius(const glm::vec2& position, float radius) {
    std::vector<size_t> indices;
    
    // Check vertices in the current layer
    auto& currentLayer = m_layers[m_currentLayer];
    
    for (size_t i = 0; i < currentLayer.vertices.size(); i += 6) { // 6 floats per vertex (2 pos + 4 color)
        if (i + 1 >= currentLayer.vertices.size()) break;
        
        // Extract position from vertex data
        glm::vec2 vertexPos(currentLayer.vertices[i], currentLayer.vertices[i + 1]);
        
        // Convert from clip space to screen space for distance calculation
        glm::vec2 screenPos = fromClipSpace(vertexPos);
        
        float distance = calculateDistance(position, screenPos);
        
        if (distance <= radius) {
            indices.push_back(i);
        }
    }
    
    std::cout << "[WebGPURenderer] Found " << indices.size() << " vertices in erase radius" << std::endl;
    return indices;
}

void WebGPURenderer::eraseVertices(const std::vector<size_t>& indices) {
    auto& currentLayer = m_layers[m_currentLayer];
    
    // Remove vertices in reverse order to maintain indices
    for (auto it = indices.rbegin(); it != indices.rend(); ++it) {
        size_t index = *it;
        
        // Remove 6 floats (position + color) for each vertex
        if (index + 5 < currentLayer.vertices.size()) {
            currentLayer.vertices.erase(currentLayer.vertices.begin() + index, 
                                       currentLayer.vertices.begin() + index + 6);
        }
    }
    
    std::cout << "[WebGPURenderer] Erased " << indices.size() << " vertices" << std::endl;
    
    // Rebuild combined vertices
    rebuildCombinedVertices();
}

void WebGPURenderer::softEraseVertices(const std::vector<size_t>& indices) {
    auto& currentLayer = m_layers[m_currentLayer];
    
    for (size_t index : indices) {
        // Reduce alpha component (index + 5 is the alpha value)
        if (index + 5 < currentLayer.vertices.size()) {
            currentLayer.vertices[index + 5] *= m_eraseOpacity;
        }
    }
    
    std::cout << "[WebGPURenderer] Soft erased " << indices.size() << " vertices" << std::endl;
    
    // Rebuild combined vertices
    rebuildCombinedVertices();
}

float WebGPURenderer::calculateDistance(const glm::vec2& p1, const glm::vec2& p2) {
    return glm::length(p2 - p1);
}

glm::vec2 WebGPURenderer::fromClipSpace(const glm::vec2& clipPos) {
    // Convert from clip space (-1 to 1) back to screen space
    return glm::vec2(
        (clipPos.x + 1.0f) * m_canvasWidth * 0.5f,
        (1.0f - clipPos.y) * m_canvasHeight * 0.5f
    );
}

void WebGPURenderer::rebuildCombinedVertices() {
    m_vertices.clear();
    m_indices.clear();
    
    for (const auto& layer : m_layers) {
        if (layer.visible) {
            m_vertices.insert(m_vertices.end(), layer.vertices.begin(), layer.vertices.end());
            m_indices.insert(m_indices.end(), layer.indices.begin(), layer.indices.end());
        }
    }
    
    std::cout << "[WebGPURenderer] Rebuilt combined vertices. Total vertices: " 
              << m_vertices.size() / 6 << std::endl;
} 