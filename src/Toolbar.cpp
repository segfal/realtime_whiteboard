#define GL_SILENCE_DEPRECATION
#ifdef __APPLE__
#include <OpenGL/gl.h>
#else
#include <GL/gl.h>
#endif
#include "Toolbar.hpp"

Toolbar::Toolbar(GLFWwindow* window)
    : window(window), currentTool(Tool::BRUSH),
      x(0), y(0), width(60), height(400),
      buttonSize(48), buttonSpacing(10) {
    
    // Initialize tools with their labels
    tools = {
        {Tool::UNDO, "Undo"},
        {Tool::REDO, "Redo"},
        {Tool::BRUSH, "Brush"},
        {Tool::ERASER, "Eraser"},
        {Tool::COLOR_PICKER, "Color"},
        {Tool::BACKGROUND_FILL, "BG"}
    };
}

Toolbar::~Toolbar() {
    // Clean up if needed
}

void Toolbar::draw() {
    float buttonY = y + buttonSpacing;
    for (size_t i = 0; i < tools.size(); ++i) {
        drawButton(x + buttonSpacing, buttonY, buttonSize, tools[i].first, currentTool == tools[i].first);
        buttonY += buttonSize + buttonSpacing;
    }
}

void Toolbar::drawButton(float bx, float by, float size, Tool tool, bool isSelected) {
    // Draw button background
    glBegin(GL_QUADS);
    if (isSelected) glColor4f(0.7f, 0.7f, 1.0f, 1.0f);
    else glColor4f(0.9f, 0.9f, 0.9f, 1.0f);
    glVertex2f(bx, by);
    glVertex2f(bx + size, by);
    glVertex2f(bx + size, by + size);
    glVertex2f(bx, by + size);
    glEnd();

    // Draw icon
    glColor4f(0.2f, 0.2f, 0.2f, 1.0f);
    glLineWidth(2.5f);
    glBegin(GL_LINES);
    if (tool == Tool::BRUSH) {
        glVertex2f(bx + size * 0.3f, by + size * 0.7f);
        glVertex2f(bx + size * 0.7f, by + size * 0.3f);
    } else if (tool == Tool::ERASER) {
        glVertex2f(bx + size * 0.25f, by + size * 0.75f);
        glVertex2f(bx + size * 0.75f, by + size * 0.25f);
        glVertex2f(bx + size * 0.25f, by + size * 0.25f);
        glVertex2f(bx + size * 0.75f, by + size * 0.75f);
    } else if (tool == Tool::COLOR_PICKER) {
        glVertex2f(bx + size * 0.5f, by + size * 0.2f);
        glVertex2f(bx + size * 0.5f, by + size * 0.8f);
        glVertex2f(bx + size * 0.2f, by + size * 0.5f);
        glVertex2f(bx + size * 0.8f, by + size * 0.5f);
    } else if (tool == Tool::BACKGROUND_FILL) {
        glVertex2f(bx + size * 0.2f, by + size * 0.8f);
        glVertex2f(bx + size * 0.8f, by + size * 0.8f);
        glVertex2f(bx + size * 0.5f, by + size * 0.2f);
        glVertex2f(bx + size * 0.5f, by + size * 0.8f);
    } else if (tool == Tool::UNDO) {
        // Curved left arrow
        for (float t = 0; t < 1.0f; t += 0.1f) {
            float angle1 = 3.14f * (1.0f - t);
            float angle2 = 3.14f * (1.0f - (t + 0.1f));
            glVertex2f(bx + size * (0.7f + 0.2f * cosf(angle1)), by + size * (0.5f + 0.2f * sinf(angle1)));
            glVertex2f(bx + size * (0.7f + 0.2f * cosf(angle2)), by + size * (0.5f + 0.2f * sinf(angle2)));
        }
        // Arrow head
        glVertex2f(bx + size * 0.7f, by + size * 0.5f);
        glVertex2f(bx + size * 0.55f, by + size * 0.4f);
        glVertex2f(bx + size * 0.7f, by + size * 0.5f);
        glVertex2f(bx + size * 0.55f, by + size * 0.6f);
    } else if (tool == Tool::REDO) {
        // Curved right arrow
        for (float t = 0; t < 1.0f; t += 0.1f) {
            float angle1 = 3.14f * t;
            float angle2 = 3.14f * (t + 0.1f);
            glVertex2f(bx + size * (0.3f + 0.2f * cosf(angle1)), by + size * (0.5f + 0.2f * sinf(angle1)));
            glVertex2f(bx + size * (0.3f + 0.2f * cosf(angle2)), by + size * (0.5f + 0.2f * sinf(angle2)));
        }
        // Arrow head
        glVertex2f(bx + size * 0.3f, by + size * 0.5f);
        glVertex2f(bx + size * 0.45f, by + size * 0.4f);
        glVertex2f(bx + size * 0.3f, by + size * 0.5f);
        glVertex2f(bx + size * 0.45f, by + size * 0.6f);
    }
    glEnd();
}

bool Toolbar::isMouseOver(float mouseX, float mouseY) const {
    return mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;
}

bool Toolbar::isMouseOverButton(float mouseX, float mouseY, float buttonX, float buttonY) const {
    return mouseX >= buttonX && mouseX <= buttonX + buttonSize && mouseY >= buttonY && mouseY <= buttonY + buttonSize;
}

void Toolbar::handleMouseClick(float mouseX, float mouseY) {
    float buttonY = y + buttonSpacing;
    for (size_t i = 0; i < tools.size(); ++i) {
        float bx = x + buttonSpacing;
        float by = buttonY;
        if (isMouseOverButton(mouseX, mouseY, bx, by)) {
            currentTool = tools[i].first;
            return;
        }
        buttonY += buttonSize + buttonSpacing;
    }
}

Tool Toolbar::getCurrentTool() const {
    return currentTool;
}

void Toolbar::setCurrentTool(Tool tool) {
    currentTool = tool;
}

Tool Toolbar::getToolAtPosition(float mouseX, float mouseY) const {
    float buttonY = y + buttonSpacing;
    for (size_t i = 0; i < tools.size(); ++i) {
        float bx = x + buttonSpacing;
        float by = buttonY;
        if (isMouseOverButton(mouseX, mouseY, bx, by)) {
            return tools[i].first;
        }
        buttonY += buttonSize + buttonSpacing;
    }
    return Tool::BRUSH; // Default
} 