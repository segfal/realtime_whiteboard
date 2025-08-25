#ifndef STROKE_SHAPE_HPP
#define STROKE_SHAPE_HPP

#include "shape.hpp"
#include "draw.hpp"

struct StrokeShape : public Shape {
    std::vector<Point> points;
    
    StrokeShape(const Color& color, float thickness, const std::vector<Point>& pts = {})
        : Shape(ShapeType::Stroke, color, thickness), points(pts) {}
    
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<StrokeShape>(*this);
    }
    
    // Getter methods for Emscripten binding
    const Color& getColor() const { return color; }
    float getThickness() const { return thickness; }
    void simplify(float epsilon = 1.0f) {
        points = RDP::simplify(points,epsilon);
    }
};

#endif




