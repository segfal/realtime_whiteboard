#include "Canvas.hpp"

Canvas::Canvas(unsigned int width, unsigned int height, GLFWwindow* window)
    : width(width), height(height), currentThickness(2.0f), colorPicker(window), isDrawing(false) {
    // Initialize current color to black
    currentColor = {0.0f, 0.0f, 0.0f, 1.0f};
    // Start with an empty line
    startNewLine();
}

Canvas::~Canvas() {
    // Clean up any OpenGL resources if needed
}

void Canvas::draw() {
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

    // Draw the color picker on top of the canvas
    colorPicker.draw();
}

void Canvas::addPoint(float x, float y, const std::array<float, 4>& color, float thickness) {
    points.push_back(x);
    points.push_back(y);
    
    // Add color components
    for (float c : color) {
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

void Canvas::handleMouseClick(float mouseX, float mouseY) {
    // First check if the click is on the color picker
    if (colorPicker.isMouseOver(mouseX, mouseY)) {
        colorPicker.handleMouseClick(mouseX, mouseY);
        // Update current color if color picker is open
        if (colorPicker.getIsOpen()) {
            currentColor = colorPicker.getColor();
        }
        return;
    }

    // If not clicking on color picker, handle drawing
    if (!isDrawing) {
        isDrawing = true;
        startNewLine();
        addPoint(mouseX, mouseY, currentColor, currentThickness);
    }
}

void Canvas::handleMouseDrag(float mouseX, float mouseY) {
    // First check if we're dragging on the color picker
    if (colorPicker.getIsOpen() && colorPicker.isMouseOver(mouseX, mouseY)) {
        colorPicker.handleMouseDrag(mouseX, mouseY);
        // Update current color while dragging
        currentColor = colorPicker.getColor();
        return;
    }

    // If not dragging on color picker, handle drawing
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

