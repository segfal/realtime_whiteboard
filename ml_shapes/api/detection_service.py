from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import numpy as np
from typing import List, Tuple, Dict
import sys
import os
import uvicorn
from pathlib import Path

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.shape_detector import ShapeDetector

app = FastAPI(title="Shape Detection API", version="1.0.0")

# Global model instance
model = None

class StrokeData(BaseModel):
    points: List[List[float]]  # List of [x, y] coordinates
    stroke_id: str
    room_id: str

class ShapeDetectionResponse(BaseModel):
    shape: str
    confidence: float
    all_probabilities: Dict[str, float]
    refined_points: List[List[float]]

class ShapeRefinementService:
    """Service to refine detected shapes into perfect geometric forms"""
    
    @staticmethod
    def refine_rectangle(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect rectangle"""
        if len(points) == 0:
            return points
            
        min_x, min_y = np.min(points, axis=0)
        max_x, max_y = np.max(points, axis=0)
        
        return np.array([
            [min_x, min_y],  # Top-left
            [max_x, min_y],  # Top-right
            [max_x, max_y],  # Bottom-right
            [min_x, max_y],  # Bottom-left
            [min_x, min_y]   # Close the rectangle
        ])
    
    @staticmethod
    def refine_circle(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect circle"""
        if len(points) == 0:
            return points
            
        # Find center and radius
        center = np.mean(points, axis=0)
        distances = np.linalg.norm(points - center, axis=1)
        radius = np.mean(distances)
        
        # Generate circle points
        angles = np.linspace(0, 2*np.pi, 64)
        circle_points = center + radius * np.column_stack([
            np.cos(angles), np.sin(angles)
        ])
        
        return circle_points
    
    @staticmethod
    def refine_line(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect line"""
        if len(points) < 2:
            return points
            
        # Use first and last points
        start = points[0]
        end = points[-1]
        
        return np.array([start, end])
    
    @staticmethod
    def refine_triangle(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect triangle"""
        if len(points) < 3:
            return points
        
        # Find the 3 points that form the largest triangle
        max_area = 0
        best_triangle = points[:3]
        
        if len(points) >= 3:
            # Sample points to find best triangle
            sample_size = min(len(points), 20)
            indices = np.linspace(0, len(points)-1, sample_size, dtype=int)
            sample_points = points[indices]
            
            for i in range(len(sample_points)-2):
                for j in range(i+1, len(sample_points)-1):
                    for k in range(j+1, len(sample_points)):
                        triangle = sample_points[[i, j, k]]
                        area = ShapeRefinementService._triangle_area(triangle)
                        if area > max_area:
                            max_area = area
                            best_triangle = triangle
        
        # Close the triangle
        return np.vstack([best_triangle, best_triangle[0:1]])
    
    @staticmethod
    def _triangle_area(points: np.ndarray) -> float:
        """Calculate triangle area using cross product"""
        if len(points) != 3:
            return 0
        
        v1 = points[1] - points[0]
        v2 = points[2] - points[0]
        return 0.5 * abs(np.cross(v1, v2))

    @staticmethod
    def refine_arrow(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect arrow"""
        if len(points) < 4:
            return points
            
        # Simple arrow: start point, end point, and arrow head
        start = points[0]
        end = points[-1]
        
        # Arrow direction
        direction = end - start
        direction_norm = np.linalg.norm(direction)
        if direction_norm == 0:
            return points
            
        direction = direction / direction_norm
        perpendicular = np.array([-direction[1], direction[0]])
        
        # Arrow head
        head_length = direction_norm * 0.2
        head_width = direction_norm * 0.1
        
        head_back = end - direction * head_length
        head_top = head_back + perpendicular * head_width
        head_bottom = head_back - perpendicular * head_width
        
        return np.array([start, end, head_top, end, head_bottom])

    @staticmethod  
    def refine_star(points: np.ndarray) -> np.ndarray:
        """Convert points to perfect star"""
        if len(points) < 5:
            return points
            
        # Find center
        center = np.mean(points, axis=0)
        
        # Find average radius
        distances = np.linalg.norm(points - center, axis=1)
        outer_radius = np.max(distances)
        inner_radius = outer_radius * 0.4
        
        # Generate 5-pointed star
        star_points = []
        for i in range(5):
            # Outer point
            angle_outer = i * 2 * np.pi / 5 - np.pi / 2
            outer_point = center + outer_radius * np.array([np.cos(angle_outer), np.sin(angle_outer)])
            star_points.append(outer_point)
            
            # Inner point
            angle_inner = (i + 0.5) * 2 * np.pi / 5 - np.pi / 2
            inner_point = center + inner_radius * np.array([np.cos(angle_inner), np.sin(angle_inner)])
            star_points.append(inner_point)
        
        # Close the star
        star_points.append(star_points[0])
        
        return np.array(star_points)

@app.on_event("startup")
async def load_model():
    """Load the trained model on startup"""
    global model
    try:
        model = ShapeDetector(num_classes=7)
        model_path = Path('models/shape_detector.pth')
        
        if model_path.exists():
            model.load_state_dict(torch.load(model_path, map_location='cpu'))
            model.eval()
            print("✅ Shape detection model loaded successfully!")
        else:
            print("⚠️  Model file not found. Training a new model...")
            # Train a basic model if none exists
            from training.train_model import train_model
            model = train_model(epochs=20, batch_size=16)
            
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        model = None

@app.post("/detect", response_model=ShapeDetectionResponse)
async def detect_shape(stroke: StrokeData):
    """Detect and refine shape from stroke data"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Convert points to numpy array
        points = np.array(stroke.points)
        
        if len(points) < 2:
            return ShapeDetectionResponse(
                shape="freehand",
                confidence=0.0,
                all_probabilities={},
                refined_points=stroke.points
            )
        
        print(f"🔍 Detecting shape for stroke {stroke.stroke_id} with {len(points)} points")
        
        # Detect shape
        detection_result = model.predict_shape(points)
        
        print(f"🎯 Detected: {detection_result['shape']} ({detection_result['confidence']:.2f})")
        
        # Refine shape if confidence is high enough
        refined_points = points
        if detection_result["confidence"] > 0.7:
            shape_type = detection_result["shape"]
            refinement_service = ShapeRefinementService()
            
            if shape_type == "rectangle":
                refined_points = refinement_service.refine_rectangle(points)
            elif shape_type == "circle":
                refined_points = refinement_service.refine_circle(points)
            elif shape_type == "line":
                refined_points = refinement_service.refine_line(points)
            elif shape_type == "triangle":
                refined_points = refinement_service.refine_triangle(points)
            elif shape_type == "arrow":
                refined_points = refinement_service.refine_arrow(points)
            elif shape_type == "star":
                refined_points = refinement_service.refine_star(points)
            
            print(f"✨ Refined {shape_type} from {len(points)} to {len(refined_points)} points")
        
        return ShapeDetectionResponse(
            shape=detection_result["shape"],
            confidence=detection_result["confidence"],
            all_probabilities=detection_result["all_probabilities"],
            refined_points=refined_points.tolist()
        )
        
    except Exception as e:
        print(f"❌ Detection error: {e}")
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "model_loaded": model is not None,
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "Shape Detection API",
        "version": "1.0.0",
        "endpoints": {
            "detect": "POST /detect - Detect shapes from stroke data",
            "health": "GET /health - Health check",
            "docs": "GET /docs - API documentation"
        }
    }

if __name__ == "__main__":
    print("🚀 Starting Shape Detection API...")
    uvicorn.run(app, host="0.0.0.0", port=5050, log_level="info")
