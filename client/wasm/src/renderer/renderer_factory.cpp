#include "../../include/renderer/renderer_factory.hpp"
#include "../../include/renderer/webgpu_renderer.hpp"
#include <iostream>
#include <algorithm>
#include <emscripten/emscripten.h>

// Forward declaration for WebGPU renderer
class WebGPURenderer;

/**
 * @brief Create a renderer of the specified type
 * 
 * This method implements the Factory pattern to create different types
 * of renderers based on the requested type. It checks if the renderer
 * type is supported before attempting to create it.
 * 
 * @param type The type of renderer to create
 * @return Unique pointer to the created renderer, or nullptr if creation fails
 */
std::unique_ptr<AbstractRenderer> RendererFactory::createRenderer(RendererType type) {
    std::cout << "🏭 Creating renderer of type: " << static_cast<int>(type) << std::endl;
    
    switch (type) {
        case RendererType::WEBGPU:
            std::cout << "🔧 Attempting to create WebGPU renderer..." << std::endl;
            #ifdef WEBGPU_AVAILABLE
                return std::make_unique<WebGPURenderer>();
            #else
                std::cout << "❌ WebGPU not available on this platform" << std::endl;
                return nullptr;
            #endif
            
        case RendererType::OPENGL:
        case RendererType::SDL:
        case RendererType::NONE:
        default:
            std::cout << "❌ Only WebGPU renderer is supported" << std::endl;
            return nullptr;
    }
}

/**
 * @brief Get the default renderer type for the current platform
 * 
 * This method determines the best default renderer for the current
 * platform and browser capabilities. It prioritizes WebGPU.
 * 
 * @return Default RendererType for the platform
 */
RendererType RendererFactory::getDefaultRendererType() {
    #ifdef WEBGPU_AVAILABLE
        std::cout << "🎯 Getting default renderer type: WEBGPU" << std::endl;
        return RendererType::WEBGPU;
    #else
        std::cout << "🎯 Getting default renderer type: NONE (WebGPU not available)" << std::endl;
        return RendererType::NONE;
    #endif
}

/**
 * @brief Check if a renderer type is supported on the current platform
 * 
 * This method checks if the specified renderer type can be used
 * on the current platform and browser.
 * 
 * @param type Renderer type to check
 * @return true if supported, false otherwise
 */
bool RendererFactory::isRendererSupported(RendererType type) {
    auto supported = getSupportedRenderers();
    return std::find(supported.begin(), supported.end(), type) != supported.end();
}

/**
 * @brief Get a list of supported renderer types for the current platform
 * 
 * This method returns a vector of all renderer types that are
 * supported on the current platform.
 * 
 * @return Vector of supported RendererType values
 */
std::vector<RendererType> RendererFactory::getSupportedRenderers() {
    std::vector<RendererType> supported;
    
    // Support WebGPU if available
    #ifdef WEBGPU_AVAILABLE
        supported.push_back(RendererType::WEBGPU);
    #endif
    
    std::cout << "📋 Supported renderers: ";
    for (size_t i = 0; i < supported.size(); ++i) {
        if (i > 0) std::cout << ", ";
        std::cout << getRendererName(supported[i]);
    }
    std::cout << std::endl;
    
    return supported;
}

/**
 * @brief Get the name of a renderer type as a string
 * 
 * This method converts a RendererType enum to its string representation.
 * 
 * @param type Renderer type
 * @return String name of the renderer type
 */
std::string RendererFactory::getRendererName(RendererType type) {
    switch (type) {
        case RendererType::WEBGPU:
            return "WebGPU";
        case RendererType::OPENGL:
            return "OpenGL (not supported)";
        case RendererType::SDL:
            return "SDL (not supported)";
        case RendererType::NONE:
        default:
            return "Unknown";
    }
} 