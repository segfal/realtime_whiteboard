#include <iostream>
#include <GLFW/glfw3.h>
#include <cstdlib>

// Global Variables
static GLFWwindow* window = nullptr;
static bool IS_FULLSCREEN = false;
static int WIN_X, WIN_Y, WIN_W, WIN_H;




// Fullscreen Helper
void toggle_fullscreen() {
    if (!IS_FULLSCREEN) {
        // Save window position and size
        glfwGetWindowPos(window, &WIN_X, &WIN_Y);
        glfwGetWindowSize(window, &WIN_W, &WIN_H);
        
        GLFWmonitor* monitor = glfwGetPrimaryMonitor();
        const GLFWvidmode* vm = glfwGetVideoMode(monitor);
        glfwSetWindowMonitor(window, monitor, 0, 0, vm->width, vm->height, vm->refreshRate);
        IS_FULLSCREEN = true;
    } else {
        // Restore window position and size
        glfwSetWindowMonitor(window, nullptr, WIN_X, WIN_Y, WIN_W, WIN_H, 0);
        IS_FULLSCREEN = false;
    }
}

// Error callback function
void error_callback(int error, const char* description) {
    std::cerr << "GLFW Error " << error << ": " << description << std::endl;
}

// Key callback function
void key_callback(GLFWwindow* window, int key, int scancode, int action, int mods) {
    if (key == GLFW_KEY_ESCAPE && action == GLFW_PRESS) {
        glfwSetWindowShouldClose(window, GLFW_TRUE);
    }
    if (key == GLFW_KEY_F11 && action == GLFW_PRESS) {
        toggle_fullscreen();
    }
}



int main() {
    // Initialize GLFW
    if (!glfwInit()) {
        std::cerr << "Failed to initialize GLFW" << std::endl;
        return -1;
    }

    // Set error callback
    glfwSetErrorCallback(error_callback);

    // Configure GLFW
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    
    #ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    #endif

    // Create window
    window = glfwCreateWindow(800, 600, "Realtime Whiteboard", nullptr, nullptr);
    if (!window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }

    // Make context current
    glfwMakeContextCurrent(window);

    // Set callbacks
    glfwSetKeyCallback(window, key_callback);

    // Print monitor info
    GLFWmonitor* primary_monitor = glfwGetPrimaryMonitor();
    if (primary_monitor) {
        const GLFWvidmode* mode = glfwGetVideoMode(primary_monitor);
        std::cout << "Primary monitor: " << glfwGetMonitorName(primary_monitor) << std::endl;
        std::cout << "Resolution: " << mode->width << "x" << mode->height << std::endl;
        std::cout << "Refresh rate: " << mode->refreshRate << " Hz" << std::endl;
    }

    // Main render loop
    while (!glfwWindowShouldClose(window)) {
        // Clear the screen
        glClear(GL_COLOR_BUFFER_BIT);
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);

        // Render your whiteboard content here
        // For now, we'll just render a simple colored background

        // Swap buffers and poll events
        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    // Cleanup
    glfwDestroyWindow(window);
    glfwTerminate();

    return 0;
}