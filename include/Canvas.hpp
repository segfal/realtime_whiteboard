#pragma once

#include <GLFW/glfw3.h>
#include <vector>
#include <array>
#include "ColorPicker.hpp"
#include "Toolbar.hpp"

class Canvas {
public:
    Canvas(unsigned int width, unsigned int height, GLFWwindow* window);
    ~Canvas();

    void draw();
    void addPoint(float x, float y, const std::array<float, 4>& color, float thickness);
    void clear();
    void setColor(const std::array<float, 4>& color);
    void setThickness(float thickness);
    void adjustThickness(float delta);
    void startNewLine();  // Call this when mouse button is pressed
    void endLine();       // Call this when mouse button is released
    void undo();
    void redo();
    
    // New methods for color picker interaction
    void handleMouseClick(float mouseX, float mouseY);
    void handleMouseDrag(float mouseX, float mouseY);
    bool isColorPickerOpen() const;
    void toggleColorPicker();
    bool getisEraser();
    void setisEraser();
    void setBackgroundColor(const std::array<float, 4>& color);
    std::array<float, 4> getBackgroundColor() const;
    void toggleBackgroundColorPicker();

private:
    unsigned int width;
    unsigned int height;
    std::vector<float> points;
    std::vector<float> colors;
    std::vector<float> thicknesses;
    std::vector<size_t> lineStarts;  // Indices where new lines start
    std::array<float, 4> currentColor;
    std::array<float, 4> backgroundColor;
    float currentThickness;
    ColorPicker colorPicker;
    ColorPicker backgroundColorPicker;
    Toolbar toolbar;
    bool isDrawing;
    bool isEraserMode;
    bool isBackgroundColorPickerOpen;
    // Undo/Redo stacks
    std::vector<std::vector<float>> undoPointsStack;
    std::vector<std::vector<float>> undoColorsStack;
    std::vector<std::vector<float>> undoThicknessesStack;
    std::vector<std::vector<size_t>> undoLineStartsStack;
    std::vector<std::vector<float>> redoPointsStack;
    std::vector<std::vector<float>> redoColorsStack;
    std::vector<std::vector<float>> redoThicknessesStack;
    std::vector<std::vector<size_t>> redoLineStartsStack;
}; 