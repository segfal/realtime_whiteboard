#pragma once

#include <vector>
#include <string>
#include <GLFW/glfw3.h>

namespace whiteboard {

class Canvas {
public:
    Canvas(int width, int height);
    ~Canvas();

    void clear(float r, float g, float b, float a);
    void drawLine(float x1, float y1, float x2, float y2, float width, float r, float g, float b, float a);
    void drawRectangle(float x, float y, float width, float height, float strokeWidth, float r, float g, float b, float a);
    void drawCircle(float x, float y, float radius, float strokeWidth, float r, float g, float b, float a);
    void drawText(float x, float y, const std::string& text, float fontSize, float r, float g, float b, float a);

    void render();
    void resize(int width, int height);

private:
    int width_;
    int height_;
};

} // namespace whiteboard 