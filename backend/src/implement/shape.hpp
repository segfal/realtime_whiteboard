#ifndef SHAPE_HPP
#define SHAPE_HPP

#pragma once

#include "color.hpp"
#include <memory>

enum class ShapeType { Stroke, Rectangle, Ellipse /*, ...*/ };

struct Shape {
    ShapeType type;
    Color color;
    float thickness;
    
    // Add constructor for the base class
    Shape(ShapeType t, const Color& c, float th) 
        : type(t), color(c), thickness(th) {}
    
    virtual ~Shape() = default;
    virtual std::unique_ptr<Shape> clone() const = 0;
    // Optionally: virtual void draw() const = 0;
    // Optionally: virtual bool hitTest(float x, float y) const = 0;
};

#endif