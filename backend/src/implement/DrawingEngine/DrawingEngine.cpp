#include "DrawingEngine.hpp"

DrawingEngine::DrawingEngine() {}

void DrawingEngine::addStroke(const Stroke& stroke) {
    strokes.push_back(stroke);
}

void DrawingEngine::addPointToStroke(int strokeIndex, const Point& pt) {
    if (strokeIndex >= 0 && strokeIndex < strokes.size()) {
        strokes[strokeIndex].points.push_back(pt);
    }
}

void DrawingEngine::removeStroke(int index) {
    if (index >= 0 && index < strokes.size()) {
        strokes.erase(strokes.begin() + index);
    }
}

void DrawingEngine::moveStroke(int index, float dx, float dy) {
    if (index >= 0 && index < strokes.size()) {
        for (auto& point : strokes[index].points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

void DrawingEngine::clear() {
    strokes.clear();
}

std::vector<Stroke> DrawingEngine::getStrokes() const {
    return strokes;
}

std::vector<float> DrawingEngine::getVertexBufferData() const {
    std::vector<float> data;
    
    for (const auto& stroke : strokes) {
        // For each stroke, create vertices for WebGPU
        // Format: [x, y, r, g, b, a, thickness] for each point
        for (const auto& point : stroke.points) {
            data.push_back(point.x);
            data.push_back(point.y);
            data.push_back(stroke.color.r);
            data.push_back(stroke.color.g);
            data.push_back(stroke.color.b);
            data.push_back(stroke.color.a);
            data.push_back(stroke.thickness);
        }
    }
    
    return data;
}