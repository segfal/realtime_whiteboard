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
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
    // Handle mouse click events for color boxes
    for (int i = 0; i < recentColors.size(); i++) {
        float boxX = x + colorBoxSpacing + (colorBoxSize + colorBoxSpacing) * i;
        float boxY = y + colorBoxSpacing;
        if (isMouseOver(mouseX, mouseY) && mouseX >= boxX && mouseX <= boxX + colorBoxSize &&
            mouseY >= boxY && mouseY <= boxY + colorBoxSize) {
            selectedColorIndex = i;
            currentColor = recentColors[i];
        }
    }
    // Handle mouse click events for color wheel
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
    // Handle mouse click events for brightness slider
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
    // Handle mouse click events for color inputs
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
    // Handle mouse click events for color preview
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
    // Handle mouse click events for recent colors
    if (isMouseOver(mouseX, mouseY)) {
        isOpen = !isOpen;
    }
   
}

void ColorPicker::handleMouseDrag(float mouseX, float mouseY) {
    if (!isOpen) return; // check if open
    
    // Calculate color wheel boundaries
    float wheelStartX = x + colorBoxSpacing;
    float wheelStartY = y + colorBoxSpacing + colorBoxSize + colorBoxSpacing;
    float wheelSize = width - 2 * colorBoxSpacing;
    
    // Check if mouse is over color wheel
    if (mouseX >= wheelStartX && mouseX <= wheelStartX + wheelSize &&
        mouseY >= wheelStartY && mouseY <= wheelStartY + wheelSize) {
        
        // Convert mouse position to HSV color space
        float hue, saturation;
        positionToHsv(mouseX - wheelStartX, mouseY - wheelStartY, hue, saturation);
        
        // Convert HSV to RGB
        float red, green, blue;
        hsvToRgb(hue, saturation, 1.0f, red, green, blue);
        
        // Update current color while preserving alpha
        currentColor = {red, green, blue, currentColor[3]};
    }
    
    // Check if mouse is over brightness slider
    float sliderStartX = x + colorBoxSpacing;
    float sliderStartY = y + height - colorBoxSpacing - 20.0f;
    float sliderWidth = width - 2 * colorBoxSpacing;
    
    if (mouseX >= sliderStartX && mouseX <= sliderStartX + sliderWidth &&
        mouseY >= sliderStartY && mouseY <= sliderStartY + 20.0f) {
        
        // Calculate brightness value (0.0 to 1.0)
        float brightness = (mouseX - sliderStartX) / sliderWidth;
        brightness = std::max(0.0f, std::min(1.0f, brightness));
        
        // Adjust current color brightness
        float red = currentColor[0];
        float green = currentColor[1];
        float blue = currentColor[2];
        adjustBrightness(red, green, blue, brightness);
        
        // Update current color
        currentColor = {red, green, blue, currentColor[3]};
    }
    
    // Check if mouse is over color input sliders
    float inputStartX = x + colorBoxSpacing;
    float inputStartY = y + height - colorBoxSpacing - 60.0f;
    float inputWidth = width - 2 * colorBoxSpacing;
    
    if (mouseX >= inputStartX && mouseX <= inputStartX + inputWidth &&
        mouseY >= inputStartY && mouseY <= inputStartY + 60.0f) {
        
        // Calculate which input slider is being dragged (R, G, or B)
        int sliderIndex = static_cast<int>((mouseY - inputStartY) / 20.0f);
        if (sliderIndex >= 0 && sliderIndex < 3) {
            // Calculate new value (0.0 to 1.0)
            float newValue = (mouseX - inputStartX) / inputWidth;
            newValue = std::max(0.0f, std::min(1.0f, newValue));
            
            // Update the corresponding color component
            currentColor[sliderIndex] = newValue;
        }
    }
}

// Color conversion utilities
void ColorPicker::hsvToRgb(float hue, float saturation, float value, float& red, float& green, float& blue) {
    // Ensure hue is in range [0, 1)
    hue = std::fmod(hue, 1.0f);
    if (hue < 0.0f) hue += 1.0f;
    
    // Ensure saturation and value are in range [0, 1]
    saturation = std::max(0.0f, std::min(1.0f, saturation));
    value = std::max(0.0f, std::min(1.0f, value));
    
    // If saturation is 0, the color is grayscale
    if (saturation == 0.0f) {
        red = green = blue = value;
        return;
    }
    
    // Convert hue to sector (0-5)
    float sector = hue * 6.0f;
    int sectorIndex = static_cast<int>(sector);
    float sectorFraction = sector - sectorIndex;
    
    // Calculate intermediate values
    float p = value * (1.0f - saturation);
    float q = value * (1.0f - saturation * sectorFraction);
    float t = value * (1.0f - saturation * (1.0f - sectorFraction));
    
    // Assign RGB values based on sector
    switch (sectorIndex) {
        case 0: // Red to Yellow
            red = value;
            green = t;
            blue = p;
            break;
        case 1: // Yellow to Green
            red = q;
            green = value;
            blue = p;
            break;
        case 2: // Green to Cyan
            red = p;
            green = value;
            blue = t;
            break;
        case 3: // Cyan to Blue
            red = p;
            green = q;
            blue = value;
            break;
        case 4: // Blue to Magenta
            red = t;
            green = p;
            blue = value;
            break;
        case 5: // Magenta to Red
            red = value;
            green = p;
            blue = q;
            break;
    }
}

void ColorPicker::rgbToHsv(float red, float green, float blue, float& hue, float& saturation, float& value) {
    // Ensure inputs are in range [0, 1]
    red = std::max(0.0f, std::min(1.0f, red));
    green = std::max(0.0f, std::min(1.0f, green));
    blue = std::max(0.0f, std::min(1.0f, blue));
    
    // Find the maximum and minimum RGB values
    float maxColor = std::max(std::max(red, green), blue);
    float minColor = std::min(std::min(red, green), blue);
    
    // Calculate value (brightness)
    value = maxColor;
    
    // Calculate saturation
    if (maxColor == 0.0f) {
        saturation = 0.0f;
        hue = 0.0f;
        return;
    }
    
    saturation = (maxColor - minColor) / maxColor;
    
    // Calculate hue
    if (saturation == 0.0f) {
        hue = 0.0f;
        return;
    }
    
    float delta = maxColor - minColor;
    if (maxColor == red) {
        hue = (green - blue) / delta;
    } else if (maxColor == green) {
        hue = 2.0f + (blue - red) / delta;
    } else { // maxColor == blue
        hue = 4.0f + (red - green) / delta;
    }
    
    // Normalize hue to [0, 1)
    hue = std::fmod(hue / 6.0f, 1.0f);
    if (hue < 0.0f) hue += 1.0f;
}

void ColorPicker::positionToHsv(float positionX, float positionY, float& hue, float& saturation) {
    // Convert position to polar coordinates
    float centerX = width / 2.0f;
    float centerY = height / 2.0f;
    
    // Calculate distance from center (normalized to [0, 1])
    float dx = positionX - centerX;
    float dy = positionY - centerY;
    float distance = std::sqrt(dx * dx + dy * dy);
    float maxDistance = std::min(centerX, centerY);
    saturation = std::min(1.0f, distance / maxDistance);
    
    // Calculate angle (hue)
    float angle = std::atan2(dy, dx);
    // Convert angle from [-π, π] to [0, 1]
    hue = (angle + M_PI) / (2.0f * M_PI);
}

void ColorPicker::adjustBrightness(float& red, float& green, float& blue, float brightness) {
    // Ensure brightness is in range [0, 1]
    brightness = std::max(0.0f, std::min(1.0f, brightness));
    
    // Adjust each color component
    red *= brightness;
    green *= brightness;
    blue *= brightness;
}

// Drawing utilities
void ColorPicker::drawColorWheel() {
    const int segments = 360;  // Number of segments in the wheel
    const float radius = std::min(width, height) / 2.0f - colorBoxSpacing;
    const float centerX = x + width / 2.0f;
    const float centerY = y + height / 2.0f;
    
    glBegin(GL_TRIANGLE_FAN);
    // Center point (white)
    glColor4f(1.0f, 1.0f, 1.0f, 1.0f);
    glVertex2f(centerX, centerY);
    
    // Draw color wheel segments
    for (int i = 0; i <= segments; ++i) {
        float angle = 2.0f * M_PI * i / segments;
        float hue = i / static_cast<float>(segments);
        float saturation = 1.0f;
        float value = 1.0f;
        
        float red, green, blue;
        hsvToRgb(hue, saturation, value, red, green, blue);
        
        glColor4f(red, green, blue, 1.0f);
        glVertex2f(centerX + radius * std::cos(angle),
                  centerY + radius * std::sin(angle));
    }
    glEnd();
}

void ColorPicker::drawBrightnessSlider() {
    float sliderX = x + colorBoxSpacing;
    float sliderY = y + height - colorBoxSpacing - 20.0f;
    float sliderWidth = width - 2 * colorBoxSpacing;
    float sliderHeight = 20.0f;
    
    // Draw slider background
    glBegin(GL_QUADS);
    glColor4f(0.0f, 0.0f, 0.0f, 1.0f);
    glVertex2f(sliderX, sliderY);
    glVertex2f(sliderX + sliderWidth, sliderY);
    glVertex2f(sliderX + sliderWidth, sliderY + sliderHeight);
    glVertex2f(sliderX, sliderY + sliderHeight);
    glEnd();
    
    // Draw current brightness indicator
    float indicatorX = sliderX + (currentColor[0] + currentColor[1] + currentColor[2]) / 3.0f * sliderWidth;
    glBegin(GL_QUADS);
    glColor4f(1.0f, 1.0f, 1.0f, 1.0f);
    glVertex2f(indicatorX - 2.0f, sliderY - 2.0f);
    glVertex2f(indicatorX + 2.0f, sliderY - 2.0f);
    glVertex2f(indicatorX + 2.0f, sliderY + sliderHeight + 2.0f);
    glVertex2f(indicatorX - 2.0f, sliderY + sliderHeight + 2.0f);
    glEnd();
}

void ColorPicker::drawColorInputs() {
    float inputX = x + colorBoxSpacing;
    float inputY = y + height - colorBoxSpacing - 60.0f;
    float inputWidth = width - 2 * colorBoxSpacing;
    float inputHeight = 20.0f;
    
    const char* labels[] = {"R", "G", "B"};
    float colors[][3] = {{1.0f, 0.0f, 0.0f}, {0.0f, 1.0f, 0.0f}, {0.0f, 0.0f, 1.0f}};
    
    for (int i = 0; i < 3; ++i) {
        float y = inputY + i * (inputHeight + 5.0f);
        
        // Draw label
        // Note: In a real implementation, you'd use a text rendering system
        // This is just a placeholder for the concept
        
        // Draw slider background
        glBegin(GL_QUADS);
        glColor4f(0.2f, 0.2f, 0.2f, 1.0f);
        glVertex2f(inputX, y);
        glVertex2f(inputX + inputWidth, y);
        glVertex2f(inputX + inputWidth, y + inputHeight);
        glVertex2f(inputX, y + inputHeight);
        glEnd();
        
        // Draw color gradient
        glBegin(GL_QUADS);
        glColor4f(0.0f, 0.0f, 0.0f, 1.0f);
        glVertex2f(inputX, y);
        glVertex2f(inputX + inputWidth, y);
        glColor4f(colors[i][0], colors[i][1], colors[i][2], 1.0f);
        glVertex2f(inputX + inputWidth, y + inputHeight);
        glVertex2f(inputX, y + inputHeight);
        glEnd();
        
        // Draw current value indicator
        float indicatorX = inputX + currentColor[i] * inputWidth;
        glBegin(GL_QUADS);
        glColor4f(1.0f, 1.0f, 1.0f, 1.0f);
        glVertex2f(indicatorX - 2.0f, y - 2.0f);
        glVertex2f(indicatorX + 2.0f, y - 2.0f);
        glVertex2f(indicatorX + 2.0f, y + inputHeight + 2.0f);
        glVertex2f(indicatorX - 2.0f, y + inputHeight + 2.0f);
        glEnd();
    }
}

void ColorPicker::drawColorPreview() {
    float previewX = x + colorBoxSpacing;
    float previewY = y + height - colorBoxSpacing - 100.0f;
    float previewSize = 40.0f;
    
    // Draw current color preview
    glBegin(GL_QUADS);
    glColor4fv(currentColor.data());
    glVertex2f(previewX, previewY);
    glVertex2f(previewX + previewSize, previewY);
    glVertex2f(previewX + previewSize, previewY + previewSize);
    glVertex2f(previewX, previewY + previewSize);
    glEnd();
    
    // Draw border
    glBegin(GL_LINE_LOOP);
    glColor4f(0.0f, 0.0f, 0.0f, 1.0f);
    glVertex2f(previewX, previewY);
    glVertex2f(previewX + previewSize, previewY);
    glVertex2f(previewX + previewSize, previewY + previewSize);
    glVertex2f(previewX, previewY + previewSize);
    glEnd();
}

void ColorPicker::drawRecentColors() {
    float startX = x + colorBoxSpacing;
    float startY = y + colorBoxSpacing;
    
    for (size_t i = 0; i < recentColors.size(); ++i) {
        float boxX = startX + (colorBoxSize + colorBoxSpacing) * i;
        float boxY = startY;
        
        // Draw color box
        glBegin(GL_QUADS);
        glColor4fv(recentColors[i].data());
        glVertex2f(boxX, boxY);
        glVertex2f(boxX + colorBoxSize, boxY);
        glVertex2f(boxX + colorBoxSize, boxY + colorBoxSize);
        glVertex2f(boxX, boxY + colorBoxSize);
        glEnd();
        
        // Draw border
        glBegin(GL_LINE_LOOP);
        if (i == selectedColorIndex) {
            glColor4fv(colorBoxBorderColorSelected);
        } else {
            glColor4fv(colorBoxBorderColor);
        }
        glVertex2f(boxX, boxY);
        glVertex2f(boxX + colorBoxSize, boxY);
        glVertex2f(boxX + colorBoxSize, boxY + colorBoxSize);
        glVertex2f(boxX, boxY + colorBoxSize);
        glEnd();
    }
}


bool ColorPicker::getIsOpen() const {
    return this->isOpen;
}

void ColorPicker::setIsOpen(bool is_open) {
    this->isOpen = is_open;
}