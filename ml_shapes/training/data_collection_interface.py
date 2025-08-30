"""
Web interface for collecting real user drawing data.
Allows users to contribute to training dataset by drawing shapes.
"""

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Optional
import logging
from datetime import datetime
import sqlite3
from dataclasses import asdict

from data_generation_system import StrokeData
from dataset_manager import DatasetStorage, DatasetValidator


# Data models
class DrawingPoint(BaseModel):
    x: float
    y: float
    timestamp: Optional[float] = None
    pressure: Optional[float] = 1.0


class UserDrawing(BaseModel):
    points: List[DrawingPoint]
    shape_label: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    canvas_width: int = 800
    canvas_height: int = 600
    drawing_time_ms: Optional[int] = None
    metadata: Optional[Dict] = None


class DataCollectionAPI:
    """API for collecting user drawing data"""
    
    def __init__(self, storage_dir: str = "user_data"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.dataset_storage = DatasetStorage(self.storage_dir / "datasets")
        self.validator = DatasetValidator()
        
        # Initialize user data database
        self.db_path = self.storage_dir / "user_drawings.db"
        self._init_user_database()
        
        self.app = FastAPI(title="Shape Drawing Data Collection")
        self._setup_routes()
        
        # Setup static files and templates
        static_dir = self.storage_dir / "static"
        static_dir.mkdir(exist_ok=True)
        templates_dir = self.storage_dir / "templates" 
        templates_dir.mkdir(exist_ok=True)
        
        self.app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")
        self.templates = Jinja2Templates(directory=str(templates_dir))
        
        # Create the drawing interface HTML
        self._create_drawing_interface()
    
    def _init_user_database(self):
        """Initialize SQLite database for user drawings"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_drawings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                session_id TEXT,
                shape_label TEXT NOT NULL,
                num_points INTEGER,
                drawing_time_ms INTEGER,
                canvas_width INTEGER,
                canvas_height INTEGER,
                points_json TEXT NOT NULL,
                metadata_json TEXT,
                is_valid BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL,
                validated_at TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS collection_stats (
                shape_label TEXT PRIMARY KEY,
                total_collected INTEGER DEFAULT 0,
                total_valid INTEGER DEFAULT 0,
                last_updated TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _setup_routes(self):
        """Setup FastAPI routes"""
        
        @self.app.get("/", response_class=HTMLResponse)
        async def drawing_interface(request: Request):
            """Serve the drawing interface"""
            return self.templates.TemplateResponse("drawing_interface.html", {"request": request})
        
        @self.app.post("/api/submit_drawing")
        async def submit_drawing(drawing: UserDrawing):
            """Submit a user drawing for the dataset"""
            try:
                # Convert to StrokeData format
                points_array = np.array([[p.x, p.y] for p in drawing.points])
                
                stroke_data = StrokeData(
                    points=points_array,
                    shape_label=drawing.shape_label,
                    metadata={
                        "user_id": drawing.user_id,
                        "session_id": drawing.session_id,
                        "canvas_size": [drawing.canvas_width, drawing.canvas_height],
                        "drawing_time_ms": drawing.drawing_time_ms,
                        "collection_timestamp": datetime.now().isoformat(),
                        "point_timestamps": [p.timestamp for p in drawing.points if p.timestamp],
                        "point_pressures": [p.pressure for p in drawing.points if p.pressure],
                        **(drawing.metadata or {})
                    }
                )
                
                # Validate the drawing
                validation_result = self.validator.validate_stroke(stroke_data)
                is_valid = validation_result['is_valid']
                
                # Store in database
                drawing_id = self._store_user_drawing(drawing, stroke_data, is_valid, validation_result)
                
                # Update collection statistics
                self._update_collection_stats(drawing.shape_label, is_valid)
                
                return {
                    "success": True,
                    "drawing_id": drawing_id,
                    "is_valid": is_valid,
                    "validation_details": validation_result,
                    "message": "Drawing submitted successfully!" if is_valid else "Drawing submitted but failed validation."
                }
                
            except Exception as e:
                logging.error(f"Error processing drawing submission: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/api/collection_stats")
        async def get_collection_stats():
            """Get current collection statistics"""
            return self._get_collection_statistics()
        
        @self.app.get("/api/shape_requirements")
        async def get_shape_requirements():
            """Get requirements and examples for each shape type"""
            return {
                "shapes": {
                    "line": {
                        "description": "Draw a straight or slightly curved line",
                        "examples": ["horizontal line", "vertical line", "diagonal line", "slightly curved line"],
                        "tips": ["Keep it simple", "Don't make it too short", "One continuous stroke"]
                    },
                    "circle": {
                        "description": "Draw a circle or oval shape",
                        "examples": ["perfect circle", "oval", "slightly wobbly circle"],
                        "tips": ["Try to close the shape", "Can be imperfect", "One continuous stroke preferred"]
                    },
                    "rectangle": {
                        "description": "Draw a rectangular or square shape",
                        "examples": ["square", "rectangle", "slightly rounded corners"],
                        "tips": ["Try to close all corners", "Can be tilted", "Four-sided shape"]
                    },
                    "triangle": {
                        "description": "Draw a triangular shape",
                        "examples": ["equilateral triangle", "right triangle", "isosceles triangle"],
                        "tips": ["Three sides", "Try to close the shape", "Any triangle type"]
                    },
                    "arrow": {
                        "description": "Draw an arrow pointing in any direction",
                        "examples": ["right arrow", "left arrow", "up arrow", "down arrow"],
                        "tips": ["Clear shaft and head", "Point in any direction", "Keep proportions reasonable"]
                    },
                    "star": {
                        "description": "Draw a star shape",
                        "examples": ["5-pointed star", "6-pointed star", "4-pointed star"],
                        "tips": ["Multiple points radiating from center", "Can be any number of points", "Try to keep symmetrical"]
                    },
                    "diamond": {
                        "description": "Draw a diamond/rhombus shape",
                        "examples": ["diamond", "rhombus", "tilted square"],
                        "tips": ["Four sides of equal length", "Pointed top and bottom", "Can be any orientation"]
                    }
                }
            }
        
        @self.app.post("/api/export_dataset")
        async def export_collected_dataset(
            min_samples_per_class: int = 50,
            include_invalid: bool = False
        ):
            \"\"\"Export collected user data as training dataset\"\"\"
            try:
                dataset_name = f"user_collected_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                strokes = self._get_collected_strokes(min_samples_per_class, include_invalid)
                
                if not strokes:
                    return {"success": False, "message": "No data meets export criteria"}
                
                dataset_id = self.dataset_storage.save_dataset(
                    strokes, dataset_name, 
                    f"User-collected dataset with {len(strokes)} samples",
                    "user_contributed"
                )
                
                return {
                    "success": True,
                    "dataset_id": dataset_id,
                    "dataset_name": dataset_name,
                    "total_samples": len(strokes),
                    "classes": list(set(s.shape_label for s in strokes))
                }
                
            except Exception as e:
                logging.error(f"Error exporting dataset: {e}")
                raise HTTPException(status_code=500, detail=str(e))
    
    def _store_user_drawing(self, drawing: UserDrawing, stroke_data: StrokeData, 
                           is_valid: bool, validation_result: Dict) -> int:
        """Store user drawing in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO user_drawings (
                user_id, session_id, shape_label, num_points, drawing_time_ms,
                canvas_width, canvas_height, points_json, metadata_json,
                is_valid, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            drawing.user_id,
            drawing.session_id,
            drawing.shape_label,
            len(drawing.points),
            drawing.drawing_time_ms,
            drawing.canvas_width,
            drawing.canvas_height,
            json.dumps([[p.x, p.y] for p in drawing.points]),
            json.dumps(stroke_data.metadata),
            is_valid,
            datetime.now().isoformat()
        ))
        
        drawing_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return drawing_id
    
    def _update_collection_stats(self, shape_label: str, is_valid: bool):
        \"\"\"Update collection statistics\"\"\"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO collection_stats (shape_label, total_collected, total_valid, last_updated)
            VALUES (
                ?,
                COALESCE((SELECT total_collected FROM collection_stats WHERE shape_label = ?), 0) + 1,
                COALESCE((SELECT total_valid FROM collection_stats WHERE shape_label = ?), 0) + ?,
                ?
            )
        ''', (shape_label, shape_label, shape_label, 1 if is_valid else 0, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def _get_collection_statistics(self) -> Dict:
        \"\"\"Get current collection statistics\"\"\"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM collection_stats')
        stats = cursor.fetchall()
        
        result = {
            "total_drawings": 0,
            "total_valid": 0,
            "by_shape": {}
        }
        
        for row in stats:
            shape_label, total_collected, total_valid, last_updated = row
            result["total_drawings"] += total_collected
            result["total_valid"] += total_valid
            result["by_shape"][shape_label] = {
                "collected": total_collected,
                "valid": total_valid,
                "last_updated": last_updated
            }
        
        conn.close()
        return result
    
    def _get_collected_strokes(self, min_samples_per_class: int, include_invalid: bool) -> List[StrokeData]:
        \"\"\"Get collected strokes for dataset export\"\"\"
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get drawings based on criteria
        if include_invalid:
            cursor.execute('SELECT * FROM user_drawings')
        else:
            cursor.execute('SELECT * FROM user_drawings WHERE is_valid = TRUE')
        
        drawings = cursor.fetchall()
        conn.close()
        
        # Group by shape and filter by minimum samples
        strokes_by_shape = {}
        for drawing in drawings:
            shape_label = drawing[3]  # shape_label column
            if shape_label not in strokes_by_shape:
                strokes_by_shape[shape_label] = []
            
            # Reconstruct stroke data
            points_json = drawing[9]  # points_json column
            metadata_json = drawing[10]  # metadata_json column
            
            points = np.array(json.loads(points_json))
            metadata = json.loads(metadata_json) if metadata_json else {}
            
            stroke = StrokeData(
                points=points,
                shape_label=shape_label,
                metadata=metadata
            )
            strokes_by_shape[shape_label].append(stroke)
        
        # Filter by minimum samples per class
        filtered_strokes = []
        for shape_label, shape_strokes in strokes_by_shape.items():
            if len(shape_strokes) >= min_samples_per_class:
                filtered_strokes.extend(shape_strokes)
        
        return filtered_strokes
    
    def _create_drawing_interface(self):
        \"\"\"Create the HTML drawing interface\"\"\"
        html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shape Drawing Data Collection</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .drawing-area {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
        }
        .canvas-container {
            flex: 1;
        }
        canvas {
            border: 3px solid #ddd;
            border-radius: 8px;
            cursor: crosshair;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .controls {
            width: 300px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
        }
        .shape-selector {
            margin-bottom: 20px;
        }
        .shape-selector label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        .shape-selector select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            background: white;
        }
        .buttons {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        button {
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.2s;
        }
        .clear-btn {
            background: #ff6b6b;
            color: white;
        }
        .clear-btn:hover {
            background: #ff5252;
        }
        .submit-btn {
            background: #4ecdc4;
            color: white;
        }
        .submit-btn:hover {
            background: #26d0ce;
        }
        .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .instructions {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2196f3;
        }
        .instructions h3 {
            margin-top: 0;
            color: #1976d2;
        }
        .stats {
            margin-top: 30px;
            padding: 20px;
            background: #f0f0f0;
            border-radius: 8px;
        }
        .stats h3 {
            margin-top: 0;
            color: #333;
        }
        .shape-examples {
            margin-top: 15px;
            padding: 15px;
            background: white;
            border-radius: 6px;
            border: 1px solid #ddd;
        }
        .shape-examples h4 {
            margin: 0 0 10px 0;
            color: #666;
        }
        .shape-examples ul {
            margin: 5px 0;
            padding-left: 20px;
        }
        .shape-examples li {
            color: #777;
            margin: 3px 0;
        }
        .feedback {
            margin-top: 20px;
            padding: 15px;
            border-radius: 6px;
            display: none;
        }
        .feedback.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .feedback.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .drawing-info {
            margin-top: 15px;
            font-size: 14px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Shape Drawing Data Collection</h1>
        
        <div class="instructions">
            <h3>Instructions</h3>
            <p>Help us improve our shape detection AI by drawing shapes! Select a shape type below, then draw it on the canvas. Your drawings will help train our machine learning model.</p>
            <ul>
                <li>Draw each shape in one continuous stroke when possible</li>
                <li>Try to be reasonably accurate but don't worry about perfection</li>
                <li>Each drawing helps improve the AI for everyone</li>
            </ul>
        </div>
        
        <div class="drawing-area">
            <div class="canvas-container">
                <canvas id="drawingCanvas" width="800" height="600"></canvas>
                <div class="drawing-info">
                    <span id="drawingStatus">Ready to draw</span> | 
                    <span id="pointCount">Points: 0</span> |
                    <span id="drawingTime">Time: 0s</span>
                </div>
            </div>
            
            <div class="controls">
                <div class="shape-selector">
                    <label for="shapeSelect">Select Shape to Draw:</label>
                    <select id="shapeSelect">
                        <option value="line">Line</option>
                        <option value="circle">Circle</option>
                        <option value="rectangle">Rectangle</option>
                        <option value="triangle">Triangle</option>
                        <option value="arrow">Arrow</option>
                        <option value="star">Star</option>
                        <option value="diamond">Diamond</option>
                    </select>
                </div>
                
                <div class="shape-examples" id="shapeExamples">
                    <!-- Dynamic content based on selection -->
                </div>
                
                <div class="buttons">
                    <button class="clear-btn" onclick="clearCanvas()">Clear Canvas</button>
                    <button class="submit-btn" id="submitBtn" onclick="submitDrawing()" disabled>Submit Drawing</button>
                </div>
                
                <div class="feedback" id="feedback">
                    <!-- Feedback messages -->
                </div>
            </div>
        </div>
        
        <div class="stats" id="stats">
            <h3>Collection Progress</h3>
            <p>Loading statistics...</p>
        </div>
    </div>

    <script>
        // Canvas setup
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let points = [];
        let startTime = null;
        let shapeRequirements = {};
        
        // Drawing state
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Load shape requirements
        fetch('/api/shape_requirements')
            .then(response => response.json())
            .then(data => {
                shapeRequirements = data.shapes;
                updateShapeExamples();
            });
        
        // Canvas event listeners
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch support
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', stopDrawing);
        
        function handleTouch(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            if (e.type === 'touchstart') {
                startDrawing({offsetX: x, offsetY: y});
            } else if (e.type === 'touchmove') {
                draw({offsetX: x, offsetY: y});
            }
        }
        
        function startDrawing(e) {
            isDrawing = true;
            startTime = Date.now();
            points = [];
            
            const point = {
                x: e.offsetX,
                y: e.offsetY,
                timestamp: Date.now()
            };
            
            points.push(point);
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            
            updateDrawingInfo();
            document.getElementById('submitBtn').disabled = true;
        }
        
        function draw(e) {
            if (!isDrawing) return;
            
            const point = {
                x: e.offsetX,
                y: e.offsetY,
                timestamp: Date.now()
            };
            
            points.push(point);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            
            updateDrawingInfo();
        }
        
        function stopDrawing() {
            if (!isDrawing) return;
            isDrawing = false;
            
            if (points.length > 0) {
                document.getElementById('submitBtn').disabled = false;
                document.getElementById('drawingStatus').textContent = 'Drawing complete - ready to submit';
            }
        }
        
        function clearCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            points = [];
            startTime = null;
            document.getElementById('submitBtn').disabled = true;
            document.getElementById('drawingStatus').textContent = 'Ready to draw';
            document.getElementById('pointCount').textContent = 'Points: 0';
            document.getElementById('drawingTime').textContent = 'Time: 0s';
            hideFeedback();
        }
        
        function updateDrawingInfo() {
            document.getElementById('pointCount').textContent = `Points: ${points.length}`;
            if (startTime) {
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                document.getElementById('drawingTime').textContent = `Time: ${elapsed}s`;
            }
            document.getElementById('drawingStatus').textContent = isDrawing ? 'Drawing...' : 'Drawing paused';
        }
        
        function submitDrawing() {
            if (points.length === 0) {
                showFeedback('Please draw something first!', 'error');
                return;
            }
            
            const shapeLabel = document.getElementById('shapeSelect').value;
            const drawingTime = startTime ? Date.now() - startTime : null;
            
            const drawingData = {
                points: points,
                shape_label: shapeLabel,
                user_id: generateUserId(),
                session_id: generateSessionId(),
                canvas_width: canvas.width,
                canvas_height: canvas.height,
                drawing_time_ms: drawingTime,
                metadata: {
                    user_agent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                }
            };
            
            // Submit to API
            fetch('/api/submit_drawing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(drawingData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showFeedback(data.message + (data.is_valid ? ' Thank you!' : ' (Quality check failed, but still helpful)'), 'success');
                    clearCanvas();
                    loadStats();
                } else {
                    showFeedback('Error submitting drawing: ' + (data.message || 'Unknown error'), 'error');
                }
            })
            .catch(error => {
                showFeedback('Network error: ' + error.message, 'error');
            });
        }
        
        function updateShapeExamples() {
            const selectedShape = document.getElementById('shapeSelect').value;
            const examplesDiv = document.getElementById('shapeExamples');
            
            if (shapeRequirements[selectedShape]) {
                const shape = shapeRequirements[selectedShape];
                examplesDiv.innerHTML = `
                    <h4>${selectedShape.charAt(0).toUpperCase() + selectedShape.slice(1)}</h4>
                    <p><strong>Description:</strong> ${shape.description}</p>
                    <p><strong>Examples:</strong></p>
                    <ul>${shape.examples.map(ex => `<li>${ex}</li>`).join('')}</ul>
                    <p><strong>Tips:</strong></p>
                    <ul>${shape.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>
                `;
            }
        }
        
        function showFeedback(message, type) {
            const feedback = document.getElementById('feedback');
            feedback.textContent = message;
            feedback.className = `feedback ${type}`;
            feedback.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                hideFeedback();
            }, 5000);
        }
        
        function hideFeedback() {
            document.getElementById('feedback').style.display = 'none';
        }
        
        function generateUserId() {
            // Simple user ID based on browser fingerprint
            let userId = localStorage.getItem('drawing_user_id');
            if (!userId) {
                userId = 'user_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('drawing_user_id', userId);
            }
            return userId;
        }
        
        function generateSessionId() {
            return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }
        
        function loadStats() {
            fetch('/api/collection_stats')
                .then(response => response.json())
                .then(data => {
                    const statsDiv = document.getElementById('stats');
                    let html = `
                        <h3>Collection Progress</h3>
                        <p><strong>Total drawings:</strong> ${data.total_drawings} (${data.total_valid} valid)</p>
                        <h4>By Shape:</h4>
                    `;
                    
                    for (const [shape, stats] of Object.entries(data.by_shape)) {
                        html += `<p><strong>${shape}:</strong> ${stats.collected} collected (${stats.valid} valid)</p>`;
                    }
                    
                    statsDiv.innerHTML = html;
                })
                .catch(error => {
                    document.getElementById('stats').innerHTML = '<h3>Collection Progress</h3><p>Error loading statistics</p>';
                });
        }
        
        // Event listeners
        document.getElementById('shapeSelect').addEventListener('change', updateShapeExamples);
        
        // Initialize
        loadStats();
        updateShapeExamples();
        
        // Prevent scrolling when touching the canvas
        document.body.addEventListener('touchstart', function(e) {
            if (e.target === canvas) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchend', function(e) {
            if (e.target === canvas) {
                e.preventDefault();
            }
        }, { passive: false });
        
        document.body.addEventListener('touchmove', function(e) {
            if (e.target === canvas) {
                e.preventDefault();
            }
        }, { passive: false });
    </script>
</body>
</html>'''
        
        templates_dir = self.storage_dir / "templates"
        with open(templates_dir / "drawing_interface.html", "w") as f:
            f.write(html_content)
    
    def run_server(self, host: str = "0.0.0.0", port: int = 8000):
        """Run the data collection server"""
        import uvicorn
        logging.info(f"Starting data collection server at http://{host}:{port}")
        uvicorn.run(self.app, host=host, port=port)


# Usage example
if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Create and run data collection server
    collector = DataCollectionAPI(storage_dir="user_data_collection")
    collector.run_server(port=8000)