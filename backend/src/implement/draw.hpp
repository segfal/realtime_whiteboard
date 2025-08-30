#pragma once
#include <vector>
#include <cmath>
#include <algorithm>
#include "color.hpp"

struct Point {
    float x, y;
    Point(float x=0, float y=0) : x(x), y(y) {}
};

struct Stroke {
    std::vector<Point> points;
    Color color;
    float thickness;
    bool isEraser;
    Stroke(const Color& color = Color(), float thickness = 2.0f) : color(color), thickness(thickness),isEraser(false) {}
};

// RDP Algorithm - belongs here because it operates on Point vectors
namespace RDP {
    inline float pointToLineDistance(const Point& point, const Point& lineStart, const Point& lineEnd) {
        float A = point.x - lineStart.x;
        float B = point.y - lineStart.y;
        float C = lineEnd.x - lineStart.x;
        float D = lineEnd.y - lineStart.y;
        
        float dot = A * C + B * D;
        float lenSq = C * C + D * D;
        
        if (lenSq == 0) return sqrt(A * A + B * B);
        
        float param = dot / lenSq;
        
        float xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        float dx = point.x - xx;
        float dy = point.y - yy;
        return sqrt(dx * dx + dy * dy);
    }

    inline std::vector<Point> simplify(const std::vector<Point>& points, float epsilon) {
        if (points.size() <= 2) return points;
        
        float maxDistance = 0;
        size_t maxIndex = 0;
        
        for (size_t i = 1; i < points.size() - 1; i++) {
            float distance = pointToLineDistance(points[i], points[0], points[points.size() - 1]);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        if (maxDistance > epsilon) {
            std::vector<Point> firstHalf(points.begin(), points.begin() + maxIndex + 1);
            std::vector<Point> secondHalf(points.begin() + maxIndex, points.end());
            
            auto firstResult = simplify(firstHalf, epsilon);
            auto secondResult = simplify(secondHalf, epsilon);
            
            firstResult.pop_back();
            firstResult.insert(firstResult.end(), secondResult.begin(), secondResult.end());
            return firstResult;
        } else {
            return {points[0], points[points.size() - 1]};
        }
    }
}