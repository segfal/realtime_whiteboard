import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
from pathlib import Path
import json
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models.shape_detector import ShapeDetector

class SyntheticStrokeDataset(Dataset):
    """Generate synthetic stroke data for training"""
    
    def __init__(self, num_samples=10000, max_points=50):
        self.num_samples = num_samples
        self.max_points = max_points
        self.shape_labels = ["line", "rectangle", "circle", "triangle", "arrow", "star", "freehand"]
        
    def __len__(self):
        return self.num_samples
    
    def __getitem__(self, idx):
        # Generate random shape
        shape_idx = idx % len(self.shape_labels)
        shape_name = self.shape_labels[shape_idx]
        
        # Generate points based on shape
        if shape_name == "line":
            points = self.generate_line()
        elif shape_name == "rectangle":
            points = self.generate_rectangle()
        elif shape_name == "circle":
            points = self.generate_circle()
        elif shape_name == "triangle":
            points = self.generate_triangle()
        elif shape_name == "arrow":
            points = self.generate_arrow()
        elif shape_name == "star":
            points = self.generate_star()
        else:  # freehand
            points = self.generate_freehand()
        
        # Add noise
        noise = np.random.normal(0, 0.02, points.shape)
        points = points + noise
        
        # Pad or truncate to max_points
        points = self.normalize_points(points)
        
        return torch.FloatTensor(points), torch.LongTensor([shape_idx])
    
    def normalize_points(self, points):
        """Normalize to max_points length"""
        if len(points) > self.max_points:
            # Sample points uniformly
            indices = np.linspace(0, len(points)-1, self.max_points, dtype=int)
            points = points[indices]
        elif len(points) < self.max_points:
            # Pad with last point
            if len(points) > 0:
                padding = np.tile(points[-1], (self.max_points - len(points), 1))
                points = np.vstack([points, padding])
            else:
                points = np.zeros((self.max_points, 2))
        
        return points
    
    def generate_line(self):
        """Generate a line stroke"""
        start = np.random.uniform(-1, 1, 2)
        end = np.random.uniform(-1, 1, 2)
        num_points = np.random.randint(10, 30)
        t = np.linspace(0, 1, num_points)
        points = start + t[:, np.newaxis] * (end - start)
        return points
    
    def generate_rectangle(self):
        """Generate a rectangle stroke"""
        center = np.random.uniform(-0.5, 0.5, 2)
        width = np.random.uniform(0.5, 1.5)
        height = np.random.uniform(0.5, 1.5)
        
        # Rectangle corners
        corners = np.array([
            [center[0] - width/2, center[1] - height/2],  # bottom-left
            [center[0] + width/2, center[1] - height/2],  # bottom-right
            [center[0] + width/2, center[1] + height/2],  # top-right
            [center[0] - width/2, center[1] + height/2],  # top-left
            [center[0] - width/2, center[1] - height/2],  # close
        ])
        
        # Sample points along the rectangle
        points = []
        for i in range(len(corners) - 1):
            start, end = corners[i], corners[i + 1]
            num_points = np.random.randint(5, 15)
            t = np.linspace(0, 1, num_points)
            segment_points = start + t[:, np.newaxis] * (end - start)
            points.extend(segment_points)
        
        return np.array(points)
    
    def generate_circle(self):
        """Generate a circle stroke"""
        center = np.random.uniform(-0.5, 0.5, 2)
        radius = np.random.uniform(0.3, 0.8)
        num_points = np.random.randint(20, 50)
        
        angles = np.linspace(0, 2*np.pi, num_points)
        points = center + radius * np.column_stack([np.cos(angles), np.sin(angles)])
        return points
    
    def generate_triangle(self):
        """Generate a triangle stroke"""
        center = np.random.uniform(-0.5, 0.5, 2)
        size = np.random.uniform(0.5, 1.0)
        
        # Triangle vertices
        vertices = np.array([
            [center[0], center[1] + size * 0.6],  # top
            [center[0] - size * 0.5, center[1] - size * 0.3],  # bottom-left
            [center[0] + size * 0.5, center[1] - size * 0.3],  # bottom-right
            [center[0], center[1] + size * 0.6],  # close
        ])
        
        # Sample points along the triangle
        points = []
        for i in range(len(vertices) - 1):
            start, end = vertices[i], vertices[i + 1]
            num_points = np.random.randint(5, 15)
            t = np.linspace(0, 1, num_points)
            segment_points = start + t[:, np.newaxis] * (end - start)
            points.extend(segment_points)
        
        return np.array(points)
    
    def generate_arrow(self):
        """Generate an arrow stroke"""
        # Arrow shaft
        start = np.array([-0.8, 0.0])
        end = np.array([0.5, 0.0])
        
        # Arrow head
        head_length = 0.3
        head_width = 0.2
        
        points = []
        
        # Shaft
        num_shaft_points = np.random.randint(10, 20)
        t = np.linspace(0, 1, num_shaft_points)
        shaft_points = start + t[:, np.newaxis] * (end - start)
        points.extend(shaft_points)
        
        # Arrow head
        head_tip = end + np.array([head_length, 0])
        head_top = end + np.array([0, head_width/2])
        head_bottom = end + np.array([0, -head_width/2])
        
        # Top arrow line
        num_head_points = np.random.randint(5, 10)
        t = np.linspace(0, 1, num_head_points)
        top_line = head_top + t[:, np.newaxis] * (head_tip - head_top)
        points.extend(top_line)
        
        # Bottom arrow line
        bottom_line = head_tip + t[:, np.newaxis] * (head_bottom - head_tip)
        points.extend(bottom_line)
        
        return np.array(points)
    
    def generate_star(self):
        """Generate a star stroke"""
        center = np.random.uniform(-0.5, 0.5, 2)
        outer_radius = np.random.uniform(0.4, 0.8)
        inner_radius = outer_radius * 0.4
        num_points_per_ray = 5
        
        points = []
        for i in range(5):  # 5-pointed star
            # Outer point
            angle_outer = i * 2 * np.pi / 5 - np.pi / 2
            outer_point = center + outer_radius * np.array([np.cos(angle_outer), np.sin(angle_outer)])
            
            # Inner point
            angle_inner = (i + 0.5) * 2 * np.pi / 5 - np.pi / 2
            inner_point = center + inner_radius * np.array([np.cos(angle_inner), np.sin(angle_inner)])
            
            # Add points for this ray
            if i > 0:
                # Connect from previous inner point
                prev_inner_angle = (i - 0.5) * 2 * np.pi / 5 - np.pi / 2
                prev_inner = center + inner_radius * np.array([np.cos(prev_inner_angle), np.sin(prev_inner_angle)])
                t = np.linspace(0, 1, num_points_per_ray)
                segment = prev_inner + t[:, np.newaxis] * (outer_point - prev_inner)
                points.extend(segment)
            else:
                points.append(outer_point)
            
            # To inner point
            t = np.linspace(0, 1, num_points_per_ray)
            segment = outer_point + t[:, np.newaxis] * (inner_point - outer_point)
            points.extend(segment)
        
        # Close the star
        if len(points) > 0:
            points.append(points[0])
        
        return np.array(points)
    
    def generate_freehand(self):
        """Generate a freehand stroke"""
        num_points = np.random.randint(10, 40)
        # Random walk
        points = [np.random.uniform(-1, 1, 2)]
        
        for _ in range(num_points - 1):
            step = np.random.normal(0, 0.1, 2)
            next_point = points[-1] + step
            # Keep within bounds
            next_point = np.clip(next_point, -1, 1)
            points.append(next_point)
        
        return np.array(points)

def train_model(epochs=50, batch_size=32):
    """Train the shape detection model"""
    
    print("🏋️ Starting shape detection model training...")
    
    # Setup dataset and dataloader
    dataset = SyntheticStrokeDataset(num_samples=10000)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    # Initialize model
    model = ShapeDetector(num_classes=7)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    print(f"📊 Training with {len(dataset)} synthetic samples")
    print(f"🔢 Shape categories: {dataset.shape_labels}")
    
    # Training loop
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (batch_points, batch_labels) in enumerate(dataloader):
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model(batch_points)
            loss = criterion(outputs, batch_labels.squeeze())
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            # Statistics
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += batch_labels.size(0)
            correct += (predicted == batch_labels.squeeze()).sum().item()
        
        # Print progress
        if epoch % 10 == 0 or epoch == epochs - 1:
            accuracy = 100 * correct / total
            avg_loss = total_loss / len(dataloader)
            print(f'📈 Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%')
    
    # Save model
    model_path = Path('models/shape_detector.pth')
    model_path.parent.mkdir(exist_ok=True)
    torch.save(model.state_dict(), model_path)
    print(f"✅ Model saved to {model_path}")
    
    # Test with some examples
    print("\n🧪 Testing model with synthetic examples...")
    model.eval()
    test_dataset = SyntheticStrokeDataset(num_samples=100)
    
    correct_predictions = 0
    total_predictions = 0
    
    for i in range(min(20, len(test_dataset))):
        points, label = test_dataset[i]
        shape_name = test_dataset.shape_labels[label.item()]
        
        # Test prediction
        result = model.predict_shape(points.numpy())
        predicted_shape = result["shape"]
        confidence = result["confidence"]
        
        is_correct = predicted_shape == shape_name
        if is_correct:
            correct_predictions += 1
        total_predictions += 1
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Expected: {shape_name}, Predicted: {predicted_shape} ({confidence:.2f})")
    
    test_accuracy = 100 * correct_predictions / total_predictions
    print(f"\n🎯 Test Accuracy: {test_accuracy:.1f}% ({correct_predictions}/{total_predictions})")
    
    return model

if __name__ == "__main__":
    model = train_model(epochs=50, batch_size=32)
    print("🎉 Training complete!")
