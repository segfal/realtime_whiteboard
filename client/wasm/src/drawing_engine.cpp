#include "../include/drawing_engine.hpp"
#include <glm/glm.hpp>
#include "../include/renderer/webgpu_renderer.hpp"
#include "../include/renderer/abstract_renderer.hpp"
#include <memory>
#include <iostream>

// If glm is needed, include it from the correct path
//#include "../../lib/glm/glm.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

// Entry point for the WASM drawing engine
extern "C" {

// Simple function to demonstrate WebGPU renderer usage
void run_webgpu_demo() {
    // Create a WebGPU renderer instance directly
    std::unique_ptr<WebGPURenderer> renderer = std::make_unique<WebGPURenderer>();

    // Initialize the renderer with a default canvas size (800x600)
    if (!renderer->initialize(800, 600)) {
        std::cerr << "Failed to initialize WebGPU renderer!" << std::endl;
        return;
    }

    // Present the (empty) frame. In a real app, you'd draw something first.
    renderer->present();

    std::cout << "WebGPU present demo complete." << std::endl;
}

// Emscripten will look for this function to start the module
void EMSCRIPTEN_KEEPALIVE start() {
    run_webgpu_demo();
}

} // extern "C" 

DrawingEngine::DrawingEngine() : renderer(std::make_unique<WebGPURenderer>()) {}
DrawingEngine::~DrawingEngine() = default;

bool DrawingEngine::initialize(int width, int height) {
    return renderer->initialize(width, height);
}

void DrawingEngine::drawLine(float x1, float y1, float x2, float y2) {
    renderer->drawLine({x1, y1}, {x2, y2}, {0, 0, 0, 1}, 1.0f); // Color/width can be parameterized
}

void DrawingEngine::eraseLine(float x1, float y1, float x2, float y2) {
    renderer->eraseLine({x1, y1}, {x2, y2});
}

void DrawingEngine::clearAllLayers() {
    renderer->clearAllLayers();
}

void DrawingEngine::setEraseMode(int mode) {
    using EM = WebGPURenderer::EraseMode;
    if (mode == 1) renderer->setEraseMode(EM::ERASE);
    else if (mode == 2) renderer->setEraseMode(EM::SOFT_ERASE);
    else renderer->setEraseMode(EM::NORMAL);
}

void DrawingEngine::setEraseRadius(float radius) {
    renderer->setEraseRadius(radius);
}

void DrawingEngine::setEraseOpacity(float opacity) {
    renderer->setEraseOpacity(opacity);
} 