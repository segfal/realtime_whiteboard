#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#include "../include/drawing_engine.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(drawing_engine) {
    class_<DrawingEngine>("DrawingEngine")
        .constructor<>()
        .function("initialize", &DrawingEngine::initialize)
        .function("drawLine", &DrawingEngine::drawLine)
        .function("eraseLine", &DrawingEngine::eraseLine)
        .function("clearAllLayers", &DrawingEngine::clearAllLayers)
        .function("setEraseMode", &DrawingEngine::setEraseMode)
        .function("setEraseRadius", &DrawingEngine::setEraseRadius)
        .function("setEraseOpacity", &DrawingEngine::setEraseOpacity)
        ;
}

// Prevent dead code elimination
extern "C" void* force_link_drawing_engine() {
    return (void*)new DrawingEngine();
}
#endif 