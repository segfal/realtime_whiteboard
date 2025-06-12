#include "Window.h"
#include <GL/gl3w.h>
#include <iostream>

namespace whiteboard {

Window::Window(const std::string& title, int width, int height)
    : title_(title)
    , width_(width)
    , height_(height)
    , window_(nullptr)
    , glContext_(nullptr)
    , shouldClose_(false)
{
}

Window::~Window() {
    shutdown();
}

bool Window::initialize() {
    // Initialize SDL
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_TIMER) != 0) {
        std::cerr << "Error: " << SDL_GetError() << std::endl;
        return false;
    }

    // Set OpenGL attributes
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3);
    SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE);
    SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
    SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 24);
    SDL_GL_SetAttribute(SDL_GL_STENCIL_SIZE, 8);

    // Create window
    window_ = SDL_CreateWindow(
        title_.c_str(),
        SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED,
        width_, height_,
        SDL_WINDOW_OPENGL | SDL_WINDOW_RESIZABLE
    );

    if (!window_) {
        std::cerr << "Error: " << SDL_GetError() << std::endl;
        return false;
    }

    // Create OpenGL context
    glContext_ = SDL_GL_CreateContext(window_);
    if (!glContext_) {
        std::cerr << "Error: " << SDL_GetError() << std::endl;
        return false;
    }

    // Initialize OpenGL loader
    if (gl3wInit() != 0) {
        std::cerr << "Failed to initialize OpenGL loader!" << std::endl;
        return false;
    }

    // Enable VSync
    SDL_GL_SetSwapInterval(1);

    return true;
}

void Window::shutdown() {
    if (glContext_) {
        SDL_GL_DeleteContext(glContext_);
        glContext_ = nullptr;
    }

    if (window_) {
        SDL_DestroyWindow(window_);
        window_ = nullptr;
    }

    SDL_Quit();
}

void Window::handleEvents() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        switch (event.type) {
            case SDL_QUIT:
                shouldClose_ = true;
                break;
                
            case SDL_WINDOWEVENT:
                if (event.window.event == SDL_WINDOWEVENT_RESIZED) {
                    width_ = event.window.data1;
                    height_ = event.window.data2;
                    glViewport(0, 0, width_, height_);
                }
                break;
                
            case SDL_MOUSEBUTTONDOWN:
            case SDL_MOUSEBUTTONUP:
            case SDL_MOUSEMOTION:
                handleMouseEvent(event);
                break;
                
            case SDL_KEYDOWN:
            case SDL_KEYUP:
                handleKeyboardEvent(event);
                break;
        }
    }
}

bool Window::shouldClose() const {
    return shouldClose_;
}

void Window::beginFrame() {
    glClearColor(0.45f, 0.55f, 0.60f, 1.00f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
}

void Window::endFrame() {
    SDL_GL_SwapWindow(window_);
}

void Window::setMouseCallback(std::function<void(int, int, int)> callback) {
    mouseCallback_ = std::move(callback);
}

void Window::setKeyboardCallback(std::function<void(int, bool)> callback) {
    keyboardCallback_ = std::move(callback);
}

void Window::handleMouseEvent(const SDL_Event& event) {
    if (!mouseCallback_) return;

    int x, y;
    SDL_GetMouseState(&x, &y);

    switch (event.type) {
        case SDL_MOUSEBUTTONDOWN:
            mouseCallback_(x, y, event.button.button);
            break;
            
        case SDL_MOUSEBUTTONUP:
            mouseCallback_(x, y, -event.button.button);
            break;
            
        case SDL_MOUSEMOTION:
            if (event.motion.state) {
                mouseCallback_(x, y, 0);
            }
            break;
    }
}

void Window::handleKeyboardEvent(const SDL_Event& event) {
    if (!keyboardCallback_) return;

    bool pressed = (event.type == SDL_KEYDOWN);
    keyboardCallback_(event.key.keysym.sym, pressed);
}

} // namespace whiteboard
