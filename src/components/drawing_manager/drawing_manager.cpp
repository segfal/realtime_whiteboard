#include "drawing_manager.hpp"

DrawingManager::DrawingManager() {}

DrawingManager::~DrawingManager() {}

void DrawingManager::draw_line(int x1, int y1, int x2, int y2) {
    this->draw_line_impl(x1, y1, x2, y2);
}

void DrawingManager::draw_circle(int x, int y, int radius) {
    this->draw_circle_impl(x, y, radius);
}

void DrawingManager::draw_rectangle(int x, int y, int width, int height) {
    this->draw_rectangle_impl(x, y, width, height);
}

void DrawingManager::draw_triangle(int x1, int y1, int x2, int y2, int x3, int y3) {
    this->draw_triangle_impl(x1, y1, x2, y2, x3, y3);
}

void DrawingManager::draw_polygon(int x[], int y[], int n) {
    this->draw_polygon_impl(x, y, n);
}

void DrawingManager::draw_text(int x, int y, const char* text) {
    this->draw_text_impl(x, y, text);
}

void DrawingManager::draw_image(int x, int y, const char* image) {
    this->draw_image_impl(x, y, image);
}

void DrawingManager::draw_line_impl(int x1, int y1, int x2, int y2) {
    // Implementation of draw_line_impl
}

void DrawingManager::draw_circle_impl(int x, int y, int radius) {
    // Implementation of draw_circle_impl
}  

void DrawingManager::draw_rectangle_impl(int x, int y, int width, int height) {
    // Implementation of draw_rectangle_impl
}

void DrawingManager::draw_triangle_impl(int x1, int y1, int x2, int y2, int x3, int y3) {
    // Implementation of draw_triangle_impl
}

void DrawingManager::draw_polygon_impl(int x[], int y[], int n) {
    // Implementation of draw_polygon_impl
}

void DrawingManager::draw_text_impl(int x, int y, const char* text) {
    // Implementation of draw_text_impl
}

void DrawingManager::draw_image_impl(int x, int y, const char* image) {
    // Implementation of draw_image_impl
}


