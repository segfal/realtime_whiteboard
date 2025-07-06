#pragma once

#include <vector>
#include <memory>
#include <string>
#include <chrono>
#include <glm/glm.hpp>

/**
 * @brief Statistics structure for renderer performance monitoring
 */
struct RendererStats {
    uint32_t drawCalls = 0;
    uint32_t verticesRendered = 0;
    uint32_t trianglesRendered = 0;
    float frameTime = 0.0f;
};

/**
 * @brief Enumeration of supported rendering backends
 */
enum class RendererType {
    OPENGL,
    SDL,
    WEBGPU,
    NONE
};

/**
 * @brief Vertex structure for rendering primitives
 */
struct Vertex {
    glm::vec2 position;    ///< 2D position (x, y)
    glm::vec4 color;       ///< RGBA color (0.0-1.0 range)
    float lineWidth;       ///< Line width for line primitives
    
    Vertex(const glm::vec2& pos = glm::vec2(0.0f), 
           const glm::vec4& col = glm::vec4(1.0f),
           float width = 1.0f)
        : position(pos), color(col), lineWidth(width) {}
};

/**
 * @brief Drawing primitive types for rendering
 */
enum class PrimitiveType {
    POINTS,         ///< Individual points
    LINES,          ///< Line segments
    LINE_STRIP,     ///< Connected line segments
    TRIANGLES,      ///< Triangle primitives
    TRIANGLE_FAN    ///< Connected triangles
};

/**
 * @brief Abstract base class for all rendering backends
 * 
 * This class defines the interface that all concrete renderers must implement.
 * It uses the Strategy pattern to allow different rendering implementations
 * to be swapped at runtime.
 */
class AbstractRenderer {
protected:
    int m_width;
    int m_height;
    glm::vec4 m_clearColor;
    RendererStats m_stats;
    RendererType m_type;

public:
    /**
     * @brief Constructor
     * @param type The type of renderer
     */
    explicit AbstractRenderer(RendererType type) : m_width(0), m_height(0), 
        m_clearColor(0.0f, 0.0f, 0.0f, 1.0f), m_type(type) {}

    /**
     * @brief Virtual destructor
     */
    virtual ~AbstractRenderer() = default;

    /**
     * @brief Initialize the renderer
     * @param width Canvas width
     * @param height Canvas height
     * @return true if successful, false otherwise
     */
    virtual bool initialize(int width, int height) = 0;

    /**
     * @brief Clean up resources
     */
    virtual void cleanup() = 0;

    /**
     * @brief Set the clear color
     * @param r Red component (0.0-1.0)
     * @param g Green component (0.0-1.0)
     * @param b Blue component (0.0-1.0)
     * @param a Alpha component (0.0-1.0)
     */
    virtual void setClearColor(float r, float g, float b, float a) {
        m_clearColor = glm::vec4(r, g, b, a);
    }

    /**
     * @brief Clear the canvas
     */
    virtual void clear() = 0;

    /**
     * @brief Draw a line
     * @param start Start point
     * @param end End point
     * @param color Line color
     * @param width Line width
     */
    virtual void drawLine(const glm::vec2& start, const glm::vec2& end, 
                         const glm::vec4& color, float width) = 0;

    /**
     * @brief Draw a rectangle
     * @param position Top-left position
     * @param size Rectangle size
     * @param color Rectangle color
     * @param filled Whether to fill the rectangle
     */
    virtual void drawRectangle(const glm::vec2& position, const glm::vec2& size,
                              const glm::vec4& color, bool filled) = 0;

    /**
     * @brief Draw a circle
     * @param center Circle center
     * @param radius Circle radius
     * @param color Circle color
     * @param filled Whether to fill the circle
     */
    virtual void drawCircle(const glm::vec2& center, float radius,
                           const glm::vec4& color, bool filled) = 0;

    /**
     * @brief Present the rendered content
     */
    virtual void present() = 0;

    /**
     * @brief Get renderer statistics
     * @return Current statistics
     */
    virtual RendererStats getStats() const {
        return m_stats;
    }

    /**
     * @brief Reset statistics
     */
    virtual void resetStats() {
        m_stats = RendererStats{};
    }

    /**
     * @brief Get the renderer type
     * @return Renderer type
     */
    RendererType getType() const {
        return m_type;
    }

    /**
     * @brief Get canvas dimensions
     * @return Pair of width and height
     */
    std::pair<int, int> getDimensions() const {
        return {m_width, m_height};
    }
}; 