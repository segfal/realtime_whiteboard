#pragma once

#include <vector>
#include <memory>
#include <string>
#include <skia/core/SkCanvas.h>
#include <skia/core/SkSurface.h>
#include <skia/core/SkPaint.h>

namespace whiteboard {

struct Point {
    float x, y;
    Point(float x, float y) : x(x), y(y) {}
};

struct Stroke {
    std::vector<Point> points;
    SkColor color;
    float thickness;
    bool isEraser;

    Stroke(SkColor color, float thickness, bool isEraser = false)
        : color(color), thickness(thickness), isEraser(isEraser) {}
};

class Canvas {
public:
    Canvas(int width, int height);
    ~Canvas();

    // Drawing operations
    void startStroke(float x, float y, SkColor color, float thickness, bool isEraser = false);
    void continueStroke(float x, float y);
    void endStroke();
    
    // Tool operations
    void drawRectangle(float x1, float y1, float x2, float y2, SkColor color, float thickness);
    void drawEllipse(float x1, float y1, float x2, float y2, SkColor color, float thickness);
    void drawLine(float x1, float y1, float x2, float y2, SkColor color, float thickness);
    void addText(float x, float y, const std::string& text, SkColor color, float size);
    
    // Canvas operations
    void clear();
    void resize(int width, int height);
    void setBackgroundColor(SkColor color);
    
    // Rendering
    void render(SkCanvas* target);
    
    // Selection
    bool selectStroke(float x, float y);
    void moveSelected(float dx, float dy);
    void deleteSelected();
    
    // Export
    bool saveToPNG(const std::string& filename);
    std::string serializeToJSON();

private:
    std::unique_ptr<SkSurface> surface_;
    std::vector<Stroke> strokes_;
    Stroke* currentStroke_;
    Stroke* selectedStroke_;
    SkColor backgroundColor_;
    int width_, height_;

    void redraw();
    bool hitTest(const Point& point, const Stroke& stroke);
};

} // namespace whiteboard 