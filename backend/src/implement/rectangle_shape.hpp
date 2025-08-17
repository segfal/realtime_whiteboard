#ifndef RECTANGLE_SHAPE_HPP
#define RECTANGLE_SHAPE_HPP

#include "shape.hpp"
#include "draw.hpp"

struct RectangleShape : public Shape {
    Point topLeft;
    Point bottomRight;
    
    RectangleShape(const Point& tl, const Point& br, const Color& color, float thickness)
        : Shape(ShapeType::Rectangle, color, thickness), topLeft(tl), bottomRight(br) {}
    
    std::unique_ptr<Shape> clone() const override {
        return std::make_unique<RectangleShape>(*this);
    }
    
    // Helper methods for rectangle operations
    float getWidth() const { return bottomRight.x - topLeft.x; }
    float getHeight() const { return bottomRight.y - topLeft.y; }
    Point getCenter() const { 
        return Point((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2); 
    }
};

#endif