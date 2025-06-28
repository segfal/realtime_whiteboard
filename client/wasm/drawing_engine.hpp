#ifndef DRAWING_ENGINE_HPP
#define DRAWING_ENGINE_HPP

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <memory>
#include <string>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
// Optional: Include clipper for advanced geometric operations
// #include <clipper2/clipper.h>

/**
 * @brief Drawing primitive types supported by the engine
 */
enum class PrimitiveType {
    LINE,       ///< Straight line segment
    RECTANGLE,  ///< Rectangle shape
    CIRCLE,     ///< Circle shape
    ELLIPSE,    ///< Ellipse shape
    PATH        ///< Complex path with multiple segments
};

/**
 * @brief Drawing style configuration
 */
struct DrawingStyle {
    glm::vec4 color;     ///< RGBA color (0.0-1.0 range)
    float lineWidth;      ///< Line width in pixels
    bool fill;           ///< Whether to fill the shape
    std::string lineCap; ///< Line cap style: "butt", "round", "square"
    std::string lineJoin; ///< Line join style: "miter", "round", "bevel"
    
    DrawingStyle() : color(0.0f, 0.0f, 0.0f, 1.0f), lineWidth(1.0f), 
                     fill(false), lineCap("round"), lineJoin("round") {}
};

/**
 * @brief Point structure for 2D coordinates
 */
struct Point2D {
    float x, y;
    Point2D(float x = 0.0f, float y = 0.0f) : x(x), y(y) {}
};

/**
 * @brief Drawing command for undo/redo functionality
 */
struct DrawingCommand {
    PrimitiveType type;
    std::vector<Point2D> points;
    DrawingStyle style;
    std::vector<float> originalCanvasData; ///< Canvas state before command
    
    DrawingCommand(PrimitiveType t, const std::vector<Point2D>& pts, const DrawingStyle& s)
        : type(t), points(pts), style(s) {}
};

/**
 * @brief Main drawing engine class for WebAssembly integration
 * 
 * This class provides a comprehensive drawing API that can be called from JavaScript.
 * It supports various drawing primitives, path management, and real-time rendering.
 */
class DrawingEngine {
public:
    /**
     * @brief Constructor - initializes the drawing engine with default settings
     */
    DrawingEngine();

    /**
     * @brief Destructor - cleans up resources
     */
    ~DrawingEngine();

    // ===== STYLE MANAGEMENT =====
    
    /**
     * @brief Set the current drawing color
     * @param r Red component (0.0-1.0)
     * @param g Green component (0.0-1.0)
     * @param b Blue component (0.0-1.0)
     * @param a Alpha component (0.0-1.0)
     */
    void setColor(float r, float g, float b, float a);

    /**
     * @brief Set the current line width
     * @param width Line width in pixels
     */
    void setLineWidth(float width);

    /**
     * @brief Set whether shapes should be filled
     * @param fill True to fill shapes, false for outline only
     */
    void setFill(bool fill);

    /**
     * @brief Set line cap style
     * @param cap Style: "butt", "round", or "square"
     */
    void setLineCap(const std::string& cap);

    /**
     * @brief Set line join style
     * @param join Style: "miter", "round", or "bevel"
     */
    void setLineJoin(const std::string& join);

    // ===== DRAWING PRIMITIVES =====

    /**
     * @brief Draw a line segment
     * @param x1 Start X coordinate
     * @param y1 Start Y coordinate
     * @param x2 End X coordinate
     * @param y2 End Y coordinate
     */
    void drawLine(float x1, float y1, float x2, float y2);

    /**
     * @brief Draw a rectangle
     * @param x Top-left X coordinate
     * @param y Top-left Y coordinate
     * @param width Rectangle width
     * @param height Rectangle height
     */
    void drawRectangle(float x, float y, float width, float height);

    /**
     * @brief Draw a circle
     * @param centerX Center X coordinate
     * @param centerY Center Y coordinate
     * @param radius Circle radius
     */
    void drawCircle(float centerX, float centerY, float radius);

    /**
     * @brief Draw an ellipse
     * @param centerX Center X coordinate
     * @param centerY Center Y coordinate
     * @param radiusX Horizontal radius
     * @param radiusY Vertical radius
     */
    void drawEllipse(float centerX, float centerY, float radiusX, float radiusY);

    // ===== PATH MANAGEMENT =====

    /**
     * @brief Start a new path
     */
    void beginPath();

    /**
     * @brief Move to a point without drawing
     * @param x X coordinate
     * @param y Y coordinate
     */
    void moveTo(float x, float y);

    /**
     * @brief Draw a line to a point
     * @param x X coordinate
     * @param y Y coordinate
     */
    void lineTo(float x, float y);

    /**
     * @brief Draw a quadratic curve
     * @param controlX Control point X
     * @param controlY Control point Y
     * @param endX End point X
     * @param endY End point Y
     */
    void quadraticCurveTo(float controlX, float controlY, float endX, float endY);

    /**
     * @brief Draw a bezier curve
     * @param control1X First control point X
     * @param control1Y First control point Y
     * @param control2X Second control point X
     * @param control2Y Second control point Y
     * @param endX End point X
     * @param endY End point Y
     */
    void bezierCurveTo(float control1X, float control1Y, float control2X, float control2Y, float endX, float endY);

    /**
     * @brief Close the current path
     */
    void closePath();

    /**
     * @brief Stroke the current path
     */
    void stroke();

    /**
     * @brief Fill the current path
     */
    void fill();

    // ===== CANVAS MANAGEMENT =====

    /**
     * @brief Clear the entire canvas
     */
    void clear();

    /**
     * @brief Get the current drawing buffer as a vector of floats
     * @return Vector containing all drawing commands for rendering
     */
    std::vector<float> getDrawingBuffer() const;

    /**
     * @brief Get the stroke buffer for real-time drawing
     * @return Vector containing current stroke data
     */
    std::vector<float> getStrokeBuffer() const;

    /**
     * @brief Clear the stroke buffer
     */
    void clearStrokeBuffer();

    // ===== UNDO/REDO =====

    /**
     * @brief Save current state for undo
     */
    void saveState();

    /**
     * @brief Undo the last drawing command
     * @return True if undo was successful, false if no commands to undo
     */
    bool undo();

    /**
     * @brief Redo the last undone command
     * @return True if redo was successful, false if no commands to redo
     */
    bool redo();

    // ===== UTILITY FUNCTIONS =====

    /**
     * @brief Convert hex color string to RGBA values
     * @param hexColor Hex color string (e.g., "#FF0000")
     * @return Vector of 4 floats representing RGBA values
     */
    std::vector<float> hexToRgba(const std::string& hexColor);

    /**
     * @brief Get the current drawing style
     * @return Current DrawingStyle object
     */
    DrawingStyle getCurrentStyle() const;

private:
    DrawingStyle currentStyle;                    ///< Current drawing style
    std::vector<Point2D> currentPath;            ///< Current path points
    std::vector<DrawingCommand> commandHistory;  ///< Command history for undo/redo
    std::vector<DrawingCommand> redoStack;       ///< Redo stack
    std::vector<float> strokeBuffer;             ///< Buffer for real-time stroke data
    bool pathActive;                             ///< Whether a path is currently active

    /**
     * @brief Add a drawing command to history
     * @param command The command to add
     */
    void addCommand(const DrawingCommand& command);

    /**
     * @brief Calculate distance between two points
     * @param p1 First point
     * @param p2 Second point
     * @return Distance between points
     */
    float distance(const Point2D& p1, const Point2D& p2) const;

    /**
     * @brief Convert point to stroke buffer format
     * @param point Point to convert
     */
    void addPointToStrokeBuffer(const Point2D& point);
};

// ===== EMSCRIPTEN BINDINGS =====

/**
 * @brief WebAssembly bindings for the DrawingEngine class
 * 
 * This section exposes the C++ DrawingEngine methods to JavaScript
 * through Emscripten's binding system.
 */
EMSCRIPTEN_BINDINGS(DrawingEngineModule) {
    emscripten::class_<DrawingEngine>("DrawingEngine")
        .constructor<>()
        // Style management
        .function("setColor", &DrawingEngine::setColor)
        .function("setLineWidth", &DrawingEngine::setLineWidth)
        .function("setFill", &DrawingEngine::setFill)
        .function("setLineCap", &DrawingEngine::setLineCap)
        .function("setLineJoin", &DrawingEngine::setLineJoin)
        // Drawing primitives
        .function("drawLine", &DrawingEngine::drawLine)
        .function("drawRectangle", &DrawingEngine::drawRectangle)
        .function("drawCircle", &DrawingEngine::drawCircle)
        .function("drawEllipse", &DrawingEngine::drawEllipse)
        // Path management
        .function("beginPath", &DrawingEngine::beginPath)
        .function("moveTo", &DrawingEngine::moveTo)
        .function("lineTo", &DrawingEngine::lineTo)
        .function("quadraticCurveTo", &DrawingEngine::quadraticCurveTo)
        .function("bezierCurveTo", &DrawingEngine::bezierCurveTo)
        .function("closePath", &DrawingEngine::closePath)
        .function("stroke", &DrawingEngine::stroke)
        .function("fill", &DrawingEngine::fill)
        // Canvas management
        .function("clear", &DrawingEngine::clear)
        .function("getDrawingBuffer", &DrawingEngine::getDrawingBuffer)
        .function("getStrokeBuffer", &DrawingEngine::getStrokeBuffer)
        .function("clearStrokeBuffer", &DrawingEngine::clearStrokeBuffer)
        // Undo/Redo
        .function("saveState", &DrawingEngine::saveState)
        .function("undo", &DrawingEngine::undo)
        .function("redo", &DrawingEngine::redo)
        // Utility
        .function("hexToRgba", &DrawingEngine::hexToRgba)
        .function("getCurrentStyle", &DrawingEngine::getCurrentStyle);
};

#endif // DRAWING_ENGINE_HPP