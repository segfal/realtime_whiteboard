#include "Canvas.hpp"

Canvas::Canvas(unsigned int width, unsigned int height, GLFWwindow* window)
    : width(width), height(height), currentThickness(2.0f), 
      colorPicker(window), backgroundColorPicker(window), 
      isDrawing(false), isEraserMode(false), isBackgroundColorPickerOpen(false) {
    // Initialize background color to white
    backgroundColor = {1.0f, 1.0f, 1.0f, 1.0f};
    // Initialize current color to black (since background is white)
    currentColor = {0.0f, 0.0f, 0.0f, 1.0f};
    startNewLine();
}

Canvas::~Canvas() {
    // Clean up any OpenGL resources if needed
}

void Canvas::draw() {
    // Clear with background color
    glClearColor(backgroundColor[0], backgroundColor[1], 
                 backgroundColor[2], backgroundColor[3]);
    glClear(GL_COLOR_BUFFER_BIT);

    // Set up OpenGL state for drawing
    glEnable(GL_BLEND);
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    glEnable(GL_LINE_SMOOTH);
    glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);

    // Draw each line segment separately
    for (size_t i = 0; i < lineStarts.size(); ++i) {
        size_t start = lineStarts[i];
        size_t end = (i + 1 < lineStarts.size()) ? lineStarts[i + 1] : points.size();

        if (end - start >= 2) {  // Need at least 2 points for a line
            glLineWidth(thicknesses[start/2]);
            glBegin(GL_LINE_STRIP);
            for (size_t j = start; j < end; j += 2) {
                glColor4fv(&colors[j*2]);
                glVertex2f(points[j], points[j+1]);
            }
            glEnd();
        }
    }

    // Draw the color pickers if they're open
    if (colorPicker.getIsOpen()) {
        colorPicker.draw();
    }
    if (backgroundColorPicker.getIsOpen()) {
        backgroundColorPicker.draw();
    }
}

void Canvas::addPoint(float x, float y, const std::array<float, 4>& color, float thickness) {
    points.push_back(x);
    points.push_back(y);
    
    // If in eraser mode, use background color
    std::array<float, 4> drawColor = isEraserMode ? backgroundColor : color;
    
    for (float c : drawColor) {
        colors.push_back(c);
    }
    
    thicknesses.push_back(thickness);
}

void Canvas::clear() {
    points.clear();
    colors.clear();
    thicknesses.clear();
    lineStarts.clear();
    startNewLine();  // Start a new empty line after clearing
}

void Canvas::setColor(const std::array<float, 4>& color) {
    currentColor = color;
}

void Canvas::setThickness(float thickness) {
    currentThickness = thickness;
}

void Canvas::startNewLine() {
    lineStarts.push_back(points.size());
}

void Canvas::endLine() {
    isDrawing = false;
}

void Canvas::setBackgroundColor(const std::array<float, 4>& color) {
    backgroundColor = color;
    // If background is dark, set drawing color to white
    float brightness = (color[0] + color[1] + color[2]) / 3.0f;
    if (brightness < 0.5f) {
        currentColor = {1.0f, 1.0f, 1.0f, 1.0f};  // White
    } else {
        currentColor = {0.0f, 0.0f, 0.0f, 1.0f};  // Black
    }
}

std::array<float, 4> Canvas::getBackgroundColor() const {
    return backgroundColor;
}

void Canvas::toggleBackgroundColorPicker() {
    isBackgroundColorPickerOpen = !isBackgroundColorPickerOpen;
    backgroundColorPicker.setIsOpen(isBackgroundColorPickerOpen);
}

void Canvas::handleMouseClick(float mouseX, float mouseY) {
    // Check if click is on either color picker
    if (colorPicker.isMouseOver(mouseX, mouseY)) {
        colorPicker.handleMouseClick(mouseX, mouseY);
        if (colorPicker.getIsOpen()) {
            currentColor = colorPicker.getColor();
        }
        return;
    }
    if (backgroundColorPicker.isMouseOver(mouseX, mouseY)) {
        backgroundColorPicker.handleMouseClick(mouseX, mouseY);
        if (backgroundColorPicker.getIsOpen()) {
            setBackgroundColor(backgroundColorPicker.getColor());
        }
        return;
    }

    // If not clicking on color pickers, handle drawing
    if (!isDrawing) {
        isDrawing = true;
        startNewLine();
        addPoint(mouseX, mouseY, currentColor, currentThickness);
    }
}

void Canvas::handleMouseDrag(float mouseX, float mouseY) {
    // Check if dragging on either color picker
    if (colorPicker.getIsOpen() && colorPicker.isMouseOver(mouseX, mouseY)) {
        colorPicker.handleMouseDrag(mouseX, mouseY);
        currentColor = colorPicker.getColor();
        return;
    }
    if (backgroundColorPicker.getIsOpen() && backgroundColorPicker.isMouseOver(mouseX, mouseY)) {
        backgroundColorPicker.handleMouseDrag(mouseX, mouseY);
        setBackgroundColor(backgroundColorPicker.getColor());
        return;
    }

    // If not dragging on color pickers, handle drawing
    if (isDrawing) {
        addPoint(mouseX, mouseY, currentColor, currentThickness);
    }
}

bool Canvas::isColorPickerOpen() const {
    return colorPicker.getIsOpen();
}

void Canvas::toggleColorPicker() {
    colorPicker.setIsOpen(!colorPicker.getIsOpen());
}

bool Canvas::getisEraser() {
    return this->isEraserMode;
}

void Canvas::setisEraser() {
    isEraserMode = !isEraserMode;
}

