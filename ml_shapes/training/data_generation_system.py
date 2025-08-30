"""
Comprehensive training data generation system for shape detection.
Combines multiple data sources for robust training.
"""

import numpy as np
import cv2
import json
import matplotlib.pyplot as plt
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import random
import math
from PIL import Image, ImageDraw, ImageFont
import torch
from torch.utils.data import Dataset


@dataclass
class StrokeData:
    """Container for stroke training data"""
    points: np.ndarray  # (N, 2) array of x,y coordinates
    shape_label: str    # Shape category
    metadata: Dict      # Additional info (speed, pressure, etc.)


class HighQualityShapeGenerator:
    """Generate mathematically perfect and varied shapes"""
    
    def __init__(self, canvas_size=(512, 512), noise_level=0.02):
        self.canvas_size = canvas_size
        self.noise_level = noise_level
        self.shape_categories = {
            "line": self._generate_line_variations,
            "rectangle": self._generate_rectangle_variations,
            "circle": self._generate_circle_variations,
            "triangle": self._generate_triangle_variations,
            "arrow": self._generate_arrow_variations,
            "star": self._generate_star_variations,
            "diamond": self._generate_diamond_variations,
            "oval": self._generate_oval_variations,
            "pentagon": self._generate_pentagon_variations,
            "hexagon": self._generate_hexagon_variations,
        }
    
    def generate_shape(self, shape_type: str, variation_params: Dict = None) -> StrokeData:
        """Generate a single shape with specified parameters"""
        if shape_type not in self.shape_categories:
            raise ValueError(f"Unknown shape type: {shape_type}")
        
        generator_func = self.shape_categories[shape_type]
        points, metadata = generator_func(variation_params or {})
        
        # Add realistic drawing variations
        points = self._add_human_variations(points, metadata)
        
        return StrokeData(
            points=points,
            shape_label=shape_type,
            metadata=metadata
        )
    
    def _generate_line_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        """Generate various line types"""
        line_types = params.get('line_type', random.choice(['straight', 'slightly_curved', 'dashed']))
        
        # Base line parameters
        start = np.array([random.uniform(0.1, 0.9), random.uniform(0.1, 0.9)]) * self.canvas_size[0]
        length = random.uniform(100, 400)
        angle = random.uniform(0, 2 * np.pi)
        end = start + length * np.array([np.cos(angle), np.sin(angle)])
        
        if line_types == 'straight':
            num_points = random.randint(15, 50)
            t = np.linspace(0, 1, num_points)
            points = start + t[:, np.newaxis] * (end - start)
            
        elif line_types == 'slightly_curved':
            num_points = random.randint(20, 60)
            t = np.linspace(0, 1, num_points)
            # Add subtle curve
            curve_strength = random.uniform(0.1, 0.3)
            curve = curve_strength * length * np.sin(np.pi * t)
            perpendicular = np.array([-(end[1] - start[1]), end[0] - start[0]])
            perpendicular = perpendicular / (np.linalg.norm(perpendicular) + 1e-8)
            
            points = start + t[:, np.newaxis] * (end - start)
            points += curve[:, np.newaxis] * perpendicular
            
        else:  # dashed
            num_dashes = random.randint(3, 8)
            points = []
            for i in range(num_dashes):
                dash_start = i / num_dashes
                dash_end = min((i + 0.6) / num_dashes, 1.0)  # 60% line, 40% gap
                dash_t = np.linspace(dash_start, dash_end, random.randint(5, 15))
                dash_points = start + dash_t[:, np.newaxis] * (end - start)
                points.extend(dash_points)
            points = np.array(points)
        
        metadata = {
            'line_type': line_types,
            'length': length,
            'angle': angle,
            'drawing_speed': random.uniform(0.5, 2.0)
        }
        
        return points, metadata
    
    def _generate_circle_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        """Generate various circle types"""
        circle_type = params.get('circle_type', random.choice(['perfect', 'wobbly', 'spiral']))
        
        center = np.array([random.uniform(0.2, 0.8), random.uniform(0.2, 0.8)]) * self.canvas_size[0]
        radius = random.uniform(50, 200)
        num_points = random.randint(30, 100)
        
        if circle_type == 'perfect':
            angles = np.linspace(0, 2*np.pi, num_points)
            points = center + radius * np.column_stack([np.cos(angles), np.sin(angles)])
            
        elif circle_type == 'wobbly':
            angles = np.linspace(0, 2*np.pi, num_points)
            # Add wobble to radius
            wobble = radius * 0.1 * np.sin(angles * random.randint(3, 8) + random.uniform(0, 2*np.pi))
            actual_radius = radius + wobble
            points = center + actual_radius[:, np.newaxis] * np.column_stack([np.cos(angles), np.sin(angles)])
            
        else:  # spiral
            angles = np.linspace(0, 2*np.pi * random.uniform(1.5, 3), num_points)
            spiral_factor = random.uniform(0.8, 1.2)
            actual_radius = radius * (1 - spiral_factor * (angles / angles[-1]) * 0.3)
            points = center + actual_radius[:, np.newaxis] * np.column_stack([np.cos(angles), np.sin(angles)])
        
        metadata = {
            'circle_type': circle_type,
            'radius': radius,
            'center': center.tolist(),
            'completion': random.uniform(0.8, 1.0)
        }
        
        return points, metadata
    
    def _generate_rectangle_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        """Generate various rectangle types"""
        rect_type = params.get('rect_type', random.choice(['sharp_corners', 'rounded_corners', 'tilted']))
        
        center = np.array([random.uniform(0.3, 0.7), random.uniform(0.3, 0.7)]) * self.canvas_size[0]
        width = random.uniform(80, 250)
        height = random.uniform(60, 200)
        
        # Base corners
        corners = np.array([
            [-width/2, -height/2], [width/2, -height/2],
            [width/2, height/2], [-width/2, height/2], [-width/2, -height/2]
        ])
        
        if rect_type == 'tilted':
            angle = random.uniform(-np.pi/6, np.pi/6)  # ±30 degrees
            rotation_matrix = np.array([[np.cos(angle), -np.sin(angle)], 
                                      [np.sin(angle), np.cos(angle)]])
            corners = corners @ rotation_matrix.T
        
        corners += center
        
        # Generate points along edges
        points = []
        for i in range(len(corners) - 1):
            start, end = corners[i], corners[i + 1]
            edge_points = random.randint(8, 20)
            
            if rect_type == 'rounded_corners' and i < 4:  # Not the closing edge
                # Add rounded corner
                t_edge = np.linspace(0, 0.8, edge_points)  # Don't go to corner
                edge_stroke = start + t_edge[:, np.newaxis] * (end - start)
                
                # Round the corner
                corner_radius = min(width, height) * 0.1
                corner_center = corners[i+1]
                corner_angle = np.linspace(0, np.pi/2, 5)
                # This is simplified - real rounded corners need proper arc calculation
                
                points.extend(edge_stroke)
            else:
                t_edge = np.linspace(0, 1, edge_points)
                edge_stroke = start + t_edge[:, np.newaxis] * (end - start)
                points.extend(edge_stroke)
        
        metadata = {
            'rect_type': rect_type,
            'width': width,
            'height': height,
            'aspect_ratio': width / height
        }
        
        return np.array(points), metadata
    
    def _generate_triangle_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        """Generate various triangle types"""
        triangle_type = params.get('triangle_type', 
            random.choice(['equilateral', 'isosceles', 'right', 'scalene']))
        
        center = np.array([random.uniform(0.3, 0.7), random.uniform(0.3, 0.7)]) * self.canvas_size[0]
        size = random.uniform(80, 200)
        
        if triangle_type == 'equilateral':
            angles = np.array([0, 2*np.pi/3, 4*np.pi/3])
            vertices = center + size * np.column_stack([np.cos(angles), np.sin(angles)])
            
        elif triangle_type == 'isosceles':
            base_angle = random.uniform(np.pi/6, np.pi/3)  # 30-60 degrees
            vertices = np.array([
                [0, size],
                [-size * np.sin(base_angle), -size * np.cos(base_angle)],
                [size * np.sin(base_angle), -size * np.cos(base_angle)]
            ]) + center
            
        elif triangle_type == 'right':
            leg1 = size * random.uniform(0.7, 1.3)
            leg2 = size * random.uniform(0.7, 1.3)
            vertices = np.array([[0, 0], [leg1, 0], [0, leg2]]) + center
            
        else:  # scalene
            vertices = center + np.array([
                [random.uniform(-size, size), random.uniform(-size*0.5, size)],
                [random.uniform(-size, size), random.uniform(-size, size*0.5)],
                [random.uniform(-size, size), random.uniform(-size, size*0.5)]
            ])
        
        # Close the triangle
        vertices = np.vstack([vertices, vertices[0]])
        
        # Generate stroke points
        points = []
        for i in range(len(vertices) - 1):
            start, end = vertices[i], vertices[i + 1]
            edge_points = random.randint(10, 25)
            t = np.linspace(0, 1, edge_points)
            edge_stroke = start + t[:, np.newaxis] * (end - start)
            points.extend(edge_stroke)
        
        metadata = {
            'triangle_type': triangle_type,
            'size': size,
            'vertices': vertices[:-1].tolist()  # Don't include duplicate closing vertex
        }
        
        return np.array(points), metadata
    
    def _add_human_variations(self, points: np.ndarray, metadata: Dict) -> np.ndarray:
        """Add realistic human drawing variations"""
        if len(points) == 0:
            return points
        
        # Speed-based variations
        drawing_speed = metadata.get('drawing_speed', 1.0)
        
        # Slower drawing = more precise, faster = more wobbly
        speed_noise = self.noise_level * (2.0 - drawing_speed)
        noise = np.random.normal(0, speed_noise, points.shape)
        
        # Add slight tremor (higher frequency noise)
        tremor_strength = random.uniform(0.5, 1.5)
        tremor = np.random.normal(0, self.noise_level * 0.3 * tremor_strength, points.shape)
        
        # Pen pressure simulation (affects line thickness - not directly used here)
        pressure_variation = np.random.uniform(0.7, 1.3, len(points))
        metadata['pressure'] = pressure_variation.tolist()
        
        return points + noise + tremor
    
    # Placeholder methods for other shapes
    def _generate_arrow_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # Implementation similar to existing arrow generation but with more variations
        pass
    
    def _generate_star_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # 5-point, 6-point, 8-point stars with various styles
        pass
    
    def _generate_diamond_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # Diamond/rhombus shapes
        pass
    
    def _generate_oval_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # Ellipses with different aspect ratios
        pass
    
    def _generate_pentagon_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # Regular and irregular pentagons
        pass
    
    def _generate_hexagon_variations(self, params: Dict) -> Tuple[np.ndarray, Dict]:
        # Regular and irregular hexagons
        pass


class RealWorldDataAugmenter:
    """Apply realistic augmentations to training data"""
    
    def __init__(self):
        self.augmentations = [
            self._add_noise,
            self._scale_transform,
            self._rotate_transform,
            self._shear_transform,
            self._add_gaps,
            self._simulate_pen_lift,
            self._time_pressure_variation
        ]
    
    def augment_stroke(self, stroke: StrokeData, num_augmentations: int = 3) -> List[StrokeData]:
        """Apply random augmentations to create variations"""
        augmented_strokes = [stroke]  # Include original
        
        for _ in range(num_augmentations):
            augmented = StrokeData(
                points=stroke.points.copy(),
                shape_label=stroke.shape_label,
                metadata=stroke.metadata.copy()
            )
            
            # Apply random subset of augmentations
            selected_augs = random.sample(self.augmentations, random.randint(1, 3))
            for aug_func in selected_augs:
                augmented = aug_func(augmented)
            
            augmented_strokes.append(augmented)
        
        return augmented_strokes
    
    def _add_noise(self, stroke: StrokeData) -> StrokeData:
        """Add various types of noise"""
        noise_types = ['gaussian', 'salt_pepper', 'drift']
        noise_type = random.choice(noise_types)
        
        if noise_type == 'gaussian':
            noise_level = random.uniform(0.5, 2.0)
            noise = np.random.normal(0, noise_level, stroke.points.shape)
            stroke.points += noise
        
        elif noise_type == 'salt_pepper':
            # Random outlier points
            num_outliers = random.randint(0, len(stroke.points) // 10)
            outlier_indices = random.sample(range(len(stroke.points)), num_outliers)
            for idx in outlier_indices:
                stroke.points[idx] += np.random.normal(0, 10, 2)
        
        elif noise_type == 'drift':
            # Gradual drift in position
            drift = np.linspace(0, random.uniform(-5, 5), len(stroke.points))
            stroke.points[:, 0] += drift
            stroke.points[:, 1] += drift * random.uniform(-1, 1)
        
        stroke.metadata['augmentation'] = f'noise_{noise_type}'
        return stroke
    
    def _scale_transform(self, stroke: StrokeData) -> StrokeData:
        """Apply scaling transformation"""
        scale_factor = random.uniform(0.7, 1.4)
        center = np.mean(stroke.points, axis=0)
        stroke.points = center + scale_factor * (stroke.points - center)
        stroke.metadata['augmentation'] = f'scale_{scale_factor:.2f}'
        return stroke
    
    def _rotate_transform(self, stroke: StrokeData) -> StrokeData:
        """Apply rotation transformation"""
        angle = random.uniform(-np.pi/4, np.pi/4)  # ±45 degrees
        center = np.mean(stroke.points, axis=0)
        
        cos_angle, sin_angle = np.cos(angle), np.sin(angle)
        rotation_matrix = np.array([[cos_angle, -sin_angle], [sin_angle, cos_angle]])
        
        centered_points = stroke.points - center
        rotated_points = centered_points @ rotation_matrix.T
        stroke.points = rotated_points + center
        
        stroke.metadata['augmentation'] = f'rotate_{np.degrees(angle):.1f}deg'
        return stroke
    
    def _shear_transform(self, stroke: StrokeData) -> StrokeData:
        """Apply shear transformation"""
        shear_x = random.uniform(-0.2, 0.2)
        shear_y = random.uniform(-0.2, 0.2)
        
        shear_matrix = np.array([[1, shear_x], [shear_y, 1]])
        stroke.points = stroke.points @ shear_matrix.T
        
        stroke.metadata['augmentation'] = f'shear_{shear_x:.2f}_{shear_y:.2f}'
        return stroke
    
    def _add_gaps(self, stroke: StrokeData) -> StrokeData:
        """Simulate pen lifts creating gaps"""
        if len(stroke.points) < 10:
            return stroke
        
        num_gaps = random.randint(0, 2)
        for _ in range(num_gaps):
            gap_start = random.randint(0, len(stroke.points) - 5)
            gap_length = random.randint(2, 5)
            gap_end = min(gap_start + gap_length, len(stroke.points))
            # Remove points to create gap
            stroke.points = np.concatenate([stroke.points[:gap_start], stroke.points[gap_end:]])
        
        stroke.metadata['augmentation'] = 'gaps'
        return stroke
    
    def _simulate_pen_lift(self, stroke: StrokeData) -> StrokeData:
        """Simulate incomplete strokes due to pen lifts"""
        if random.random() < 0.3:  # 30% chance
            # Cut off beginning or end
            cut_start = random.choice([True, False])
            cut_amount = random.uniform(0.05, 0.2)  # 5-20% of stroke
            
            if cut_start:
                cut_points = int(len(stroke.points) * cut_amount)
                stroke.points = stroke.points[cut_points:]
            else:
                cut_points = int(len(stroke.points) * (1 - cut_amount))
                stroke.points = stroke.points[:cut_points]
            
            stroke.metadata['augmentation'] = 'pen_lift'
        
        return stroke
    
    def _time_pressure_variation(self, stroke: StrokeData) -> StrokeData:
        """Simulate time and pressure variations"""
        # Variable point density (fast vs slow drawing)
        if random.random() < 0.4:  # 40% chance
            # Resample points to simulate different drawing speeds
            target_density = random.uniform(0.5, 2.0)
            new_length = int(len(stroke.points) * target_density)
            new_length = max(5, min(new_length, len(stroke.points) * 3))  # Reasonable bounds
            
            if new_length != len(stroke.points):
                # Simple resampling using interpolation
                indices = np.linspace(0, len(stroke.points) - 1, new_length)
                stroke.points = np.array([
                    np.interp(indices, range(len(stroke.points)), stroke.points[:, i])
                    for i in range(stroke.points.shape[1])
                ]).T
            
            stroke.metadata['augmentation'] = f'resample_{target_density:.2f}'
        
        return stroke