#pragma once

/**
 * @file drawing_engine.hpp
 * @brief Entry point API for the WebAssembly Drawing Engine
 *
 * This header declares the main functions for initializing and running
 * the WebGPU renderer in the WASM build. These functions are intended
 * to be called from JavaScript or other C++ code.
 */

#include "renderer/webgpu_renderer.hpp"
#include <memory>

class DrawingEngine {
public:
    DrawingEngine();
    ~DrawingEngine();

    bool initialize(int width, int height);
    void drawLine(float x1, float y1, float x2, float y2);
    void eraseLine(float x1, float y1, float x2, float y2);
    void clearAllLayers();
    void setEraseMode(int mode); // 0: normal, 1: erase, 2: soft_erase
    void setEraseRadius(float radius);
    void setEraseOpacity(float opacity);

private:
    std::unique_ptr<WebGPURenderer> renderer;
};

#ifdef __cplusplus
extern "C" {
#endif

/// Run a simple WebGPU renderer demo (for testing)
void run_webgpu_demo();

/// Emscripten entry point (called from JS)
void start();

#ifdef __cplusplus
}
#endif 