#pragma once

#include <SDL.h>
#include <memory>
#include <string>
#include <functional>

namespace whiteboard {

class Window {
public:
    Window(const std::string& title, int width, int height);
    ~Window();
    
    // Window management
    bool initialize();
    void shutdown();
    void handleEvents();
    bool shouldClose() const;
    
    // Rendering
    void beginFrame();
    void endFrame();
    
    // Input handling
    void setMouseCallback(std::function<void(int, int, int)> callback);
    void setKeyboardCallback(std::function<void(int, bool)> callback);
    
    // Getters
    int getWidth() const { return width_; }
    int getHeight() const { return height_; }
    SDL_Window* getSDLWindow() const { return window_; }
    SDL_GLContext getGLContext() const { return glContext_; }
    
private:
    std::string title_;
    int width_;
    int height_;
    SDL_Window* window_;
    SDL_GLContext glContext_;
    bool shouldClose_;
    
    std::function<void(int, int, int)> mouseCallback_;
    std::function<void(int, bool)> keyboardCallback_;
    
    void handleMouseEvent(const SDL_Event& event);
    void handleKeyboardEvent(const SDL_Event& event);
};

} // namespace whiteboard
