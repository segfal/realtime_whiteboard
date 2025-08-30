#include "./implement/DrawingEngine/DrawingEngine.hpp"
#include "./implement/stroke_shape.hpp"
#include "./implement/color.hpp"
#include "./implement/draw.hpp"
#include <iostream>

int main() {
    DrawingEngine engine;
    
    std::cout << "Testing stroke addition..." << std::endl;
    
    // Add a stroke
    Color red(1.0f, 0.0f, 0.0f, 1.0f);
    std::vector<Point> points = {Point(10, 10), Point(20, 20)};
    StrokeShape stroke(red, 2.0f, points);
    engine.addStroke(stroke);
    
    // Check if stroke was added
    auto strokes = engine.getStrokes();
    std::cout << "Strokes count: " << strokes.size() << std::endl;
    std::cout << "Points in stroke: " << strokes[0].points.size() << std::endl;
    
    if (strokes.size() == 1 && strokes[0].points.size() == 2) {
        std::cout << "SUCCESS: Stroke added correctly!" << std::endl;
        return 0;
    } else {
        std::cout << "FAILED: Stroke not added correctly!" << std::endl;
        return 1;
    }
}
