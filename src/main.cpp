#include <GLFW/glfw3.h>
#include <glad/glad.h>
#include "core/Canvas.h"
#include <iostream>

using namespace whiteboard;

int main() {
    if (!glfwInit()) {
        std::cerr << "Failed to initialize GLFW" << std::endl;
        return -1;
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(800, 600, "Realtime Whiteboard", nullptr, nullptr);
    if (!window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "Failed to initialize GLAD" << std::endl;
        return -1;
    }

    glViewport(0, 0, 800, 600);

    Canvas canvas(800, 600);

    while (!glfwWindowShouldClose(window)) {
        // Input handling here

        // Drawing
        canvas.clear(1.0f, 1.0f, 1.0f, 1.0f);
        canvas.drawLine(-0.5f, -0.5f, 0.5f, 0.5f, 2.0f, 1.0f, 0.0f, 0.0f, 1.0f);
        canvas.drawRectangle(-0.5f, -0.5f, 1.0f, 1.0f, 2.0f, 0.0f, 0.0f, 1.0f, 1.0f);
        canvas.drawCircle(0.0f, 0.0f, 0.25f, 2.0f, 0.0f, 1.0f, 0.0f, 1.0f);
        // canvas.drawText(0.0f, 0.0f, "Hello", 24.0f, 0.0f, 0.0f, 0.0f, 1.0f);
        canvas.render();

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
} 