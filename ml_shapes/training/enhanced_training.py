"""
Enhanced training pipeline with real data generation, validation, and monitoring.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import numpy as np
from pathlib import Path
import json
import logging
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import matplotlib.pyplot as plt
from tqdm import tqdm
import wandb  # For experiment tracking (optional)
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.shape_detector import ShapeDetector
from training.data_generation_system import (
    StrokeData, HighQualityShapeGenerator, RealWorldDataAugmenter
)
from training.dataset_manager import (
    DatasetStorage, DatasetValidator, DatasetVisualizer
)


class EnhancedStrokeDataset(Dataset):
    """Enhanced dataset with real data generation and validation"""
    
    def __init__(self, 
                 num_synthetic_samples: int = 10000,
                 max_points: int = 50,
                 use_augmentation: bool = True,
                 augmentation_ratio: float = 2.0,
                 validation_enabled: bool = True,
                 storage_dir: str = "datasets"):
        
        self.max_points = max_points
        self.use_augmentation = use_augmentation
        self.augmentation_ratio = augmentation_ratio
        
        # Initialize components
        self.shape_generator = HighQualityShapeGenerator()
        self.augmenter = RealWorldDataAugmenter()
        self.validator = DatasetValidator()
        self.storage = DatasetStorage(Path(storage_dir))
        
        # Generate dataset
        logging.info(f"Generating {num_synthetic_samples} synthetic samples...")
        self.strokes = self._generate_training_data(num_synthetic_samples)
        
        # Validate if enabled
        if validation_enabled:
            self.strokes = self._validate_and_filter_data(self.strokes)
        
        # Create shape label mapping
        self.shape_labels = sorted(list(set(stroke.shape_label for stroke in self.strokes)))
        self.label_to_idx = {label: idx for idx, label in enumerate(self.shape_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        logging.info(f"Dataset created with {len(self.strokes)} samples across {len(self.shape_labels)} classes")
        logging.info(f"Shape classes: {self.shape_labels}")
    
    def _generate_training_data(self, num_samples: int) -> List[StrokeData]:
        """Generate comprehensive training data"""
        strokes = []
        
        # Generate base synthetic data
        shape_types = list(self.shape_generator.shape_categories.keys())
        samples_per_shape = num_samples // len(shape_types)
        
        for shape_type in shape_types:
            for _ in range(samples_per_shape):
                try:
                    # Generate with random parameters for variety
                    variation_params = self._get_random_variation_params(shape_type)
                    stroke = self.shape_generator.generate_shape(shape_type, variation_params)
                    strokes.append(stroke)
                    
                    # Apply augmentation if enabled
                    if self.use_augmentation:
                        augmented = self.augmenter.augment_stroke(
                            stroke, int(self.augmentation_ratio)
                        )
                        strokes.extend(augmented[1:])  # Skip original (already added)
                
                except Exception as e:
                    logging.warning(f"Failed to generate {shape_type}: {e}")
                    continue
        
        return strokes
    
    def _get_random_variation_params(self, shape_type: str) -> Dict:
        """Get random parameters for shape variations"""
        params = {}
        
        if shape_type == "line":
            params['line_type'] = np.random.choice(['straight', 'slightly_curved', 'dashed'])
        elif shape_type == "circle":
            params['circle_type'] = np.random.choice(['perfect', 'wobbly', 'spiral'])
        elif shape_type == "rectangle":
            params['rect_type'] = np.random.choice(['sharp_corners', 'rounded_corners', 'tilted'])
        elif shape_type == "triangle":
            params['triangle_type'] = np.random.choice(['equilateral', 'isosceles', 'right', 'scalene'])
        
        return params
    
    def _validate_and_filter_data(self, strokes: List[StrokeData]) -> List[StrokeData]:
        """Validate and filter training data"""
        valid_strokes = []
        
        logging.info("Validating training data...")
        for stroke in tqdm(strokes, desc="Validation"):
            validation_result = self.validator.validate_stroke(stroke)
            if validation_result['is_valid']:
                valid_strokes.append(stroke)
        
        logging.info(f"Kept {len(valid_strokes)}/{len(strokes)} valid samples "
                    f"({100*len(valid_strokes)/len(strokes):.1f}%)")
        
        # Check dataset balance
        balance_info = self.validator.validate_dataset_balance(valid_strokes)
        if not balance_info['balanced']:
            logging.warning(f"Dataset is imbalanced. Balance ratio: {balance_info['balance_ratio']:.3f}")
            logging.info(f"Class distribution: {balance_info['class_counts']}")
        
        return valid_strokes
    
    def __len__(self):
        return len(self.strokes)
    
    def __getitem__(self, idx):
        stroke = self.strokes[idx]
        
        # Normalize and pad/truncate points
        points = self._normalize_points(stroke.points)
        label_idx = self.label_to_idx[stroke.shape_label]
        
        return torch.FloatTensor(points), torch.LongTensor([label_idx])
    
    def _normalize_points(self, points: np.ndarray) -> np.ndarray:
        """Normalize points to max_points length and standardize coordinates"""
        if len(points) == 0:
            return np.zeros((self.max_points, 2))
        
        # Standardize coordinates (center and scale)
        center = np.mean(points, axis=0)
        centered = points - center
        
        max_extent = np.max(np.abs(centered))
        if max_extent > 0:
            normalized = centered / max_extent
        else:
            normalized = centered
        
        # Pad or truncate to max_points
        if len(normalized) > self.max_points:
            # Sample points uniformly
            indices = np.linspace(0, len(normalized)-1, self.max_points, dtype=int)
            normalized = normalized[indices]
        elif len(normalized) < self.max_points:
            # Pad with last point
            padding = np.tile(normalized[-1], (self.max_points - len(normalized), 1))
            normalized = np.vstack([normalized, padding])
        
        return normalized
    
    def save_dataset(self, name: str, description: str = ""):
        """Save dataset for future use"""
        dataset_id = self.storage.save_dataset(
            self.strokes, name, description, "enhanced_synthetic"
        )
        logging.info(f"Dataset saved with ID: {dataset_id}")
        return dataset_id
    
    def visualize_dataset(self, save_path: Optional[Path] = None):
        """Create dataset visualization"""
        visualizer = DatasetVisualizer()
        visualizer.plot_dataset_overview(self.strokes, save_path)


class TrainingMonitor:
    """Monitor and log training progress"""
    
    def __init__(self, log_dir: str = "training_logs", use_wandb: bool = False):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.use_wandb = use_wandb
        
        # Setup logging
        self.setup_logging()
        
        # Training metrics
        self.metrics = {
            'train_loss': [],
            'train_accuracy': [],
            'val_loss': [],
            'val_accuracy': [],
            'learning_rates': []
        }
        
        if use_wandb:
            try:
                wandb.init(
                    project="shape-detection",
                    config={
                        "architecture": "LSTM+MLP",
                        "dataset": "enhanced_synthetic"
                    }
                )
            except Exception as e:
                logging.warning(f"Failed to initialize wandb: {e}")
                self.use_wandb = False
    
    def setup_logging(self):
        """Setup logging configuration"""
        log_file = self.log_dir / f"training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
    
    def log_epoch(self, epoch: int, train_loss: float, train_acc: float, 
                  val_loss: float = None, val_acc: float = None, lr: float = None):
        """Log epoch metrics"""
        self.metrics['train_loss'].append(train_loss)
        self.metrics['train_accuracy'].append(train_acc)
        
        if val_loss is not None:
            self.metrics['val_loss'].append(val_loss)
        if val_acc is not None:
            self.metrics['val_accuracy'].append(val_acc)
        if lr is not None:
            self.metrics['learning_rates'].append(lr)
        
        # Console logging
        msg = f"Epoch {epoch:3d} | Train Loss: {train_loss:.4f}, Acc: {train_acc:.2f}%"
        if val_loss is not None:
            msg += f" | Val Loss: {val_loss:.4f}, Acc: {val_acc:.2f}%"
        if lr is not None:
            msg += f" | LR: {lr:.6f}"
        
        logging.info(msg)
        
        # Wandb logging
        if self.use_wandb:
            wandb_log = {
                'epoch': epoch,
                'train_loss': train_loss,
                'train_accuracy': train_acc
            }
            if val_loss is not None:
                wandb_log.update({'val_loss': val_loss, 'val_accuracy': val_acc})
            if lr is not None:
                wandb_log['learning_rate'] = lr
            
            wandb.log(wandb_log)
    
    def plot_training_curves(self, save_path: Optional[Path] = None):
        """Plot training curves"""
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        # Loss curves
        epochs = range(1, len(self.metrics['train_loss']) + 1)
        axes[0].plot(epochs, self.metrics['train_loss'], label='Train Loss', marker='o')
        if self.metrics['val_loss']:
            axes[0].plot(epochs, self.metrics['val_loss'], label='Val Loss', marker='s')
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Loss')
        axes[0].set_title('Training and Validation Loss')
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)
        
        # Accuracy curves
        axes[1].plot(epochs, self.metrics['train_accuracy'], label='Train Acc', marker='o')
        if self.metrics['val_accuracy']:
            axes[1].plot(epochs, self.metrics['val_accuracy'], label='Val Acc', marker='s')
        axes[1].set_xlabel('Epoch')
        axes[1].set_ylabel('Accuracy (%)')
        axes[1].set_title('Training and Validation Accuracy')
        axes[1].legend()
        axes[1].grid(True, alpha=0.3)
        
        # Learning rate
        if self.metrics['learning_rates']:
            axes[2].plot(epochs, self.metrics['learning_rates'], marker='d')
            axes[2].set_xlabel('Epoch')
            axes[2].set_ylabel('Learning Rate')
            axes[2].set_title('Learning Rate Schedule')
            axes[2].set_yscale('log')
            axes[2].grid(True, alpha=0.3)
        else:
            axes[2].text(0.5, 0.5, 'No LR data', ha='center', va='center', 
                        transform=axes[2].transAxes)
            axes[2].set_title('Learning Rate (No Data)')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logging.info(f"Training curves saved to {save_path}")
        
        plt.show()
    
    def save_metrics(self):
        """Save metrics to file"""
        metrics_file = self.log_dir / "training_metrics.json"
        with open(metrics_file, 'w') as f:
            json.dump(self.metrics, f, indent=2)
        logging.info(f"Metrics saved to {metrics_file}")


def enhanced_train_model(
    epochs: int = 100,
    batch_size: int = 64,
    learning_rate: float = 0.001,
    validation_split: float = 0.2,
    num_samples: int = 20000,
    use_augmentation: bool = True,
    use_wandb: bool = False,
    save_dataset: bool = True,
    device: str = None
) -> Tuple[ShapeDetector, TrainingMonitor]:
    """Enhanced training pipeline with comprehensive data generation and monitoring"""
    
    # Device selection
    if device is None:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
    device = torch.device(device)
    
    logging.info("🚀 Starting Enhanced Shape Detection Training")
    logging.info(f"Device: {device}")
    logging.info(f"Samples: {num_samples}, Epochs: {epochs}, Batch Size: {batch_size}")
    
    # Initialize monitor
    monitor = TrainingMonitor(use_wandb=use_wandb)
    
    # Create enhanced dataset
    logging.info("📊 Creating enhanced dataset...")
    dataset = EnhancedStrokeDataset(
        num_synthetic_samples=num_samples,
        use_augmentation=use_augmentation
    )
    
    # Save dataset if requested
    if save_dataset:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        dataset_name = f"enhanced_synthetic_{timestamp}"
        dataset.save_dataset(dataset_name, f"Enhanced synthetic dataset with {num_samples} base samples")
    
    # Visualize dataset
    dataset.visualize_dataset()
    
    # Split dataset
    val_size = int(len(dataset) * validation_split)
    train_size = len(dataset) - val_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    logging.info(f"📈 Train samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")
    
    # Initialize model
    model = ShapeDetector(num_classes=len(dataset.shape_labels))
    model = model.to(device)
    
    # Update model's shape labels
    model.shape_labels = dataset.shape_labels
    
    # Loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=learning_rate, weight_decay=0.01)
    
    # Learning rate scheduler
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='min', factor=0.5, patience=10, verbose=True
    )
    
    # Training loop
    best_val_acc = 0.0
    best_model_state = None
    
    logging.info("🏋️ Starting training loop...")
    
    for epoch in range(epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        progress_bar = tqdm(train_loader, desc=f"Epoch {epoch+1}/{epochs}")
        for batch_points, batch_labels in progress_bar:
            batch_points = batch_points.to(device)
            batch_labels = batch_labels.squeeze().to(device)
            
            optimizer.zero_grad()
            
            # Forward pass
            outputs = model(batch_points)
            loss = criterion(outputs, batch_labels)
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            # Statistics
            train_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            train_total += batch_labels.size(0)
            train_correct += (predicted == batch_labels).sum().item()
            
            # Update progress bar
            progress_bar.set_postfix({
                'Loss': f'{loss.item():.4f}',
                'Acc': f'{100.*train_correct/train_total:.1f}%'
            })
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for batch_points, batch_labels in val_loader:
                batch_points = batch_points.to(device)
                batch_labels = batch_labels.squeeze().to(device)
                
                outputs = model(batch_points)
                loss = criterion(outputs, batch_labels)
                
                val_loss += loss.item()
                _, predicted = torch.max(outputs.data, 1)
                val_total += batch_labels.size(0)
                val_correct += (predicted == batch_labels).sum().item()
        
        # Calculate metrics
        avg_train_loss = train_loss / len(train_loader)
        train_accuracy = 100. * train_correct / train_total
        avg_val_loss = val_loss / len(val_loader)
        val_accuracy = 100. * val_correct / val_total
        current_lr = optimizer.param_groups[0]['lr']
        
        # Log metrics
        monitor.log_epoch(
            epoch + 1, avg_train_loss, train_accuracy,
            avg_val_loss, val_accuracy, current_lr
        )
        
        # Update learning rate
        scheduler.step(avg_val_loss)
        
        # Save best model
        if val_accuracy > best_val_acc:
            best_val_acc = val_accuracy
            best_model_state = model.state_dict().copy()
            logging.info(f"🎯 New best validation accuracy: {best_val_acc:.2f}%")
    
    # Load best model
    if best_model_state is not None:
        model.load_state_dict(best_model_state)
        logging.info(f"✅ Loaded best model with validation accuracy: {best_val_acc:.2f}%")
    
    # Save final model
    model_path = Path('models/enhanced_shape_detector.pth')
    model_path.parent.mkdir(exist_ok=True)
    torch.save(model.state_dict(), model_path)
    
    # Save updated label mapping
    label_map_path = Path('label_map.json')
    with open(label_map_path, 'w') as f:
        json.dump(dataset.label_to_idx, f, indent=2)
    
    logging.info(f"💾 Model saved to {model_path}")
    logging.info(f"📝 Label mapping saved to {label_map_path}")
    
    # Generate training curves
    monitor.plot_training_curves(Path('training_curves.png'))
    monitor.save_metrics()
    
    # Final evaluation
    logging.info("\n🧪 Final Model Evaluation:")
    test_model_comprehensive(model, dataset, device)
    
    return model, monitor


def test_model_comprehensive(model: ShapeDetector, dataset: EnhancedStrokeDataset, device: torch.device):
    """Comprehensive model testing"""
    model.eval()
    
    # Test on a few examples from each class
    class_examples = {}
    for stroke in dataset.strokes[:100]:  # Test first 100 samples
        if stroke.shape_label not in class_examples:
            class_examples[stroke.shape_label] = []
        if len(class_examples[stroke.shape_label]) < 5:
            class_examples[stroke.shape_label].append(stroke)
    
    logging.info("🔍 Testing model on sample shapes:")
    for shape_class, examples in class_examples.items():
        correct = 0
        total = len(examples)
        
        for stroke in examples:
            # Normalize points
            normalized_points = dataset._normalize_points(stroke.points)
            
            # Predict
            result = model.predict_shape(normalized_points)
            predicted_shape = result["shape"]
            confidence = result["confidence"]
            
            is_correct = predicted_shape == shape_class
            if is_correct:
                correct += 1
            
            status = "✅" if is_correct else "❌"
            logging.info(f"  {status} {shape_class} -> {predicted_shape} ({confidence:.3f})")
        
        accuracy = 100 * correct / total
        logging.info(f"📊 {shape_class}: {accuracy:.1f}% ({correct}/{total})")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Train model with enhanced pipeline
    model, monitor = enhanced_train_model(
        epochs=50,
        batch_size=64,
        num_samples=15000,
        use_augmentation=True,
        use_wandb=False,  # Set to True if you have wandb configured
        save_dataset=True
    )
    
    logging.info("🎉 Enhanced training complete!")