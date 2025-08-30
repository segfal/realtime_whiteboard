import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Tuple, Dict

class StrokeEncoder(nn.Module):
    """Encodes variable-length stroke data into fixed-size vectors"""
    
    def __init__(self, input_dim=2, hidden_dim=128, output_dim=64):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_dim * 2, output_dim)
        
    def forward(self, stroke_points):
        # stroke_points: (batch_size, seq_len, 2) - x,y coordinates
        lstm_out, (hidden, _) = self.lstm(stroke_points)
        # Use final hidden state
        final_hidden = torch.cat([hidden[0], hidden[1]], dim=1)  # Concatenate bidirectional
        return self.fc(final_hidden)

class ShapeClassifier(nn.Module):
    """Classifies encoded strokes into shape categories"""
    
    def __init__(self, input_dim=64, num_classes=7):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, num_classes)
        )
        
    def forward(self, encoded_stroke):
        return self.classifier(encoded_stroke)

class ShapeDetector(nn.Module):
    """Complete shape detection pipeline"""
    
    def __init__(self, num_classes=7):
        super().__init__()
        self.encoder = StrokeEncoder()
        self.classifier = ShapeClassifier(num_classes=num_classes)
        
        # Shape categories
        self.shape_labels = [
            "line", "rectangle", "circle", "triangle", 
            "arrow", "star", "freehand"
        ]
        
    def forward(self, stroke_points):
        encoded = self.encoder(stroke_points)
        logits = self.classifier(encoded)
        return logits
        
    def predict_shape(self, stroke_points: np.ndarray, confidence_threshold=0.7):
        """Predict shape from stroke points"""
        self.eval()
        with torch.no_grad():
            # Normalize stroke points
            stroke_points = self.normalize_stroke(stroke_points)
            
            # Convert to tensor
            stroke_tensor = torch.FloatTensor(stroke_points).unsqueeze(0)
            
            # Predict
            logits = self(stroke_tensor)
            probabilities = F.softmax(logits, dim=1)
            
            max_prob, predicted_class = torch.max(probabilities, 1)
            
            if max_prob.item() > confidence_threshold:
                return {
                    "shape": self.shape_labels[predicted_class.item()],
                    "confidence": max_prob.item(),
                    "all_probabilities": {
                        label: prob.item() 
                        for label, prob in zip(self.shape_labels, probabilities[0])
                    }
                }
            else:
                return {
                    "shape": "freehand",
                    "confidence": max_prob.item(),
                    "all_probabilities": {}
                }
    
    def normalize_stroke(self, points: np.ndarray) -> np.ndarray:
        """Normalize stroke points to [0,1] range"""
        if len(points) == 0:
            return points
            
        # Center the stroke
        center = np.mean(points, axis=0)
        centered = points - center
        
        # Scale to unit size
        max_extent = np.max(np.abs(centered))
        if max_extent > 0:
            normalized = centered / max_extent
        else:
            normalized = centered
            
        return normalized
