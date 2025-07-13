#include <emscripten/bind.h>
#include "implement/DrawingEngine/DrawingEngine.hpp"
#include "implement/draw.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(test_module) {
    // Test bindings
    class_<DrawingEngine>("TestDrawingEngine")
        .constructor<>()
        .function("addStroke", &DrawingEngine::addStroke)
        .function("getStrokes", &DrawingEngine::getStrokes)
        .function("clear", &DrawingEngine::clear);
}
