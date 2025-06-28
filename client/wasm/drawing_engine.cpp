#include "drawing_engine.hpp"
#include <cmath>
#include <sstream>
#include <iomanip>
#include <algorithm>

/**
 * @brief Constructor - initializes the drawing engine with default settings
 * 
 * Sets up default drawing style with black color, 1px line width,
 * and initializes all internal buffers and state variables.
 */
DrawingEngine::DrawingEngine() {
    // Initialize with default drawing style
    currentStyle = DrawingStyle();
    pathActive = false;
    
    // Clear all buffers
    currentPath.clear();
    commandHistory.clear();
    redoStack.clear();
    strokeBuffer.clear();
}

/**
 * @brief Destructor - cleans up resources
 * 
 * Currently no dynamic memory to clean up, but provides
 * a clean interface for future resource management.
 */
DrawingEngine::~DrawingEngine() {
    // Clean up any resources if needed in the future
}

// ===== STYLE MANAGEMENT =====

/**
 * @brief Set the current drawing color
 * @param r Red component (0.0-1.0)
 * @param g Green component (0.0-1.0)
 * @param b Blue component (0.0-1.0)
 * @param a Alpha component (0.0-1.0)
 */
void DrawingEngine::setColor(float r, float g, float b, float a) {
    currentStyle.color = glm::vec4(
        std::clamp(r, 0.0f, 1.0f),
        std::clamp(g, 0.0f, 1.0f),
        std::clamp(b, 0.0f, 1.0f),
        std::clamp(a, 0.0f, 1.0f)
    );
}

/**
 * @brief Set the current line width
 * @param width Line width in pixels
 */
void DrawingEngine::setLineWidth(float width) {
    currentStyle.lineWidth = std::max(0.0f, width);
}

/**
 * @brief Set whether shapes should be filled
 * @param fill True to fill shapes, false for outline only
 */
void DrawingEngine::setFill(bool fill) {
    currentStyle.fill = fill;
}

/**
 * @brief Set line cap style
 * @param cap Style: "butt", "round", or "square"
 */
void DrawingEngine::setLineCap(const std::string& cap) {
    if (cap == "butt" || cap == "round" || cap == "square") {
        currentStyle.lineCap = cap;
    }
}

/**
 * @brief Set line join style
 * @param join Style: "miter", "round", or "bevel"
 */
void DrawingEngine::setLineJoin(const std::string& join) {
    if (join == "miter" || join == "round" || join == "bevel") {
        currentStyle.lineJoin = join;
    }
}

// ===== DRAWING PRIMITIVES =====

/**
 * @brief Draw a line segment
 * @param x1 Start X coordinate
 * @param y1 Start Y coordinate
 * @param x2 End X coordinate
 * @param y2 End Y coordinate
 */
void DrawingEngine::drawLine(float x1, float y1, float x2, float y2) {
    std::vector<Point2D> points = {
        Point2D(x1, y1),
        Point2D(x2, y2)
    };
    
    DrawingCommand command(PrimitiveType::LINE, points, currentStyle);
    addCommand(command);
    
    // Add to stroke buffer for real-time rendering
    addPointToStrokeBuffer(Point2D(x1, y1));
    addPointToStrokeBuffer(Point2D(x2, y2));
}

/**
 * @brief Draw a rectangle
 * @param x Top-left X coordinate
 * @param y Top-left Y coordinate
 * @param width Rectangle width
 * @param height Rectangle height
 */
void DrawingEngine::drawRectangle(float x, float y, float width, float height) {
    std::vector<Point2D> points = {
        Point2D(x, y),
        Point2D(x + width, y),
        Point2D(x + width, y + height),
        Point2D(x, y + height),
        Point2D(x, y)  // Close the rectangle
    };
    
    DrawingCommand command(PrimitiveType::RECTANGLE, points, currentStyle);
    addCommand(command);
}

/**
 * @brief Draw a circle
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param radius Circle radius
 */
void DrawingEngine::drawCircle(float centerX, float centerY, float radius) {
    const int segments = 32;  // Number of line segments to approximate circle
    std::vector<Point2D> points;
    
    for (int i = 0; i <= segments; ++i) {
        float angle = 2.0f * M_PI * i / segments;
        float x = centerX + radius * cos(angle);
        float y = centerY + radius * sin(angle);
        points.push_back(Point2D(x, y));
    }
    
    DrawingCommand command(PrimitiveType::CIRCLE, points, currentStyle);
    addCommand(command);
}

/**
 * @brief Draw an ellipse
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param radiusX Horizontal radius
 * @param radiusY Vertical radius
 */
void DrawingEngine::drawEllipse(float centerX, float centerY, float radiusX, float radiusY) {
    const int segments = 32;  // Number of line segments to approximate ellipse
    std::vector<Point2D> points;
    
    for (int i = 0; i <= segments; ++i) {
        float angle = 2.0f * M_PI * i / segments;
        float x = centerX + radiusX * cos(angle);
        float y = centerY + radiusY * sin(angle);
        points.push_back(Point2D(x, y));
    }
    
    DrawingCommand command(PrimitiveType::ELLIPSE, points, currentStyle);
    addCommand(command);
}

// ===== PATH MANAGEMENT =====

/**
 * @brief Start a new path
 */
void DrawingEngine::beginPath() {
    currentPath.clear();
    pathActive = true;
}

/**
 * @brief Move to a point without drawing
 * @param x X coordinate
 * @param y Y coordinate
 */
void DrawingEngine::moveTo(float x, float y) {
    if (!pathActive) {
        beginPath();
    }
    currentPath.push_back(Point2D(x, y));
}

/**
 * @brief Draw a line to a point
 * @param x X coordinate
 * @param y Y coordinate
 */
void DrawingEngine::lineTo(float x, float y) {
    if (!pathActive) {
        beginPath();
    }
    currentPath.push_back(Point2D(x, y));
}

/**
 * @brief Draw a quadratic curve
 * @param controlX Control point X
 * @param controlY Control point Y
 * @param endX End point X
 * @param endY End point Y
 */
void DrawingEngine::quadraticCurveTo(float controlX, float controlY, float endX, float endY) {
    if (!pathActive || currentPath.empty()) {
        return;
    }
    
    // Approximate quadratic curve with line segments
    const int segments = 10;
    Point2D start = currentPath.back();
    Point2D control(controlX, controlY);
    Point2D end(endX, endY);
    
    for (int i = 1; i <= segments; ++i) {
        float t = static_cast<float>(i) / segments;
        float x = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * control.x + t * t * end.x;
        float y = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * control.y + t * t * end.y;
        currentPath.push_back(Point2D(x, y));
    }
}

/**
 * @brief Draw a bezier curve
 * @param control1X First control point X
 * @param control1Y First control point Y
 * @param control2X Second control point X
 * @param control2Y Second control point Y
 * @param endX End point X
 * @param endY End point Y
 */
void DrawingEngine::bezierCurveTo(float control1X, float control1Y, float control2X, float control2Y, float endX, float endY) {
    if (!pathActive || currentPath.empty()) {
        return;
    }
    
    // Approximate cubic bezier curve with line segments
    const int segments = 10;
    Point2D start = currentPath.back();
    Point2D control1(control1X, control1Y);
    Point2D control2(control2X, control2Y);
    Point2D end(endX, endY);
    
    for (int i = 1; i <= segments; ++i) {
        float t = static_cast<float>(i) / segments;
        float x = (1 - t) * (1 - t) * (1 - t) * start.x + 
                  3 * (1 - t) * (1 - t) * t * control1.x + 
                  3 * (1 - t) * t * t * control2.x + 
                  t * t * t * end.x;
        float y = (1 - t) * (1 - t) * (1 - t) * start.y + 
                  3 * (1 - t) * (1 - t) * t * control1.y + 
                  3 * (1 - t) * t * t * control2.y + 
                  t * t * t * end.y;
        currentPath.push_back(Point2D(x, y));
    }
}

/**
 * @brief Close the current path
 */
void DrawingEngine::closePath() {
    if (pathActive && !currentPath.empty()) {
        currentPath.push_back(currentPath.front());
    }
}

/**
 * @brief Stroke the current path
 */
void DrawingEngine::stroke() {
    if (pathActive && currentPath.size() >= 2) {
        DrawingCommand command(PrimitiveType::PATH, currentPath, currentStyle);
        addCommand(command);
        pathActive = false;
    }
}

/**
 * @brief Fill the current path
 */
void DrawingEngine::fill() {
    if (pathActive && currentPath.size() >= 3) {
        DrawingStyle fillStyle = currentStyle;
        fillStyle.fill = true;
        DrawingCommand command(PrimitiveType::PATH, currentPath, fillStyle);
        addCommand(command);
        pathActive = false;
    }
}

// ===== CANVAS MANAGEMENT =====

/**
 * @brief Clear the entire canvas
 */
void DrawingEngine::clear() {
    // Clear all buffers
    currentPath.clear();
    strokeBuffer.clear();
    pathActive = false;
    
    // Add a clear command to history
    std::vector<Point2D> emptyPoints;
    DrawingStyle clearStyle = currentStyle;
    DrawingCommand command(PrimitiveType::LINE, emptyPoints, clearStyle);
    addCommand(command);
}

/**
 * @brief Get the current drawing buffer as a vector of floats
 * @return Vector containing all drawing commands for rendering
 */
std::vector<float> DrawingEngine::getDrawingBuffer() const {
    std::vector<float> buffer;
    
    for (const auto& command : commandHistory) {
        // Add command type
        buffer.push_back(static_cast<float>(command.type));
        
        // Add style information
        buffer.push_back(command.style.color.r);
        buffer.push_back(command.style.color.g);
        buffer.push_back(command.style.color.b);
        buffer.push_back(command.style.color.a);
        buffer.push_back(command.style.lineWidth);
        buffer.push_back(command.style.fill ? 1.0f : 0.0f);
        
        // Add point count
        buffer.push_back(static_cast<float>(command.points.size()));
        
        // Add all points
        for (const auto& point : command.points) {
            buffer.push_back(point.x);
            buffer.push_back(point.y);
        }
    }
    
    return buffer;
}

/**
 * @brief Get the stroke buffer for real-time drawing
 * @return Vector containing current stroke data
 */
std::vector<float> DrawingEngine::getStrokeBuffer() const {
    return strokeBuffer;
}

/**
 * @brief Clear the stroke buffer
 */
void DrawingEngine::clearStrokeBuffer() {
    strokeBuffer.clear();
}

// ===== UNDO/REDO =====

/**
 * @brief Save current state for undo
 */
void DrawingEngine::saveState() {
    // This would typically save the current canvas state
    // For now, we'll just ensure we have a command to undo
    if (!commandHistory.empty()) {
        // State is automatically saved when commands are added
    }
}

/**
 * @brief Undo the last drawing command
 * @return True if undo was successful, false if no commands to undo
 */
bool DrawingEngine::undo() {
    if (commandHistory.empty()) {
        return false;
    }
    
    DrawingCommand lastCommand = commandHistory.back();
    commandHistory.pop_back();
    redoStack.push_back(lastCommand);
    
    return true;
}

/**
 * @brief Redo the last undone command
 * @return True if redo was successful, false if no commands to redo
 */
bool DrawingEngine::redo() {
    if (redoStack.empty()) {
        return false;
    }
    
    DrawingCommand commandToRedo = redoStack.back();
    redoStack.pop_back();
    commandHistory.push_back(commandToRedo);
    
    return true;
}

// ===== UTILITY FUNCTIONS =====

/**
 * @brief Convert hex color string to RGBA values
 * @param hexColor Hex color string (e.g., "#FF0000")
 * @return Vector of 4 floats representing RGBA values
 */
std::vector<float> DrawingEngine::hexToRgba(const std::string& hexColor) {
    std::vector<float> rgba = {0.0f, 0.0f, 0.0f, 1.0f};
    
    if (hexColor.length() >= 7 && hexColor[0] == '#') {
        std::string hex = hexColor.substr(1);
        
        if (hex.length() == 6) {
            // Parse RGB
            unsigned int rgb = std::stoul(hex, nullptr, 16);
            rgba[0] = ((rgb >> 16) & 0xFF) / 255.0f;  // Red
            rgba[1] = ((rgb >> 8) & 0xFF) / 255.0f;   // Green
            rgba[2] = (rgb & 0xFF) / 255.0f;          // Blue
        } else if (hex.length() == 8) {
            // Parse RGBA
            unsigned int rgba_int = std::stoul(hex, nullptr, 16);
            rgba[0] = ((rgba_int >> 24) & 0xFF) / 255.0f;  // Red
            rgba[1] = ((rgba_int >> 16) & 0xFF) / 255.0f;  // Green
            rgba[2] = ((rgba_int >> 8) & 0xFF) / 255.0f;   // Blue
            rgba[3] = (rgba_int & 0xFF) / 255.0f;          // Alpha
        }
    }
    
    return rgba;
}

/**
 * @brief Get the current drawing style
 * @return Current DrawingStyle object
 */
DrawingStyle DrawingEngine::getCurrentStyle() const {
    return currentStyle;
}

// ===== PRIVATE HELPER METHODS =====

/**
 * @brief Add a drawing command to history
 * @param command The command to add
 */
void DrawingEngine::addCommand(const DrawingCommand& command) {
    commandHistory.push_back(command);
    redoStack.clear();  // Clear redo stack when new command is added
}

/**
 * @brief Calculate distance between two points
 * @param p1 First point
 * @param p2 Second point
 * @return Distance between points
 */
float DrawingEngine::distance(const Point2D& p1, const Point2D& p2) const {
    float dx = p2.x - p1.x;
    float dy = p2.y - p1.y;
    return sqrt(dx * dx + dy * dy);
}

/**
 * @brief Convert point to stroke buffer format
 * @param point Point to convert
 */
void DrawingEngine::addPointToStrokeBuffer(const Point2D& point) {
    // Add point coordinates
    strokeBuffer.push_back(point.x);
    strokeBuffer.push_back(point.y);
    
    // Add current style information
    strokeBuffer.push_back(currentStyle.color.r);
    strokeBuffer.push_back(currentStyle.color.g);
    strokeBuffer.push_back(currentStyle.color.b);
    strokeBuffer.push_back(currentStyle.color.a);
    strokeBuffer.push_back(currentStyle.lineWidth);
}

