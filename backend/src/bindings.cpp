#include <emscripten/bind.h>
#include "./implement/DrawingEngine/DrawingEngine.hpp"


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


     // Stroke Bindings
     value_object<Stroke>("Stroke")
     .field("points", &Stroke::points)
     .field("color", &Stroke::color)
     .field("thickness", &Stroke::thickness);





    // Binding stroke and point vectors
    register_vector<Point>("PointVector");
    register_vector<Stroke>("StrokeVector");


    // Draw engine Binding
    class_<DrawingEngine>("DrawingEngine")
        .constructor<>()
        .function("addStroke", &DrawingEngine::addStroke)
        .function("addPointToStroke", &DrawingEngine::addPointToStroke)
        .function("removeStroke", &DrawingEngine::removeStroke)
        .function("moveStroke", &DrawingEngine::moveStroke)
        .function("clear", &DrawingEngine::clear)
        .function("getStrokes", &DrawingEngine::getStrokes)
        .function("getVertexBufferData", &DrawingEngine::getVertexBufferData);


}