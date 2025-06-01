#pragma once

#include <GLFW/glfw3.h>
#include <array>
#include <string>
#include <vector>

enum class Tool {
    UNDO,
    REDO,
    BRUSH,
    ERASER,
    COLOR_PICKER,
    BACKGROUND_FILL
};

class Toolbar {
public:
    Toolbar(GLFWwindow* window);
    ~Toolbar();

    void draw();
    bool isMouseOver(float mouseX, float mouseY) const;
    void handleMouseClick(float mouseX, float mouseY);
    Tool getCurrentTool() const;
    void setCurrentTool(Tool tool);
    Tool getToolAtPosition(float mouseX, float mouseY) const;

private:
    GLFWwindow* window;
    Tool currentTool;
    float x, y, width, height;
    float buttonSize;
    float buttonSpacing;
    std::vector<std::pair<Tool, std::string>> tools;  // Tool and its label

    void drawButton(float x, float y, float size, Tool tool, bool isSelected);
    bool isMouseOverButton(float mouseX, float mouseY, float buttonX, float buttonY) const;
}; 