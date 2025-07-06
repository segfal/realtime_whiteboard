#pragma once

#include "abstract_renderer.hpp"
#include <memory>
#include <string>
#include <vector>

/**
 * @brief Factory class for creating renderer instances
 * 
 * This class implements the Factory pattern to create appropriate renderer
 * instances based on platform capabilities and user preferences.
 */
class RendererFactory {
public:
    /**
     * @brief Create a renderer of the specified type
     * @param type The type of renderer to create
     * @return Unique pointer to the created renderer, or nullptr if creation failed
     */
    static std::unique_ptr<AbstractRenderer> createRenderer(RendererType type);

    /**
     * @brief Get the default renderer type for the current platform
     * @return Default renderer type
     */
    static RendererType getDefaultRendererType();

    /**
     * @brief Get all supported renderer types for the current platform
     * @return Vector of supported renderer types
     */
    static std::vector<RendererType> getSupportedRenderers();

    /**
     * @brief Get the name of a renderer type
     * @param type The renderer type
     * @return Human-readable name
     */
    static std::string getRendererName(RendererType type);

    /**
     * @brief Check if a renderer type is supported on the current platform
     * @param type The renderer type to check
     * @return true if supported, false otherwise
     */
    static bool isRendererSupported(RendererType type);

private:
    /**
     * @brief Private constructor to prevent instantiation
     */
    RendererFactory() = delete;
}; 