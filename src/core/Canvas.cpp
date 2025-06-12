#include "Canvas.h"
#include <GLFW/glfw3.h>
#include <glad/glad.h>
#include <cmath>

namespace whiteboard {

Canvas::Canvas(int width, int height) : width_(width), height_(height) {}
Canvas::~Canvas() {}

void Canvas::clear(float r, float g, float b, float a) {
    glClearColor(r, g, b, a);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void Canvas::drawLine(float x1, float y1, float x2, float y2, float width, float r, float g, float b, float a) {
    glLineWidth(width);
    glColor4f(r, g, b, a);
    glBegin(GL_LINES);
    glVertex2f(x1, y1);
    glVertex2f(x2, y2);
    glEnd();
}

void Canvas::drawRectangle(float x, float y, float w, float h, float strokeWidth, float r, float g, float b, float a) {
    glLineWidth(strokeWidth);
    glColor4f(r, g, b, a);
    glBegin(GL_LINE_LOOP);
    glVertex2f(x, y);
    glVertex2f(x + w, y);
    glVertex2f(x + w, y + h);
    glVertex2f(x, y + h);
    glEnd();
}

void Canvas::drawCircle(float cx, float cy, float radius, float strokeWidth, float r, float g, float b, float a) {
    glLineWidth(strokeWidth);
    glColor4f(r, g, b, a);
    glBegin(GL_LINE_LOOP);
    for (int i = 0; i < 64; ++i) {
        float theta = 2.0f * 3.1415926f * float(i) / 64.0f;
        float dx = radius * cosf(theta);
        float dy = radius * sinf(theta);
        glVertex2f(cx + dx, cy + dy);
    }
    glEnd();
}

void Canvas::drawText(float x, float y, const std::string& text, float fontSize, float r, float g, float b, float a) {
    // Text rendering in OpenGL is non-trivial; stub for now
}

void Canvas::render() {
    // All drawing is immediate mode for now
}

void Canvas::resize(int width, int height) {
    width_ = width;
    height_ = height;
    glViewport(0, 0, width, height);
}

} // namespace whiteboard 