"""
Dataset management system for shape detection training data.
Handles collection, validation, and organization of training samples.
"""

import json
import pickle
import sqlite3
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Set
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import hashlib
import cv2

from data_generation_system import StrokeData, HighQualityShapeGenerator, RealWorldDataAugmenter


@dataclass
class DatasetStats:
    """Statistics about the dataset"""
    total_samples: int
    samples_per_class: Dict[str, int]
    avg_points_per_stroke: float
    point_density_stats: Dict[str, float]  # min, max, mean, std
    canvas_coverage_stats: Dict[str, float]
    quality_metrics: Dict[str, float]


class DatasetValidator:
    """Validates training data quality and consistency"""
    
    def __init__(self):
        self.validation_rules = {
            'min_points_per_stroke': 5,
            'max_points_per_stroke': 200,
            'min_canvas_coverage': 0.01,  # Stroke should cover at least 1% of canvas
            'max_canvas_coverage': 0.8,   # But not more than 80%
            'min_stroke_length': 10.0,    # Minimum Euclidean distance
            'max_duplicate_points': 0.1,  # Max 10% duplicate consecutive points
            'min_variation': 2.0,         # Minimum standard deviation in coordinates
        }
    
    def validate_stroke(self, stroke: StrokeData) -> Dict[str, bool]:
        """Validate a single stroke against quality rules"""
        points = stroke.points
        results = {}
        
        # Basic point count validation
        results['valid_point_count'] = (
            self.validation_rules['min_points_per_stroke'] <= 
            len(points) <= 
            self.validation_rules['max_points_per_stroke']
        )
        
        if len(points) < 2:
            # Can't validate further with too few points
            return {**results, **{k: False for k in ['valid_length', 'valid_variation', 
                                                   'valid_coverage', 'valid_duplicates']}}
        
        # Stroke length validation
        stroke_length = np.sum(np.linalg.norm(np.diff(points, axis=0), axis=1))
        results['valid_length'] = stroke_length >= self.validation_rules['min_stroke_length']
        
        # Variation validation (not all points the same)
        variation = np.std(points, axis=0).mean()
        results['valid_variation'] = variation >= self.validation_rules['min_variation']
        
        # Canvas coverage validation
        bbox_area = self._calculate_bbox_area(points)
        canvas_area = 512 * 512  # Assuming standard canvas
        coverage = bbox_area / canvas_area
        results['valid_coverage'] = (
            self.validation_rules['min_canvas_coverage'] <= 
            coverage <= 
            self.validation_rules['max_canvas_coverage']
        )
        
        # Duplicate points validation
        duplicate_ratio = self._calculate_duplicate_ratio(points)
        results['valid_duplicates'] = duplicate_ratio <= self.validation_rules['max_duplicate_points']
        
        # Overall validity
        results['is_valid'] = all(results.values())
        
        return results
    
    def _calculate_bbox_area(self, points: np.ndarray) -> float:
        """Calculate bounding box area"""
        if len(points) == 0:
            return 0.0
        min_coords = np.min(points, axis=0)
        max_coords = np.max(points, axis=0)
        return np.prod(max_coords - min_coords)
    
    def _calculate_duplicate_ratio(self, points: np.ndarray) -> float:
        """Calculate ratio of consecutive duplicate points"""
        if len(points) < 2:
            return 0.0
        
        distances = np.linalg.norm(np.diff(points, axis=0), axis=1)
        duplicates = np.sum(distances < 1e-6)  # Very small threshold for "same" point
        return duplicates / len(points)
    
    def validate_dataset_balance(self, strokes: List[StrokeData]) -> Dict[str, any]:
        """Validate dataset class balance and distribution"""
        class_counts = Counter(stroke.shape_label for stroke in strokes)
        total_samples = len(strokes)
        
        if total_samples == 0:
            return {'balanced': False, 'message': 'Empty dataset'}
        
        # Calculate balance metrics
        class_proportions = {k: v/total_samples for k, v in class_counts.items()}
        min_proportion = min(class_proportions.values())
        max_proportion = max(class_proportions.values())
        balance_ratio = min_proportion / max_proportion if max_proportion > 0 else 0
        
        # Check if reasonably balanced (no class less than 10% of largest class)
        is_balanced = balance_ratio >= 0.1
        
        return {
            'balanced': is_balanced,
            'balance_ratio': balance_ratio,
            'class_counts': class_counts,
            'class_proportions': class_proportions,
            'total_samples': total_samples,
            'num_classes': len(class_counts)
        }


class DatasetStorage:
    """Handles storage and retrieval of training datasets"""
    
    def __init__(self, storage_dir: Path):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize SQLite database for metadata
        self.db_path = self.storage_dir / "dataset_metadata.db"
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database for dataset metadata"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                description TEXT,
                num_samples INTEGER,
                num_classes INTEGER,
                generation_method TEXT,
                file_path TEXT NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS samples (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dataset_id INTEGER NOT NULL,
                shape_label TEXT NOT NULL,
                num_points INTEGER,
                stroke_length REAL,
                canvas_coverage REAL,
                sample_hash TEXT NOT NULL,
                metadata TEXT,  -- JSON string
                FOREIGN KEY (dataset_id) REFERENCES datasets (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def save_dataset(self, strokes: List[StrokeData], name: str, 
                    description: str = "", generation_method: str = "synthetic") -> int:
        """Save dataset to disk and database"""
        # Save stroke data
        data_file = self.storage_dir / f"{name}_strokes.pkl"
        with open(data_file, 'wb') as f:
            pickle.dump(strokes, f)
        
        # Calculate statistics
        class_counts = Counter(stroke.shape_label for stroke in strokes)
        
        # Insert dataset record
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO datasets (name, created_at, description, num_samples, 
                                num_classes, generation_method, file_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            name, 
            datetime.now().isoformat(),
            description,
            len(strokes),
            len(class_counts),
            generation_method,
            str(data_file)
        ))
        
        dataset_id = cursor.lastrowid
        
        # Insert sample records
        for stroke in strokes:
            sample_hash = self._calculate_stroke_hash(stroke)
            stroke_length = np.sum(np.linalg.norm(np.diff(stroke.points, axis=0), axis=1)) if len(stroke.points) > 1 else 0
            canvas_coverage = self._calculate_canvas_coverage(stroke.points)
            
            cursor.execute('''
                INSERT INTO samples (dataset_id, shape_label, num_points, stroke_length,
                                   canvas_coverage, sample_hash, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                dataset_id,
                stroke.shape_label,
                len(stroke.points),
                stroke_length,
                canvas_coverage,
                sample_hash,
                json.dumps(stroke.metadata)
            ))
        
        conn.commit()
        conn.close()
        
        return dataset_id
    
    def load_dataset(self, name: str) -> Optional[List[StrokeData]]:
        """Load dataset by name"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT file_path FROM datasets WHERE name = ?', (name,))
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return None
        
        data_file = Path(result[0])
        if not data_file.exists():
            return None
        
        with open(data_file, 'rb') as f:
            return pickle.load(f)
    
    def list_datasets(self) -> List[Dict]:
        """List all available datasets"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, created_at, description, num_samples, num_classes, generation_method
            FROM datasets ORDER BY created_at DESC
        ''')
        
        columns = ['name', 'created_at', 'description', 'num_samples', 'num_classes', 'generation_method']
        results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        return results
    
    def get_dataset_stats(self, name: str) -> Optional[DatasetStats]:
        """Get detailed statistics for a dataset"""
        strokes = self.load_dataset(name)
        if not strokes:
            return None
        
        return self._calculate_dataset_stats(strokes)
    
    def _calculate_stroke_hash(self, stroke: StrokeData) -> str:
        """Calculate unique hash for a stroke"""
        # Hash based on points and label
        content = f"{stroke.shape_label}_{stroke.points.tobytes()}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _calculate_canvas_coverage(self, points: np.ndarray) -> float:
        """Calculate what fraction of canvas the stroke covers"""
        if len(points) == 0:
            return 0.0
        
        bbox_area = DatasetValidator()._calculate_bbox_area(points)
        canvas_area = 512 * 512  # Standard canvas
        return bbox_area / canvas_area
    
    def _calculate_dataset_stats(self, strokes: List[StrokeData]) -> DatasetStats:
        """Calculate comprehensive dataset statistics"""
        if not strokes:
            return DatasetStats(0, {}, 0, {}, {}, {})
        
        # Basic counts
        total_samples = len(strokes)
        samples_per_class = Counter(stroke.shape_label for stroke in strokes)
        
        # Point statistics
        points_per_stroke = [len(stroke.points) for stroke in strokes]
        avg_points = np.mean(points_per_stroke)
        
        point_density_stats = {
            'min': np.min(points_per_stroke),
            'max': np.max(points_per_stroke),
            'mean': avg_points,
            'std': np.std(points_per_stroke)
        }
        
        # Coverage statistics
        coverages = [self._calculate_canvas_coverage(stroke.points) for stroke in strokes]
        canvas_coverage_stats = {
            'min': np.min(coverages),
            'max': np.max(coverages),
            'mean': np.mean(coverages),
            'std': np.std(coverages)
        }
        
        # Quality metrics
        validator = DatasetValidator()
        valid_strokes = sum(1 for stroke in strokes if validator.validate_stroke(stroke)['is_valid'])
        
        quality_metrics = {
            'validity_rate': valid_strokes / total_samples,
            'avg_stroke_length': np.mean([
                np.sum(np.linalg.norm(np.diff(stroke.points, axis=0), axis=1)) 
                if len(stroke.points) > 1 else 0
                for stroke in strokes
            ]),
            'duplicate_rate': np.mean([
                validator._calculate_duplicate_ratio(stroke.points) 
                for stroke in strokes
            ])
        }
        
        return DatasetStats(
            total_samples=total_samples,
            samples_per_class=dict(samples_per_class),
            avg_points_per_stroke=avg_points,
            point_density_stats=point_density_stats,
            canvas_coverage_stats=canvas_coverage_stats,
            quality_metrics=quality_metrics
        )


class DatasetVisualizer:
    """Visualizes dataset contents and statistics"""
    
    def __init__(self, figsize=(12, 8)):
        self.figsize = figsize
    
    def plot_dataset_overview(self, strokes: List[StrokeData], save_path: Optional[Path] = None):
        """Create comprehensive dataset overview plots"""
        fig, axes = plt.subplots(2, 3, figsize=(18, 12))
        fig.suptitle('Dataset Overview', fontsize=16, fontweight='bold')
        
        # Class distribution
        class_counts = Counter(stroke.shape_label for stroke in strokes)
        axes[0, 0].bar(class_counts.keys(), class_counts.values())
        axes[0, 0].set_title('Class Distribution')
        axes[0, 0].set_xlabel('Shape Class')
        axes[0, 0].set_ylabel('Number of Samples')
        axes[0, 0].tick_params(axis='x', rotation=45)
        
        # Points per stroke distribution
        points_per_stroke = [len(stroke.points) for stroke in strokes]
        axes[0, 1].hist(points_per_stroke, bins=30, alpha=0.7, edgecolor='black')
        axes[0, 1].set_title('Points per Stroke Distribution')
        axes[0, 1].set_xlabel('Number of Points')
        axes[0, 1].set_ylabel('Frequency')
        
        # Stroke length distribution
        stroke_lengths = [
            np.sum(np.linalg.norm(np.diff(stroke.points, axis=0), axis=1)) 
            if len(stroke.points) > 1 else 0
            for stroke in strokes
        ]
        axes[0, 2].hist(stroke_lengths, bins=30, alpha=0.7, edgecolor='black')
        axes[0, 2].set_title('Stroke Length Distribution')
        axes[0, 2].set_xlabel('Stroke Length (pixels)')
        axes[0, 2].set_ylabel('Frequency')
        
        # Sample shapes from each class
        classes = list(class_counts.keys())
        samples_per_class = {}
        for stroke in strokes:
            if stroke.shape_label not in samples_per_class:
                samples_per_class[stroke.shape_label] = []
            if len(samples_per_class[stroke.shape_label]) < 1:  # Take first sample
                samples_per_class[stroke.shape_label].append(stroke)
        
        # Plot sample shapes
        axes[1, 0].set_title('Sample Shapes by Class')
        colors = plt.cm.tab10(np.linspace(0, 1, len(classes)))
        for i, (shape_class, color) in enumerate(zip(classes, colors)):
            if shape_class in samples_per_class and samples_per_class[shape_class]:
                stroke = samples_per_class[shape_class][0]
                if len(stroke.points) > 0:
                    offset_y = i * 100  # Vertical offset for each class
                    points = stroke.points + np.array([0, offset_y])
                    axes[1, 0].plot(points[:, 0], points[:, 1], 
                                  color=color, linewidth=2, label=shape_class)
        
        axes[1, 0].legend()
        axes[1, 0].set_aspect('equal')
        axes[1, 0].grid(True, alpha=0.3)
        
        # Canvas coverage distribution
        validator = DatasetValidator()
        coverages = [validator._calculate_canvas_coverage(stroke.points) for stroke in strokes]
        axes[1, 1].hist(coverages, bins=30, alpha=0.7, edgecolor='black')
        axes[1, 1].set_title('Canvas Coverage Distribution')
        axes[1, 1].set_xlabel('Coverage Ratio')
        axes[1, 1].set_ylabel('Frequency')
        
        # Quality metrics
        quality_results = [validator.validate_stroke(stroke) for stroke in strokes]
        quality_metrics = {}
        for key in quality_results[0].keys():
            if key != 'is_valid':
                quality_metrics[key.replace('valid_', '')] = np.mean([r[key] for r in quality_results])
        
        axes[1, 2].bar(quality_metrics.keys(), quality_metrics.values())
        axes[1, 2].set_title('Quality Metrics (Pass Rate)')
        axes[1, 2].set_xlabel('Quality Check')
        axes[1, 2].set_ylabel('Pass Rate')
        axes[1, 2].tick_params(axis='x', rotation=45)
        axes[1, 2].set_ylim([0, 1])
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Dataset overview saved to {save_path}")
        
        plt.show()
    
    def plot_shape_samples(self, strokes: List[StrokeData], samples_per_class: int = 3, 
                          save_path: Optional[Path] = None):
        """Plot sample strokes for each shape class"""
        # Group strokes by class
        strokes_by_class = defaultdict(list)
        for stroke in strokes:
            strokes_by_class[stroke.shape_label].append(stroke)
        
        classes = list(strokes_by_class.keys())
        num_classes = len(classes)
        
        fig, axes = plt.subplots(num_classes, samples_per_class, 
                               figsize=(samples_per_class * 3, num_classes * 3))
        fig.suptitle('Shape Samples by Class', fontsize=16, fontweight='bold')
        
        if num_classes == 1:
            axes = axes.reshape(1, -1)
        if samples_per_class == 1:
            axes = axes.reshape(-1, 1)
        
        for i, shape_class in enumerate(classes):
            class_strokes = strokes_by_class[shape_class]
            
            for j in range(samples_per_class):
                if j < len(class_strokes):
                    stroke = class_strokes[j]
                    axes[i, j].plot(stroke.points[:, 0], stroke.points[:, 1], 
                                  'b-', linewidth=2, markersize=1)
                    axes[i, j].scatter(stroke.points[0, 0], stroke.points[0, 1], 
                                     color='green', s=50, marker='o', label='Start')
                    axes[i, j].scatter(stroke.points[-1, 0], stroke.points[-1, 1], 
                                     color='red', s=50, marker='x', label='End')
                else:
                    axes[i, j].text(0.5, 0.5, 'No sample', ha='center', va='center', 
                                  transform=axes[i, j].transAxes)
                
                if j == 0:
                    axes[i, j].set_ylabel(f'{shape_class}\\n({len(class_strokes)} samples)', 
                                        fontweight='bold')
                
                axes[i, j].set_aspect('equal')
                axes[i, j].grid(True, alpha=0.3)
                axes[i, j].set_title(f'Sample {j+1}')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"Shape samples saved to {save_path}")
        
        plt.show()