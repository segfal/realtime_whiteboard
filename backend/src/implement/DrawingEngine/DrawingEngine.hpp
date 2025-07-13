#pragma once
#include "../draw.hpp" 
#include <vector>

class DrawingEngine {
    public:
        DrawingEngine();
        
        // Stroke management
        void addStroke(const Stroke& stroke);
        void addPointToStroke(int strokeIndex, const Point& pt);  // ADD THIS
        void removeStroke(int index);
        void moveStroke(int index, float dx, float dy);
        void clear();
        
        // Access strokes
        std::vector<Stroke> getStrokes() const;
        
        // WebGPU vertex data
        std::vector<float> getVertexBufferData() const;
    
    private:
        std::vector<Stroke> strokes;
    };
    