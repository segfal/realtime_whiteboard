#include "Canvas.hpp"

Canvas::Canvas(unsigned int width, unsigned int height)
    : width(width), height(height), currentThickness(2.0f) {
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
    // No need to do anything here, the next startNewLine() will handle it
} 