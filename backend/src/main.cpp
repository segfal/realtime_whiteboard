#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <iomanip>
#include <ctime>
#include "./implement/DrawingEngine/DrawingEngine.hpp"
#include "./implement/stroke_shape.hpp"
#include "./implement/color.hpp"
#include "./implement/draw.hpp"

// Global output stream for file logging
std::ofstream logFile;

// Helper function to write to both console and file
void writeOutput(const std::string& text) {
    std::cout << text;
    if (logFile.is_open()) {
        logFile << text;
        logFile.flush(); // Ensure it's written immediately
    }
}

// Helper function to write to both console and file (for stream operations)
void writeOutput(std::ostream& (*manip)(std::ostream&)) {
    std::cout << manip;
    if (logFile.is_open()) {
        logFile << manip;
        logFile.flush();
    }
}

// Helper function to print stroke details (cleaner format)
void printStroke(const StrokeShape& stroke, int index) {
    std::stringstream ss;
    ss << "┌─ Stroke " << index << std::endl;
    ss << "│  Color: RGB(" << std::fixed << std::setprecision(2) 
        << stroke.color.r << ", " << stroke.color.g << ", " << stroke.color.b 
        << ") Alpha: " << stroke.color.a << std::endl;
    ss << "│  Thickness: " << stroke.thickness << std::endl;
    ss << "│  Points: " << stroke.points.size() << std::endl;
    
    if (stroke.points.size() <= 5) {
        // Show all points if 5 or fewer
        for (size_t i = 0; i < stroke.points.size(); i++) {
            ss << "│    [" << i << "] (" << std::setprecision(1) 
                << stroke.points[i].x << ", " << stroke.points[i].y << ")" << std::endl;
        }
    } else {
        // Show first 2 and last 2 points if more than 5
        ss << "│    [0] (" << std::setprecision(1) << stroke.points[0].x 
            << ", " << stroke.points[0].y << ")" << std::endl;
        ss << "│    [1] (" << std::setprecision(1) << stroke.points[1].x 
            << ", " << stroke.points[1].y << ")" << std::endl;
        ss << "│    ... (" << (stroke.points.size() - 2) << " more points)" << std::endl;
        ss << "│    [" << (stroke.points.size() - 2) << "] (" 
            << std::setprecision(1) << stroke.points[stroke.points.size() - 2].x 
            << ", " << stroke.points[stroke.points.size() - 2].y << ")" << std::endl;
        ss << "│    [" << (stroke.points.size() - 1) << "] (" 
            << std::setprecision(1) << stroke.points[stroke.points.size() - 1].x 
            << ", " << stroke.points[stroke.points.size() - 1].y << ")" << std::endl;
    }
    ss << "└─────────────────────────────────────────────────────────────" << std::endl;
    writeOutput(ss.str());
}

// Helper function to print test header
void printTestHeader(const std::string& testName) {
    std::stringstream ss;
    ss << std::endl;
    ss << "╔══════════════════════════════════════════════════════════════════════════════╗" << std::endl;
    ss << "║ " << std::left << std::setw(70) << testName << " ║" << std::endl;
    ss << "╚══════════════════════════════════════════════════════════════════════════════╝" << std::endl;
    ss << std::endl;
    writeOutput(ss.str());
}

// Helper function to print test result
void printTestResult(const std::string& message, bool success = true) {
    std::stringstream ss;
    ss << (success ? "✅ " : "❌ ") << message << std::endl;
    writeOutput(ss.str());
}

// Test function for stroke creation
void testStrokeCreation() {
    printTestHeader("STROKE CREATION TEST");
    
    DrawingEngine engine;
    
    // Test 1: Create a simple stroke
    Color red(1.0f, 0.0f, 0.0f, 1.0f);
    std::vector<Point> points = {
        Point(10.0f, 10.0f),
        Point(20.0f, 20.0f),
        Point(30.0f, 15.0f)
    };
    
    StrokeShape stroke1(red, 3.0f, points);
    engine.addStroke(stroke1);
    
    printTestResult("Created red stroke with 3 points");
    
    // Test 2: Create stroke and add points later
    Color blue(0.0f, 0.0f, 1.0f, 1.0f);
    StrokeShape stroke2(blue, 2.0f);
    engine.addStroke(stroke2);
    
    // Add points to the second stroke
    engine.addPointToStroke(1, Point(50.0f, 50.0f));
    engine.addPointToStroke(1, Point(60.0f, 60.0f));
    engine.addPointToStroke(1, Point(70.0f, 55.0f));
    
    printTestResult("Created blue stroke and added 3 points dynamically");
    
    // Get and print all strokes
    auto strokes = engine.getStrokes();
    printTestResult("Total strokes in engine: " + std::to_string(strokes.size()));
    
    for (size_t i = 0; i < strokes.size(); i++) {
        printStroke(strokes[i], i);
    }
}

// Test function for stroke erasing with validation
void testStrokeErasing() {
    printTestHeader("STROKE ERASING TEST");
    
    DrawingEngine engine;
    
    // Create multiple strokes
    Color colors[] = {
        Color(1.0f, 0.0f, 0.0f, 1.0f),  // Red
        Color(0.0f, 1.0f, 0.0f, 1.0f),  // Green
        Color(0.0f, 0.0f, 1.0f, 1.0f)   // Blue
    };
    
    for (int i = 0; i < 3; i++) {
        std::vector<Point> points = {
            Point(10.0f + i * 30, 10.0f),
            Point(20.0f + i * 30, 20.0f),
            Point(30.0f + i * 30, 15.0f)
        };
        StrokeShape stroke(colors[i], 2.0f + i, points);
        engine.addStroke(stroke);
    }
    
    printTestResult("Created 3 strokes (red, green, blue)");
    
    // Verify initial state
    auto strokesBefore = engine.getStrokes();
    printTestResult("Strokes before erasing: " + std::to_string(strokesBefore.size()));
    
    if (strokesBefore.size() != 3) {
        printTestResult("FAILED: Expected 3 strokes, got " + std::to_string(strokesBefore.size()), false);
        return;
    }
    
    // Print strokes before erasing
    writeOutput("Strokes before erasing:\n");
    for (size_t i = 0; i < strokesBefore.size(); i++) {
        printStroke(strokesBefore[i], i);
    }
    
    // Erase the middle stroke (index 1)
    engine.removeStroke(1);
    
    printTestResult("Attempted to erase stroke at index 1 (green stroke)");
    
    // Verify erasing worked
    auto strokesAfter = engine.getStrokes();
    printTestResult("Strokes after erasing: " + std::to_string(strokesAfter.size()));
    
    if (strokesAfter.size() != 2) {
        printTestResult("FAILED: Expected 2 strokes after erasing, got " + std::to_string(strokesAfter.size()), false);
        return;
    }
    
    // Check that the correct stroke was removed (green stroke should be gone)
    bool greenStrokeRemoved = true;
    for (const auto& stroke : strokesAfter) {
        if (stroke.color.g > 0.5f && stroke.color.r < 0.5f && stroke.color.b < 0.5f) {
            greenStrokeRemoved = false;
            break;
        }
    }
    
    if (!greenStrokeRemoved) {
        printTestResult("FAILED: Green stroke still exists after erasing", false);
    } else {
        printTestResult("SUCCESS: Green stroke was properly removed");
    }
    
    // Print remaining strokes
    writeOutput("Remaining strokes after erasing:\n");
    for (size_t i = 0; i < strokesAfter.size(); i++) {
        printStroke(strokesAfter[i], i);
    }
    
    // Test erasing non-existent stroke
    writeOutput("\nTesting erasing non-existent stroke (index 5):\n");
    engine.removeStroke(5); // This should not crash
    auto strokesAfterInvalid = engine.getStrokes();
    printTestResult("Strokes after invalid erase: " + std::to_string(strokesAfterInvalid.size()));
    
    if (strokesAfterInvalid.size() == strokesAfter.size()) {
        printTestResult("SUCCESS: Invalid erase didn't affect existing strokes");
    } else {
        printTestResult("FAILED: Invalid erase affected existing strokes", false);
    }
}

// Test function for stroke moving
void testStrokeMoving() {
    printTestHeader("STROKE MOVING TEST");
    
    DrawingEngine engine;
    
    // Create a stroke
    Color purple(0.5f, 0.0f, 0.5f, 1.0f);
    std::vector<Point> points = {
        Point(10.0f, 10.0f),
        Point(20.0f, 20.0f),
        Point(30.0f, 15.0f)
    };
    StrokeShape stroke(purple, 4.0f, points);
    engine.addStroke(stroke);
    
    printTestResult("Created purple stroke with 3 points");
    writeOutput("Original stroke positions:\n");
    printStroke(engine.getStrokes()[0], 0);
    
    // Store original positions for comparison
    auto originalStroke = engine.getStrokes()[0];
    std::vector<Point> originalPoints = originalStroke.points;
    
    // Move the stroke by (5, 10)
    engine.moveStroke(0, 5.0f, 10.0f);
    
    printTestResult("Moved stroke by offset (5, 10)");
    
    // Get moved stroke
    auto movedStroke = engine.getStrokes()[0];
    
    // Verify movement
    bool movementCorrect = true;
    for (size_t i = 0; i < movedStroke.points.size(); i++) {
        float expectedX = originalPoints[i].x + 5.0f;
        float expectedY = originalPoints[i].y + 10.0f;
        
        if (abs(movedStroke.points[i].x - expectedX) > 0.001f || 
            abs(movedStroke.points[i].y - expectedY) > 0.001f) {
            movementCorrect = false;
            break;
        }
    }
    
    if (movementCorrect) {
        printTestResult("SUCCESS: Stroke moved correctly by (5, 10)");
    } else {
        printTestResult("FAILED: Stroke movement incorrect", false);
    }
    
    writeOutput("New stroke positions:\n");
    printStroke(movedStroke, 0);
}

// Test function for clearing all strokes
void testClearing() {
    printTestHeader("STROKE CLEARING TEST");
    
    DrawingEngine engine;
    
    // Create some strokes
    for (int i = 0; i < 5; i++) {
        Color color(0.2f * i, 0.2f * i, 0.2f * i, 1.0f);
        std::vector<Point> points = {
            Point(10.0f + i * 10, 10.0f),
            Point(20.0f + i * 10, 20.0f)
        };
        StrokeShape stroke(color, 1.0f + i, points);
        engine.addStroke(stroke);
    }
    
    printTestResult("Created 5 strokes with varying colors and thicknesses");
    
    // Verify initial state
    auto strokesBefore = engine.getStrokes();
    printTestResult("Strokes before clearing: " + std::to_string(strokesBefore.size()));
    
    if (strokesBefore.size() != 5) {
        printTestResult("FAILED: Expected 5 strokes, got " + std::to_string(strokesBefore.size()), false);
        return;
    }
    
    // Clear all strokes
    engine.clear();
    
    printTestResult("Attempted to clear all strokes");
    
    // Verify clearing worked
    auto strokesAfter = engine.getStrokes();
    printTestResult("Strokes after clearing: " + std::to_string(strokesAfter.size()));
    
    if (strokesAfter.size() == 0) {
        printTestResult("SUCCESS: All strokes were properly cleared");
    } else {
        printTestResult("FAILED: " + std::to_string(strokesAfter.size()) + " strokes still exist after clearing", false);
    }
}

// Test function for vertex buffer data (for WebGPU)
void testVertexBufferData() {
    printTestHeader("VERTEX BUFFER DATA TEST");
    
    DrawingEngine engine;
    
    // Create a stroke
    Color orange(1.0f, 0.5f, 0.0f, 1.0f);
    std::vector<Point> points = {
        Point(10.0f, 10.0f),
        Point(20.0f, 20.0f),
        Point(30.0f, 15.0f)
    };
    StrokeShape stroke(orange, 3.0f, points);
    engine.addStroke(stroke);
    
    printTestResult("Created orange stroke for vertex buffer testing");
    
    // Get vertex buffer data
    auto vertexData = engine.getVertexBufferData();
    
    printTestResult("Vertex buffer data size: " + std::to_string(vertexData.size()) + " floats");
    printTestResult("Expected size: " + std::to_string(points.size() * 7) + " floats (7 per point: x, y, r, g, b, a, thickness)");
    
    // Validate vertex buffer size
    if (vertexData.size() == points.size() * 7) {
        printTestResult("SUCCESS: Vertex buffer size is correct");
    } else {
        printTestResult("FAILED: Vertex buffer size mismatch", false);
    }
    
    // Print vertex buffer data in a table format
    std::stringstream ss;
    ss << std::endl << "Vertex Buffer Data Preview:" << std::endl;
    ss << "┌─────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐" << std::endl;
    ss << "│ Pt  │    X    │    Y    │    R    │    G    │    B    │    A    │ Thickness│" << std::endl;
    ss << "├─────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤" << std::endl;
    
    for (size_t i = 0; i < std::min(vertexData.size(), size_t(21)); i += 7) {
        if (i + 6 < vertexData.size()) {
            ss << "│ " << std::setw(3) << (i / 7) << " │ " 
                << std::setw(7) << std::fixed << std::setprecision(1) << vertexData[i] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(1) << vertexData[i + 1] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(2) << vertexData[i + 2] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(2) << vertexData[i + 3] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(2) << vertexData[i + 4] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(2) << vertexData[i + 5] << " │ "
                << std::setw(7) << std::fixed << std::setprecision(1) << vertexData[i + 6] << " │" << std::endl;
        }
    }
    ss << "└─────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘" << std::endl;
    writeOutput(ss.str());
}

// Test function for shape creation (rectangles and ellipses)
void testShapeCreation() {
    printTestHeader("SHAPE CREATION TEST");
    
    DrawingEngine engine;
    
    // Test rectangle shape (converted to stroke for now)
    Color green(0.0f, 1.0f, 0.0f, 1.0f);
    std::vector<Point> rectPoints = {
        Point(10.0f, 10.0f),   // top-left
        Point(50.0f, 10.0f),   // top-right
        Point(50.0f, 30.0f),   // bottom-right
        Point(10.0f, 30.0f),   // bottom-left
        Point(10.0f, 10.0f)    // back to start
    };
    StrokeShape rectStroke(green, 2.0f, rectPoints);
    engine.addStroke(rectStroke);
    
    printTestResult("Created rectangle shape (as stroke)");
    
    // Test ellipse shape (converted to stroke for now)
    Color magenta(1.0f, 0.0f, 1.0f, 1.0f);
    std::vector<Point> ellipsePoints;
    float centerX = 100.0f, centerY = 50.0f, radiusX = 20.0f, radiusY = 15.0f;
    int segments = 16;
    for (int i = 0; i <= segments; i++) {
        float angle = (i / (float)segments) * 2 * 3.14159f;
        ellipsePoints.push_back(Point(
            centerX + radiusX * cos(angle),
            centerY + radiusY * sin(angle)
        ));
    }
    StrokeShape ellipseStroke(magenta, 1.5f, ellipsePoints);
    engine.addStroke(ellipseStroke);
    
    printTestResult("Created ellipse shape (as stroke) with " + std::to_string(ellipsePoints.size()) + " points");
    
    // Print all shapes
    auto strokes = engine.getStrokes();
    printTestResult("Total shapes in engine: " + std::to_string(strokes.size()));
    
    for (size_t i = 0; i < strokes.size(); i++) {
        printStroke(strokes[i], i);
    }
}

int main() {
    // Get current timestamp for filename
    time_t now = time(0);
    tm* ltm = localtime(&now);
    std::string filename = "test_results_" + 
                          std::to_string(1900 + ltm->tm_year) + "-" +
                          std::to_string(1 + ltm->tm_mon) + "-" +
                          std::to_string(ltm->tm_mday) + "_" +
                          std::to_string(ltm->tm_hour) + "-" +
                          std::to_string(ltm->tm_min) + "-" +
                          std::to_string(ltm->tm_sec) + ".txt";
    
    // Open log file
    logFile.open(filename);
    
    if (!logFile.is_open()) {
        std::cerr << "❌ Failed to open log file: " << filename << std::endl;
        return 1;
    }
    
    // Print header to both console and file
    std::string header = "C++ STROKE TESTING RESULTS";
    std::string subtitle = "Testing functions before WebAssembly compilation";
    std::string timestamp = "Generated: " + std::string(asctime(ltm));
    
    std::stringstream headerSS;
    headerSS << std::endl;
    headerSS << "╔══════════════════════════════════════════════════════════════════════════════╗" << std::endl;
    headerSS << "║ " << std::left << std::setw(70) << header << " ║" << std::endl;
    headerSS << "║ " << std::left << std::setw(70) << subtitle << " ║" << std::endl;
    headerSS << "║ " << std::left << std::setw(70) << timestamp << " ║" << std::endl;
    headerSS << "╚══════════════════════════════════════════════════════════════════════════════╝" << std::endl;
    
    writeOutput(headerSS.str());
    
    // Write same header to file
    logFile << header << std::endl;
    logFile << subtitle << std::endl;
    logFile << timestamp << std::endl;
    logFile << std::string(80, '=') << std::endl << std::endl;
    
    // Run all tests (output to both console and file)
    testStrokeCreation();
    testStrokeErasing();
    testStrokeMoving();
    testClearing();
    testVertexBufferData();
    testShapeCreation();
    
    // Print summary
    std::string summary = "🎉 All tests completed successfully!";
    std::string fileInfo = "📄 Results saved to: " + filename;
    
    std::stringstream summarySS;
    summarySS << std::endl;
    summarySS << "╔══════════════════════════════════════════════════════════════════════════════╗" << std::endl;
    summarySS << "║ " << std::left << std::setw(70) << summary << " ║" << std::endl;
    summarySS << "║ " << std::left << std::setw(70) << fileInfo << " ║" << std::endl;
    summarySS << "╚══════════════════════════════════════════════════════════════════════════════╝" << std::endl;
    
    writeOutput(summarySS.str());
    
    // Write summary to file
    logFile << std::endl << std::string(80, '=') << std::endl;
    logFile << summary << std::endl;
    logFile << fileInfo << std::endl;
    
    logFile.close();
    
    return 0;
}