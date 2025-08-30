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
    
    // Test 6: RDP Algorithm Testing
    std::cout << "\n6. Testing RDP Algorithm..." << std::endl;
    
    // Create a complex stroke with many points
    std::vector<Point> complexPoints = {
        Point(0.0f, 0.0f),
        Point(1.0f, 0.1f),   // Close to line
        Point(2.0f, 0.2f),   // Close to line
        Point(3.0f, 0.3f),   // Close to line
        Point(4.0f, 0.4f),   // Close to line
        Point(5.0f, 0.5f),   // Close to line
        Point(6.0f, 0.6f),   // Close to line
        Point(7.0f, 0.7f),   // Close to line
        Point(8.0f, 0.8f),   // Close to line
        Point(9.0f, 0.9f),   // Close to line
        Point(10.0f, 1.0f)
    };
    
    StrokeShape complexStroke(red, 2.0f, complexPoints);
    engine.addStroke(complexStroke);
    
    strokes = engine.getStrokes();
    std::cout << "   Original points: " << strokes[0].points.size() << std::endl;
    
    // Test RDP simplification
    engine.simplifyStroke(0, 0.5f);
    
    strokes = engine.getStrokes();
    std::cout << "   After RDP simplification: " << strokes[0].points.size() << std::endl;
    
    // Test with different epsilon
    engine.clear();
    StrokeShape complexStroke2(red, 2.0f, complexPoints);
    engine.addStroke(complexStroke2);
    
    engine.simplifyStroke(0, 0.1f);  // Smaller epsilon = less simplification
    
    strokes = engine.getStrokes();
    std::cout << "   With epsilon=0.1: " << strokes[0].points.size() << " points" << std::endl;
    
    // Test RDP namespace directly
    std::cout << "\n7. Testing RDP namespace directly..." << std::endl;
    std::vector<Point> testPoints = {
        Point(0.0f, 0.0f),
        Point(1.0f, 0.1f),
        Point(2.0f, 0.0f)
    };
    
    auto simplified = RDP::simplify(testPoints, 0.5f);
    std::cout << "   Direct RDP test: " << testPoints.size() << " -> " << simplified.size() << " points" << std::endl;
    
    // Test 8: Verify simplifyStroke method is accessible
    std::cout << "\n8. Testing simplifyStroke method accessibility..." << std::endl;
    
    // Create a complex stroke for testing
    std::vector<Point> complexTestPoints = {
        Point(0.0f, 0.0f),
        Point(1.0f, 0.05f),
        Point(2.0f, 0.1f),
        Point(3.0f, 0.15f),
        Point(4.0f, 0.2f),
        Point(5.0f, 0.25f),
        Point(6.0f, 0.3f),
        Point(7.0f, 0.35f),
        Point(8.0f, 0.4f),
        Point(9.0f, 0.45f),
        Point(10.0f, 0.5f)
    };
    
    StrokeShape testStroke(red, 2.0f, complexTestPoints);
    engine.addStroke(testStroke);
    
    auto testStrokes = engine.getStrokes();
    std::cout << "   Before simplification: " << testStrokes[0].points.size() << " points" << std::endl;
    
    // Test the simplifyStroke method
    engine.simplifyStroke(0, 0.3f);
    
    testStrokes = engine.getStrokes();
    std::cout << "   After simplifyStroke: " << testStrokes[0].points.size() << " points" << std::endl;
    
    std::cout << "\n=== All tests completed ===" << std::endl;
    return 0;
}
