#include "./implement/DrawingEngine/DrawingEngine.hpp"
#include "./implement/stroke_shape.hpp"
#include "./implement/color.hpp"
#include "./implement/draw.hpp"
#include <iostream>

int main() {
    std::cout << "=== Simple Stroke Testing ===" << std::endl;
    
    DrawingEngine engine;
    
    // Test 1: Create a simple stroke
    std::cout << "\n1. Creating a red stroke with 3 points..." << std::endl;
    Color red(1.0f, 0.0f, 0.0f, 1.0f);
    std::vector<Point> points = {
        Point(10.0f, 10.0f),
        Point(20.0f, 20.0f),
        Point(30.0f, 15.0f)
    };
    StrokeShape stroke1(red, 3.0f, points);
    engine.addStroke(stroke1);
    
    auto strokes = engine.getStrokes();
    std::cout << "   Strokes in engine: " << strokes.size() << std::endl;
    std::cout << "   Points in first stroke: " << strokes[0].points.size() << std::endl;
    
    // Test 2: Add another stroke
    std::cout << "\n2. Adding a blue stroke..." << std::endl;
    Color blue(0.0f, 0.0f, 1.0f, 1.0f);
    StrokeShape stroke2(blue, 2.0f);
    engine.addStroke(stroke2);
    
    strokes = engine.getStrokes();
    std::cout << "   Strokes in engine: " << strokes.size() << std::endl;
    
    // Test 3: Add points to the second stroke
    std::cout << "\n3. Adding points to the blue stroke..." << std::endl;
    engine.addPointToStroke(1, Point(50.0f, 50.0f));
    engine.addPointToStroke(1, Point(60.0f, 60.0f));
    engine.addPointToStroke(1, Point(70.0f, 55.0f));
    
    strokes = engine.getStrokes();
    std::cout << "   Points in blue stroke: " << strokes[1].points.size() << std::endl;
    
    // Test 4: Remove a stroke
    std::cout << "\n4. Removing the first stroke..." << std::endl;
    engine.removeStroke(0);
    
    strokes = engine.getStrokes();
    std::cout << "   Strokes in engine: " << strokes.size() << std::endl;
    std::cout << "   Remaining stroke color: R=" << strokes[0].color.r 
              << " G=" << strokes[0].color.g 
              << " B=" << strokes[0].color.b << std::endl;
    
    // Test 5: Clear all strokes
    std::cout << "\n5. Clearing all strokes..." << std::endl;
    engine.clear();
    
    strokes = engine.getStrokes();
    std::cout << "   Strokes in engine: " << strokes.size() << std::endl;
    
    std::cout << "\n=== All tests completed ===" << std::endl;
    return 0;
}
