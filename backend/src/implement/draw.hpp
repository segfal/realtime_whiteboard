#pragma once
#include <vector>
#include "color.hpp"

struct Point {
    float x, y;
    Point(float x=0, float y=0) : x(x), y(y) {}
};

struct Stroke {
    std::vector<Point> points;
    Color color;
    float thickness;
    // TODO: add bool isEraser
    bool isEraser;
    Stroke(const Color& color = Color(), float thickness = 2.0f) : color(color), thickness(thickness),isEraser(false) {}

    
};
