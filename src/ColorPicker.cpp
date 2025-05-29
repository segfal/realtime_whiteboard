#include "ColorPicker.hpp"
#include <cmath>

ColorPicker::ColorPicker(GLFWwindow* window)
    : window(window), currentColor({0.0f, 0.0f, 0.0f, 1.0f}), selectedColorIndex(0), isOpen(false),
      x(10.0f), y(10.0f), width(200.0f), height(200.0f),
      colorBoxSize(20.0f), colorBoxSpacing(5.0f), colorBoxBorderSize(1.0f),
      colorBoxBorderColor{0.0f, 0.0f, 0.0f, 1.0f},
      colorBoxBorderColorSelected{1.0f, 0.0f, 0.0f, 1.0f},
      colorBoxBorderColorHovered{0.0f, 1.0f, 0.0f, 1.0f},
      colorBoxBorderColorSelectedHovered{0.0f, 0.0f, 1.0f, 1.0f} {
    // Initialize recent colors with some default values
    recentColors = {
        {1.0f, 0.0f, 0.0f, 1.0f},  // Red
        {0.0f, 1.0f, 0.0f, 1.0f},  // Green
        {0.0f, 0.0f, 1.0f, 1.0f},  // Blue
        {1.0f, 1.0f, 0.0f, 1.0f},  // Yellow
        {1.0f, 0.0f, 1.0f, 1.0f},  // Magenta
        {0.0f, 1.0f, 1.0f, 1.0f}   // Cyan
    };
}

ColorPicker::~ColorPicker() {
    // Clean up any resources if needed
}

void ColorPicker::draw() {
    if (!isOpen) return;

    // Draw the color picker components
    drawColorWheel();
    drawBrightnessSlider();
    drawColorInputs();
    drawColorPreview();
    drawRecentColors();
}

void ColorPicker::setColor(const std::array<float, 4>& color) {
    currentColor = color;
}

std::array<float, 4> ColorPicker::getColor() const {
    return currentColor;
}

bool ColorPicker::isMouseOver(float mouseX, float mouseY) const {
    return mouseX >= x && mouseX <= x + width &&
           mouseY >= y && mouseY <= y + height;
}

void ColorPicker::handleMouseClick(float mouseX, float mouseY) {
    if (!isOpen) return;
    // Handle mouse click events
}

void ColorPicker::handleMouseDrag(float mouseX, float mouseY) {
    if (!isOpen) return;
    // Handle mouse drag events
}

// Color conversion utilities
void ColorPicker::hsvToRgb(float h, float s, float v, float& r, float& g, float& b) {
    // TODO: Implement HSV to RGB conversion
}

void ColorPicker::rgbToHsv(float r, float g, float b, float& h, float& s, float& v) {
    // TODO: Implement RGB to HSV conversion
}

void ColorPicker::positionToHsv(float x, float y, float& h, float& s) {
    // TODO: Implement position to HSV conversion
}

void ColorPicker::adjustBrightness(float& r, float& g, float& b, float brightness) {
    // TODO: Implement brightness adjustment
}

// Drawing utilities
void ColorPicker::drawColorWheel() {
    // TODO: Implement color wheel drawing
}

void ColorPicker::drawBrightnessSlider() {
    // TODO: Implement brightness slider drawing
}

void ColorPicker::drawColorInputs() {
    // TODO: Implement color input fields drawing
}

void ColorPicker::drawColorPreview() {
    // TODO: Implement color preview drawing
}

void ColorPicker::drawRecentColors() {
    // TODO: Implement recent colors drawing
}


