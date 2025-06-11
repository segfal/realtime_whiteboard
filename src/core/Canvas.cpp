#include "Canvas.h"
#include <skia/core/SkPath.h>
#include <skia/core/SkRRect.h>
#include <skia/core/SkTextBlob.h>
#include <skia/core/SkFont.h>
#include <skia/core/SkImageEncoder.h>
#include <nlohmann/json.hpp>

namespace whiteboard {

Canvas::Canvas(int width, int height)
    : width_(width)
    , height_(height)
    , currentStroke_(nullptr)
    , selectedStroke_(nullptr)
    , backgroundColor_(SK_ColorWHITE)
{
    surface_ = SkSurface::MakeRasterN32Premul(width, height);
    clear();
}

Canvas::~Canvas() = default;

void Canvas::startStroke(float x, float y, SkColor color, float thickness, bool isEraser) {
    strokes_.emplace_back(color, thickness, isEraser);
    currentStroke_ = &strokes_.back();
    currentStroke_->points.emplace_back(x, y);
}

void Canvas::continueStroke(float x, float y) {
    if (currentStroke_) {
        currentStroke_->points.emplace_back(x, y);
        redraw();
    }
}

void Canvas::endStroke() {
    if (currentStroke_) {
        redraw();
        currentStroke_ = nullptr;
    }
}

void Canvas::drawRectangle(float x1, float y1, float x2, float y2, SkColor color, float thickness) {
    SkPaint paint;
    paint.setColor(color);
    paint.setStrokeWidth(thickness);
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setAntiAlias(true);

    auto canvas = surface_->getCanvas();
    canvas->drawRect(SkRect::MakeLTRB(x1, y1, x2, y2), paint);
}

void Canvas::drawEllipse(float x1, float y1, float x2, float y2, SkColor color, float thickness) {
    SkPaint paint;
    paint.setColor(color);
    paint.setStrokeWidth(thickness);
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setAntiAlias(true);

    auto canvas = surface_->getCanvas();
    canvas->drawOval(SkRect::MakeLTRB(x1, y1, x2, y2), paint);
}

void Canvas::drawLine(float x1, float y1, float x2, float y2, SkColor color, float thickness) {
    SkPaint paint;
    paint.setColor(color);
    paint.setStrokeWidth(thickness);
    paint.setStyle(SkPaint::kStroke_Style);
    paint.setAntiAlias(true);

    auto canvas = surface_->getCanvas();
    canvas->drawLine(x1, y1, x2, y2, paint);
}

void Canvas::addText(float x, float y, const std::string& text, SkColor color, float size) {
    SkPaint paint;
    paint.setColor(color);
    paint.setAntiAlias(true);

    SkFont font;
    font.setSize(size);

    auto canvas = surface_->getCanvas();
    canvas->drawString(text.c_str(), x, y, font, paint);
}

void Canvas::clear() {
    auto canvas = surface_->getCanvas();
    canvas->clear(backgroundColor_);
}

void Canvas::resize(int width, int height) {
    width_ = width;
    height_ = height;
    surface_ = SkSurface::MakeRasterN32Premul(width, height);
    redraw();
}

void Canvas::setBackgroundColor(SkColor color) {
    backgroundColor_ = color;
    clear();
    redraw();
}

void Canvas::render(SkCanvas* target) {
    if (!target) return;
    target->drawImage(surface_->makeImageSnapshot().get(), 0, 0);
}

bool Canvas::selectStroke(float x, float y) {
    Point point(x, y);
    for (auto& stroke : strokes_) {
        if (hitTest(point, stroke)) {
            selectedStroke_ = &stroke;
            return true;
        }
    }
    selectedStroke_ = nullptr;
    return false;
}

void Canvas::moveSelected(float dx, float dy) {
    if (selectedStroke_) {
        for (auto& point : selectedStroke_->points) {
            point.x += dx;
            point.y += dy;
        }
        redraw();
    }
}

void Canvas::deleteSelected() {
    if (selectedStroke_) {
        auto it = std::find_if(strokes_.begin(), strokes_.end(),
            [this](const Stroke& s) { return &s == selectedStroke_; });
        if (it != strokes_.end()) {
            strokes_.erase(it);
            selectedStroke_ = nullptr;
            redraw();
        }
    }
}

bool Canvas::saveToPNG(const std::string& filename) {
    auto image = surface_->makeImageSnapshot();
    return SkEncodeImage(filename.c_str(), image.get(), SkEncodedImageFormat::kPNG, 100);
}

std::string Canvas::serializeToJSON() {
    nlohmann::json j;
    j["width"] = width_;
    j["height"] = height_;
    j["backgroundColor"] = backgroundColor_;
    
    nlohmann::json strokes = nlohmann::json::array();
    for (const auto& stroke : strokes_) {
        nlohmann::json s;
        s["color"] = stroke.color;
        s["thickness"] = stroke.thickness;
        s["isEraser"] = stroke.isEraser;
        
        nlohmann::json points = nlohmann::json::array();
        for (const auto& point : stroke.points) {
            points.push_back({{"x", point.x}, {"y", point.y}});
        }
        s["points"] = points;
        strokes.push_back(s);
    }
    j["strokes"] = strokes;
    
    return j.dump();
}

void Canvas::redraw() {
    clear();
    auto canvas = surface_->getCanvas();
    
    for (const auto& stroke : strokes_) {
        if (stroke.points.size() < 2) continue;
        
        SkPaint paint;
        paint.setColor(stroke.color);
        paint.setStrokeWidth(stroke.thickness);
        paint.setStyle(SkPaint::kStroke_Style);
        paint.setAntiAlias(true);
        
        SkPath path;
        path.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (size_t i = 1; i < stroke.points.size(); ++i) {
            path.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        
        canvas->drawPath(path, paint);
    }
}

bool Canvas::hitTest(const Point& point, const Stroke& stroke) {
    const float hitRadius = stroke.thickness / 2.0f;
    
    for (size_t i = 1; i < stroke.points.size(); ++i) {
        const Point& p1 = stroke.points[i - 1];
        const Point& p2 = stroke.points[i];
        
        // Calculate distance from point to line segment
        float dx = p2.x - p1.x;
        float dy = p2.y - p1.y;
        float length = std::sqrt(dx * dx + dy * dy);
        
        if (length < 0.0001f) continue;
        
        float t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / (length * length);
        t = std::max(0.0f, std::min(1.0f, t));
        
        float closestX = p1.x + t * dx;
        float closestY = p1.y + t * dy;
        
        float distance = std::sqrt(
            (point.x - closestX) * (point.x - closestX) +
            (point.y - closestY) * (point.y - closestY)
        );
        
        if (distance <= hitRadius) {
            return true;
        }
    }
    
    return false;
}

} // namespace whiteboard 