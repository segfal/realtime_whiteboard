#pragma once
#include "../shape.hpp"
#include "../stroke_shape.hpp"
#include <vector>
#include <memory>

class DrawingEngine {
    public:
        DrawingEngine();
        
        // Shape management (replaces stroke management)
        void addShape(std::unique_ptr<Shape> shape);
        void addStroke(const StrokeShape& stroke);  // Backward compatibility
        void addPointToStroke(int strokeIndex, const Point& pt);  // Keep for backward compatibility
        void removeShape(int index);
        void removeStroke(int index);  // Backward compatibility
        void moveShape(int index, float dx, float dy);
        void moveStroke(int index, float dx, float dy);  // Backward compatibility
        void clear();
        
        // Access shapes
        const std::vector<std::unique_ptr<Shape>>& getShapes() const;
        
        // Backward compatibility - get strokes only
        std::vector<StrokeShape> getStrokes() const;
        
        // WebGPU vertex data
        std::vector<float> getVertexBufferData() const;

        // simplify with RDP
        void simplifyStroke(int index, float epsilon = 1.0f);
    
    private:
        std::vector<std::unique_ptr<Shape>> shapes;
    };
    