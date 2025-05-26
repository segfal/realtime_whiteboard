#include "Canvas.hpp"

Canvas::Canvas(unsigned int width, unsigned int height)
    : width(width), height(height), currentThickness(2.0f) {
    // Initialize current color to black
    currentColor = {0.0f, 0.0f, 0.0f, 1.0f};
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

    // Draw all points
    for (size_t i = 0; i < points.size(); i += 2) {
        if (i + 1 < points.size()) {
            glLineWidth(thicknesses[i/2]);
            glBegin(GL_LINES);
            glColor4fv(&colors[i*2]);
            glVertex2f(points[i], points[i+1]);
            if (i + 3 < points.size()) {
                glVertex2f(points[i+2], points[i+3]);
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
}

void Canvas::setColor(const std::array<float, 4>& color) {
    currentColor = color;
}

void Canvas::setThickness(float thickness) {
    currentThickness = thickness;
} 