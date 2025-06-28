#include "canvas.hpp"
#include <iostream>

// Static member initialization
int Canvas::_window_x = 0;
int Canvas::_window_y = 0;
int Canvas::_window_h = 600;
int Canvas::_window_w = 800;

Canvas::Canvas() : _is_fullscreen(false), _window(nullptr), _monitor(nullptr) {}

Canvas::~Canvas() { this->cleanup();} // cleanup is a function that cleans up the canvas

// Snake case GLFW wrapper implementations
bool Canvas::glfw_init() {return ::glfwInit();} // glfwInit is a function that initializes the GLFW library

void Canvas::glfw_terminate() { ::glfwTerminate();} // glfwTerminate is a function that terminates the GLFW library

void Canvas::glfw_set_error_callback(void (*callback)(int, const char*)) { ::glfwSetErrorCallback(callback);} // glfwSetErrorCallback is a function that sets the error callback

void Canvas::glfw_window_hint(int hint, int value) { ::glfwWindowHint(hint, value);} // glfwWindowHint is a function that sets the window hint

GLFWwindow* Canvas::glfw_create_window(int width, int height, const char* title, GLFWmonitor* monitor, GLFWwindow* share) { return ::glfwCreateWindow(width, height, title, monitor, share);} // glfwCreateWindow is a function that creates a window

void Canvas::glfw_make_context_current(GLFWwindow* window) { ::glfwMakeContextCurrent(window);} // glfwMakeContextCurrent is a function that makes the context current

void Canvas::glfw_set_key_callback(GLFWwindow* window, void (*callback)(GLFWwindow*, int, int, int, int)) { ::glfwSetKeyCallback(window, callback);} // glfwSetKeyCallback is a function that sets the key callback

void Canvas::glfw_set_window_user_pointer(GLFWwindow* window, void* pointer) { ::glfwSetWindowUserPointer(window, pointer);} // glfwSetWindowUserPointer is a function that sets the window user pointer

void* Canvas::glfw_get_window_user_pointer(GLFWwindow* window) { return ::glfwGetWindowUserPointer(window);} // glfwGetWindowUserPointer is a function that gets the window user pointer

GLFWmonitor* Canvas::glfw_get_primary_monitor() { return ::glfwGetPrimaryMonitor();} // glfwGetPrimaryMonitor is a function that gets the primary monitor

const GLFWvidmode* Canvas::glfw_get_video_mode(GLFWmonitor* monitor) { return ::glfwGetVideoMode(monitor);} // glfwGetVideoMode is a function that gets the video mode

void Canvas::glfw_get_window_pos(GLFWwindow* window, int* xpos, int* ypos) { ::glfwGetWindowPos(window, xpos, ypos);} // glfwGetWindowPos is a function that gets the window position

void Canvas::glfw_get_window_size(GLFWwindow* window, int* width, int* height) { ::glfwGetWindowSize(window, width, height);} // glfwGetWindowSize is a function that gets the window size

void Canvas::glfw_set_window_monitor(GLFWwindow* window, GLFWmonitor* monitor, int xpos, int ypos, int width, int height, int refresh_rate) { ::glfwSetWindowMonitor(window, monitor, xpos, ypos, width, height, refresh_rate);} // glfwSetWindowMonitor is a function that sets the window monitor

void Canvas::glfw_set_window_should_close(GLFWwindow* window, int value) { ::glfwSetWindowShouldClose(window, value);} // glfwSetWindowShouldClose is a function that sets the window should close

int Canvas::glfw_window_should_close(GLFWwindow* window) const { return ::glfwWindowShouldClose(window);} // glfwWindowShouldClose is a function that gets the window should close

void Canvas::glfw_swap_buffers(GLFWwindow* window) { ::glfwSwapBuffers(window);} // glfwSwapBuffers is a function that swaps the buffers

void Canvas::glfw_poll_events() { ::glfwPollEvents();} // glfwPollEvents is a function that polls the events

void Canvas::glfw_destroy_window(GLFWwindow* window) { ::glfwDestroyWindow(window);} // glfwDestroyWindow is a function that destroys the window

bool Canvas::init() {
    // Initialize GLFW
    if (!this->glfw_init()) {
        std::cerr << "Failed to initialize GLFW" << std::endl;
        return false;
    }

    // Set error callback
    this->glfw_set_error_callback([](int error, const char* description) {
        std::cerr << "GLFW Error " << error << ": " << description << std::endl;
    });

    // Configure GLFW
    this->glfw_window_hint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    this->glfw_window_hint(GLFW_CONTEXT_VERSION_MINOR, 3);
    this->glfw_window_hint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    
    #ifdef __APPLE__
    this->glfw_window_hint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    #endif

    // Create window
    this->_window = this->glfw_create_window(this->_window_w, this->_window_h, "Realtime Whiteboard", nullptr, nullptr);
    if (!this->_window) {
        std::cerr << "Failed to create GLFW window" << std::endl;
        this->glfw_terminate();
        return false;
    }

    // Make context current
    this->glfw_make_context_current(this->_window);

    // Set key callback
    this->glfw_set_key_callback(this->_window, [](GLFWwindow* w, int key, int scancode, int action, int mods) {
        Canvas* canvas = static_cast<Canvas*>(::glfwGetWindowUserPointer(w));
        if (canvas) {
            canvas->key_callback(key, scancode, action, mods);
        }
    });

    // Store this instance as user pointer
    this->glfw_set_window_user_pointer(this->_window, this);

    // Get monitor
    this->_monitor = this->glfw_get_primary_monitor();

    return true;
}

void Canvas::cleanup() {
    if (this->_window) {
        this->glfw_destroy_window(this->_window);
        this->_window = nullptr;
    }
    this->glfw_terminate();
}

bool Canvas::is_fullscreen() const { return this->_is_fullscreen;} // is_fullscreen is a function that gets the fullscreen

int Canvas::get_window_x() const { return _window_x;} // get_window_x is a function that gets the window x

int Canvas::get_window_y() const { return _window_y;} // get_window_y is a function that gets the window y

int Canvas::get_window_height() const { return _window_h;} // get_window_height is a function that gets the window height

int Canvas::get_window_width() const { return _window_w;} // get_window_width is a function that gets the window width

void Canvas::set_is_fullscreen(bool fullscreen) { this->_is_fullscreen = fullscreen;} // set_is_fullscreen is a function that sets the fullscreen

void Canvas::set_window(GLFWwindow* window) { this->_window = window;} // set_window is a function that sets the window

void Canvas::toggle_fullscreen() {
    if (!this->is_fullscreen()) { // if the window is not fullscreen
        // Save window position and size
        this->glfw_get_window_pos(this->_window, &_window_x, &_window_y); // get the window position
        this->glfw_get_window_size(this->_window, &_window_w, &_window_h); // get the window size
        
        const GLFWvidmode* vm = this->glfw_get_video_mode(this->_monitor);
        this->glfw_set_window_monitor(this->_window, this->_monitor, 0, 0, vm->width, vm->height, vm->refreshRate);
        this->set_is_fullscreen(true);
    } else {
        // Restore window position and size
        this->glfw_set_window_monitor(this->_window, nullptr, _window_x, _window_y, _window_w, _window_h, 0);
        this->set_is_fullscreen(false);
    }
}

void Canvas::error_callback(int error, const char* description) { std::cerr << "GLFW Error " << error << ": " << description << std::endl;} // error_callback is a function that logs the error

void Canvas::key_callback(int key, int scancode, int action, int mods) {
    if (key == GLFW_KEY_ESCAPE && action == GLFW_PRESS) { this->glfw_set_window_should_close(this->_window, GLFW_TRUE);} // if the key is escape and the action is press, set the window should close
    if (key == GLFW_KEY_F11 && action == GLFW_PRESS) { this->toggle_fullscreen();} // if the key is f11 and the action is press, toggle the fullscreen
}

bool Canvas::should_close() const { return this->glfw_window_should_close(this->_window);} // should_close is a function that gets the window should close

void Canvas::swap_buffers() { this->glfw_swap_buffers(this->_window);} // swap_buffers is a function that swaps the buffers

void Canvas::poll_events() { this->glfw_poll_events();} // poll_events is a function that polls the events

GLFWwindow* Canvas::get_window() const { return this->_window;} // get_window is a function that gets the window
