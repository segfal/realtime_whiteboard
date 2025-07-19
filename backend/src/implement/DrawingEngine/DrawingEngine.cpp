#include "DrawingEngine.hpp"

DrawingEngine::DrawingEngine() {}

void DrawingEngine::addShape(std::unique_ptr<Shape> shape) {
    shapes.push_back(std::move(shape));
}

void DrawingEngine::addStroke(const StrokeShape& stroke) {
    // Create a unique_ptr to a copy of the stroke
    auto strokePtr = std::make_unique<StrokeShape>(stroke);
    shapes.push_back(std::move(strokePtr));
}

void DrawingEngine::addPointToStroke(int strokeIndex, const Point& pt) {
    // Find the stroke at the given index
    int strokeCount = 0;
    for (auto& shape : shapes) {
        if (shape->type == ShapeType::Stroke) {
            if (strokeCount == strokeIndex) {
                // Cast to StrokeShape and add point
                StrokeShape* strokeShape = dynamic_cast<StrokeShape*>(shape.get());
                if (strokeShape) {
                    strokeShape->points.push_back(pt);
                }
                return;
            }
            strokeCount++;
        }
    }
}

void DrawingEngine::removeShape(int index) {
    if (index >= 0 && index < shapes.size()) {
        shapes.erase(shapes.begin() + index);
    }
}

void DrawingEngine::removeStroke(int index) {
    // Find the stroke at the given index and remove it
    int strokeCount = 0;
    for (auto it = shapes.begin(); it != shapes.end(); ++it) {
        if ((*it)->type == ShapeType::Stroke) {
            if (strokeCount == index) {
                shapes.erase(it);
                return;
            }
            strokeCount++;
        }
    }
}

void DrawingEngine::moveShape(int index, float dx, float dy) {
    if (index >= 0 && index < shapes.size()) {
        Shape* shape = shapes[index].get();
        
        // Handle different shape types
        if (shape->type == ShapeType::Stroke) {
            StrokeShape* strokeShape = dynamic_cast<StrokeShape*>(shape);
            if (strokeShape) {
                for (auto& point : strokeShape->points) {
                    point.x += dx;
                    point.y += dy;
                }
            }
        }
        // Add other shape types here as needed
        // else if (shape->type == ShapeType::Rectangle) { ... }
    }
}

void DrawingEngine::moveStroke(int index, float dx, float dy) {
    // Find the stroke at the given index and move it
    int strokeCount = 0;
    for (auto& shape : shapes) {
        if (shape->type == ShapeType::Stroke) {
            if (strokeCount == index) {
                StrokeShape* strokeShape = dynamic_cast<StrokeShape*>(shape.get());
                if (strokeShape) {
                    for (auto& point : strokeShape->points) {
                        point.x += dx;
                        point.y += dy;
                    }
                }
                return;
            }
            strokeCount++;
        }
    }
}

void DrawingEngine::clear() {
    shapes.clear();
}

const std::vector<std::unique_ptr<Shape>>& DrawingEngine::getShapes() const {
    return shapes;
}

std::vector<StrokeShape> DrawingEngine::getStrokes() const {
    std::vector<StrokeShape> strokes;
    for (const auto& shape : shapes) {
        if (shape->type == ShapeType::Stroke) {
            const StrokeShape* strokeShape = dynamic_cast<const StrokeShape*>(shape.get());
            if (strokeShape) {
                strokes.push_back(*strokeShape);
            }
        }
    }
    return strokes;
}

std::vector<float> DrawingEngine::getVertexBufferData() const {
    std::vector<float> data;
    
    for (const auto& shape : shapes) {
        if (shape->type == ShapeType::Stroke) {
            const StrokeShape* strokeShape = dynamic_cast<const StrokeShape*>(shape.get());
            if (strokeShape) {
                // For each stroke, create vertices for WebGPU
                // Format: [x, y, r, g, b, a, thickness] for each point
                for (const auto& point : strokeShape->points) {
                    data.push_back(point.x);
                    data.push_back(point.y);
                    data.push_back(strokeShape->color.r);
                    data.push_back(strokeShape->color.g);
                    data.push_back(strokeShape->color.b);
                    data.push_back(strokeShape->color.a);
                    data.push_back(strokeShape->thickness);
                }
            }
        }
        // Add other shape types here as needed
        // else if (shape->type == ShapeType::Rectangle) { ... }
    }
    
    return data;
}