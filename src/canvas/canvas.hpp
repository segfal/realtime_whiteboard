#ifndef __CANVAS__
#define __CANVAS__
#include <GLFW/glfw3.h>

class Canvas {
    public:
        Canvas(); // constructor
        ~Canvas(); // destructor
        
        bool is_fullscreen() const; // get fullscreen
        int get_window_x() const; // window x direction size , returns int
        int get_window_y() const; // window y direction size , returns int
        int get_window_height() const; // window height direction size , returns int
        int get_window_width() const; // window width direction size , returns int
        void toggle_fullscreen();
        void error_callback(int error, const char* description);
        void key_callback(int key, int scancode, int action, int mods);
        void set_is_fullscreen(bool fullscreen);
        void set_window(GLFWwindow* window);
        
        // Window management
        bool init();
        void cleanup();
        bool should_close() const;
        void swap_buffers();
        void poll_events();
        GLFWwindow* get_window() const;

        // Snake case GLFW wrappers
        bool glfw_init();
        void glfw_terminate();
        void glfw_set_error_callback(void (*callback)(int, const char*));
        void glfw_window_hint(int hint, int value);
        GLFWwindow* glfw_create_window(int width, int height, const char* title, GLFWmonitor* monitor, GLFWwindow* share);
        void glfw_make_context_current(GLFWwindow* window);
        void glfw_set_key_callback(GLFWwindow* window, void (*callback)(GLFWwindow*, int, int, int, int));
        void glfw_set_window_user_pointer(GLFWwindow* window, void* pointer);
        void* glfw_get_window_user_pointer(GLFWwindow* window);
        GLFWmonitor* glfw_get_primary_monitor();
        const GLFWvidmode* glfw_get_video_mode(GLFWmonitor* monitor);
        void glfw_get_window_pos(GLFWwindow* window, int* xpos, int* ypos);
        void glfw_get_window_size(GLFWwindow* window, int* width, int* height);
        void glfw_set_window_monitor(GLFWwindow* window, GLFWmonitor* monitor, int xpos, int ypos, int width, int height, int refresh_rate);
        void glfw_set_window_should_close(GLFWwindow* window, int value);
        int glfw_window_should_close(GLFWwindow* window) const;
        void glfw_swap_buffers(GLFWwindow* window);
        void glfw_poll_events();
        void glfw_destroy_window(GLFWwindow* window);

    private:
        static int _window_x,_window_y,_window_h,_window_w;
        bool _is_fullscreen;
        GLFWwindow* _window;
        GLFWmonitor* _monitor;
};

#endif