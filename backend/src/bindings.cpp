#include <emscripten/bind.h>
#include "./implement/DrawingEngine/DrawingEngine.hpp"
#include "./implement/shape.hpp"
#include "./implement/stroke_shape.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(drawing_module) {
    // Color bindings
    value_object<Color>("Color")
    .field("r", &Color::r)
    .field("g", &Color::g)
    .field("b", &Color::b)
    .field("a", &Color::a);

    // Point Bindings 
    value_object<Point>("Point")
    .field("x", &Point::x)
    .field("y", &Point::y);

    // ShapeType enum
    enum_<ShapeType>("ShapeType")
    .value("Stroke", ShapeType::Stroke)
    .value("Rectangle", ShapeType::Rectangle)
    .value("Ellipse", ShapeType::Ellipse);

    // StrokeShape bindings
    class_<StrokeShape>("StrokeShape")
        .constructor<const Color&, float>()
        .constructor<const Color&, float, const std::vector<Point>&>()
        .property("points", &StrokeShape::points)
        .function("getColor", &StrokeShape::getColor)
        .function("getThickness", &StrokeShape::getThickness)
        .function("simplify", &StrokeShape::simplify);

    // Binding stroke and point vectors
    register_vector<Point>("PointVector");
    register_vector<StrokeShape>("StrokeVector");

    // Draw engine Binding
    class_<DrawingEngine>("DrawingEngine")
        .constructor<>()
        .function("addShape", &DrawingEngine::addShape)
        .function("addStroke", &DrawingEngine::addStroke)
        .function("addPointToStroke", &DrawingEngine::addPointToStroke)
        .function("removeShape", &DrawingEngine::removeShape)
        .function("removeStroke", &DrawingEngine::removeStroke)
        .function("moveShape", &DrawingEngine::moveShape)
        .function("moveStroke", &DrawingEngine::moveStroke)
        .function("clear", &DrawingEngine::clear)
        .function("getStrokes", &DrawingEngine::getStrokes)
        .function("getVertexBufferData", &DrawingEngine::getVertexBufferData)
        .function("simplifyStroke", &DrawingEngine::simplifyStroke);
}