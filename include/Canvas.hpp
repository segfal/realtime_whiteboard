#pragma once

#include <GLFW/glfw3.h>
#include <vector>
#include <array>

class Canvas {
public:
    Canvas(unsigned int width, unsigned int height);
    ~Canvas();

    void draw();
    void addPoint(float x, float y, const std::array<float, 4>& color, float thickness);
    void clear();
    void setColor(const std::array<float, 4>& color);
    void setThickness(float thickness);

private:
    unsigned int width;
    unsigned int height;
    std::vector<float> points;
    std::vector<float> colors;
    std::vector<float> thicknesses;
    std::array<float, 4> currentColor;
    float currentThickness;
}; 