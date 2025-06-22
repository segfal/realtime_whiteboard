#include <iostream>
#include "canvas/canvas.hpp"

// Silence OpenGL deprecation warnings on macOS
#ifdef __APPLE__
#define GL_SILENCE_DEPRECATION
#endif

int main() {
    Canvas canvas;
    
    // Initialize the canvas
    if (!canvas.init()) {
        std::cerr << "Failed to initialize canvas" << std::endl;
        return -1;
    }

    // Print monitor info
    std::cout << "Canvas initialized successfully!" << std::endl;
    std::cout << "Window size: " << canvas.get_window_width() << "x" << canvas.get_window_height() << std::endl;
    std::cout << "Press F11 to toggle fullscreen, ESC to exit" << std::endl;

    // Main render loop
    while (!canvas.should_close()) {
        // Clear the screen
        glClear(GL_COLOR_BUFFER_BIT);
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);

        // Render your whiteboard content here
        // For now, we'll just render a simple colored background

        // Swap buffers and poll events
        canvas.swap_buffers();
        canvas.poll_events();
    }

    std::cout << "Application closed successfully" << std::endl;
    return 0;
}