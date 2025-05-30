#pragma once

#include <GLFW/glfw3.h>
#include <array>
#include <vector>

class ColorPicker {
    public:
        ColorPicker(GLFWwindow* window);
        ~ColorPicker();

        void draw();
        void setColor(const std::array<float, 4>& color);
        std::array<float, 4> getColor() const;
        bool isMouseOver(float mouseX, float mouseY) const;
        void handleMouseClick(float mouseX, float mouseY);
        void handleMouseDrag(float mouseX, float mouseY);
        bool getIsOpen() const;
        void setIsOpen(bool is_open);


    private:
        GLFWwindow* window;
        std::array<float, 4> currentColor;
        std::vector<std::array<float, 4>> recentColors;
        int selectedColorIndex;
        bool isOpen;
        
        float x, y, width, height;
        float colorBoxSize;
        float colorBoxSpacing;
        float colorBoxBorderSize;
        float colorBoxBorderColor[4];
        float colorBoxBorderColorSelected[4];
        float colorBoxBorderColorHovered[4];
        float colorBoxBorderColorSelectedHovered[4];

        // Color conversion utilities
        void hsvToRgb(float h, float s, float v, float& r, float& g, float& b);
        void rgbToHsv(float r, float g, float b, float& h, float& s, float& v);
        void positionToHsv(float x, float y, float& h, float& s);
        void adjustBrightness(float& r, float& g, float& b, float brightness);

        // Drawing utilities
        void drawColorWheel();
        void drawBrightnessSlider();
        void drawColorInputs();
        void drawColorPreview();
        void drawRecentColors();
};