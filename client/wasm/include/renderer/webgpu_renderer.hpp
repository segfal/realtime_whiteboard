#pragma once

#include "abstract_renderer.hpp"
#include <webgpu/webgpu.h>
#include <vector>
#include <memory>

/**
 * @brief WebGPU Renderer for modern GPU-accelerated rendering
 * 
 * This renderer uses WebGPU (via Emscripten) to provide hardware-accelerated
 * rendering in the browser. WebGPU is the modern successor to WebGL and
 * provides better performance and more features.
 * 
 * Key features:
 * - Hardware acceleration via GPU
 * - Modern shader pipeline
 * - Efficient batch rendering
 * - Support for complex geometries
 * - Erase functionality with different modes
 * 
 * Documentation:
 * - WebGPU Spec: https://www.w3.org/TR/webgpu/
 * - Emscripten WebGPU: https://emscripten.org/docs/porting/webgpu.html
 * - Dawn WebGPU: https://dawn.googlesource.com/dawn
 */
class WebGPURenderer : public AbstractRenderer {
public:
    enum class EraseMode {
        NORMAL,     // Normal drawing mode
        ERASE,      // Erase mode - clears areas
        SOFT_ERASE  // Soft erase - reduces opacity
    };

private:
    // WebGPU objects
    WGPUInstance m_instance;
    WGPUAdapter m_adapter;
    WGPUDevice m_device;
    WGPUQueue m_queue;
    WGPUSurface m_surface;
    WGPUSwapChain m_swapChain;
    WGPURenderPipeline m_pipeline;
    WGPUBuffer m_vertexBuffer;
    WGPUBuffer m_uniformBuffer;
    WGPUBindGroup m_bindGroup;
    
    // Canvas properties
    int m_canvasWidth;
    int m_canvasHeight;
    
    // Rendering state
    std::vector<float> m_vertices;
    std::vector<uint32_t> m_indices;
    bool m_pipelineDirty;
    
    // Erase functionality
    EraseMode m_currentMode;
    float m_eraseRadius;
    float m_eraseOpacity;
    
    // Layer management for erase
    struct DrawingLayer {
        std::vector<float> vertices;
        std::vector<uint32_t> indices;
        bool visible;
        float opacity;
    };
    
    std::vector<DrawingLayer> m_layers;
    int m_currentLayer;
    
    // Shader sources
    const char* m_vertexShaderSource;
    const char* m_fragmentShaderSource;

public:
    /**
     * @brief Constructor
     */
    WebGPURenderer();
    
    /**
     * @brief Destructor
     */
    ~WebGPURenderer();

    // AbstractRenderer interface implementation
    bool initialize(int width, int height) override;
    void cleanup() override;
    void clear() override;
    void drawLine(const glm::vec2& start, const glm::vec2& end, 
                  const glm::vec4& color, float width) override;
    void drawRectangle(const glm::vec2& position, const glm::vec2& size,
                       const glm::vec4& color, bool filled) override;
    void drawCircle(const glm::vec2& center, float radius,
                    const glm::vec4& color, bool filled) override;
    void present() override;

    // Erase functionality
    /**
     * @brief Set the current erase mode
     * @param mode The erase mode to use
     */
    void setEraseMode(EraseMode mode);
    
    /**
     * @brief Get the current erase mode
     * @return Current erase mode
     */
    EraseMode getEraseMode() const { return m_currentMode; }
    
    /**
     * @brief Set the erase radius
     * @param radius Radius in pixels
     */
    void setEraseRadius(float radius);
    
    /**
     * @brief Get the current erase radius
     * @return Current erase radius
     */
    float getEraseRadius() const { return m_eraseRadius; }
    
    /**
     * @brief Set the erase opacity (for soft erase)
     * @param opacity Opacity value (0.0 to 1.0)
     */
    void setEraseOpacity(float opacity);
    
    /**
     * @brief Get the current erase opacity
     * @return Current erase opacity
     */
    float getEraseOpacity() const { return m_eraseOpacity; }
    
    /**
     * @brief Erase at a specific point
     * @param position Position to erase at
     */
    void eraseAt(const glm::vec2& position);
    
    /**
     * @brief Erase along a path
     * @param start Start point of the erase path
     * @param end End point of the erase path
     */
    void eraseLine(const glm::vec2& start, const glm::vec2& end);
    
    /**
     * @brief Clear all layers (full erase)
     */
    void clearAllLayers();
    
    /**
     * @brief Add a new layer
     */
    void addLayer();
    
    /**
     * @brief Remove the current layer
     */
    void removeLayer();
    
    /**
     * @brief Set the current layer
     * @param layerIndex Layer index
     */
    void setCurrentLayer(int layerIndex);
    
    /**
     * @brief Get the current layer index
     * @return Current layer index
     */
    int getCurrentLayer() const { return m_currentLayer; }
    
    /**
     * @brief Get the number of layers
     * @return Number of layers
     */
    int getLayerCount() const { return m_layers.size(); }

private:
    /**
     * @brief Initialize WebGPU instance and adapter
     * @return true if successful
     */
    bool initializeWebGPU();
    
    /**
     * @brief Create WebGPU device
     * @return true if successful
     */
    bool createDevice();
    
    /**
     * @brief Create WebGPU surface for canvas
     * @return true if successful
     */
    bool createSurface();
    
    /**
     * @brief Create WebGPU swap chain
     * @return true if successful
     */
    bool createSwapChain();
    
    /**
     * @brief Create WebGPU render pipeline
     * @return true if successful
     */
    bool createPipeline();
    
    /**
     * @brief Create vertex buffer
     * @return true if successful
     */
    bool createBuffers();
    
    /**
     * @brief Update vertex buffer with new data
     */
    void updateVertexBuffer();
    
    /**
     * @brief Convert 2D coordinates to clip space
     * @param pos 2D position
     * @return Clip space position
     */
    glm::vec2 toClipSpace(const glm::vec2& pos);
    
    /**
     * @brief Add vertices for a line
     * @param start Start point
     * @param end End point
     * @param color Line color
     * @param width Line width
     */
    void addLineVertices(const glm::vec2& start, const glm::vec2& end,
                         const glm::vec4& color, float width);
    
    /**
     * @brief Add vertices for a rectangle
     * @param position Top-left position
     * @param size Rectangle size
     * @param color Rectangle color
     * @param filled Whether to fill
     */
    void addRectangleVertices(const glm::vec2& position, const glm::vec2& size,
                              const glm::vec4& color, bool filled);
    
    /**
     * @brief Add vertices for a circle
     * @param center Circle center
     * @param radius Circle radius
     * @param color Circle color
     * @param filled Whether to fill
     */
    void addCircleVertices(const glm::vec2& center, float radius,
                           const glm::vec4& color, bool filled);
    
    // Erase helper methods
    /**
     * @brief Find vertices within erase radius
     * @param position Erase position
     * @param radius Erase radius
     * @return Vector of vertex indices to erase
     */
    std::vector<size_t> findVerticesInRadius(const glm::vec2& position, float radius);
    
    /**
     * @brief Erase vertices at specified indices
     * @param indices Vector of vertex indices to erase
     */
    void eraseVertices(const std::vector<size_t>& indices);
    
    /**
     * @brief Soft erase vertices (reduce opacity)
     * @param indices Vector of vertex indices to soft erase
     */
    void softEraseVertices(const std::vector<size_t>& indices);
    
    /**
     * @brief Calculate distance between two points
     * @param p1 First point
     * @param p2 Second point
     * @return Distance between points
     */
    float calculateDistance(const glm::vec2& p1, const glm::vec2& p2);
    
    /**
     * @brief Convert clip space back to screen space
     * @param clipPos Clip space position
     * @return Screen space position
     */
    glm::vec2 fromClipSpace(const glm::vec2& clipPos);
    
    /**
     * @brief Rebuild combined vertices from all visible layers
     */
    void rebuildCombinedVertices();
}; 