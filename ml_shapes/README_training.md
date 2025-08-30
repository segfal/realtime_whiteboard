# Shape Detection Training System

A comprehensive training system for generating high-quality, consistent shape detection training data and models.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd ml_shapes
pip install -r requirements.txt
pip install fastapi uvicorn wandb  # Additional dependencies
```

### 2. Generate Enhanced Training Data
```bash
# Run the enhanced training pipeline
python training/enhanced_training.py
```

### 3. Collect Real User Data
```bash
# Start the data collection web interface
python training/data_collection_interface.py

# Then visit http://localhost:8000 to draw shapes
```

## 📊 Training Data Sources

### 1. **High-Quality Synthetic Data**
- **Mathematical precision**: Geometrically perfect base shapes
- **Realistic variations**: Human-like drawing imperfections
- **Multiple variations per shape**: Different styles and approaches
- **Comprehensive augmentation**: Noise, rotation, scaling, shearing

```python
from training.data_generation_system import HighQualityShapeGenerator, RealWorldDataAugmenter

# Generate synthetic data
generator = HighQualityShapeGenerator()
circle = generator.generate_shape("circle", {"circle_type": "wobbly"})

# Apply realistic augmentations
augmenter = RealWorldDataAugmenter() 
augmented_circles = augmenter.augment_stroke(circle, num_augmentations=5)
```

### 2. **Real User Contributions**
- **Web interface**: Easy-to-use drawing canvas
- **Quality validation**: Automatic filtering of low-quality samples
- **Multiple shape types**: 7+ different shape categories
- **Metadata collection**: Drawing speed, pressure, timestamps

### 3. **Dataset Management**
- **SQLite storage**: Efficient metadata and sample tracking
- **Quality validation**: Automatic filtering and validation
- **Statistics tracking**: Real-time collection progress
- **Export functionality**: Convert collected data to training format

## 🔧 Key Features

### Enhanced Shape Generator
- **10+ shape types**: Line, circle, rectangle, triangle, arrow, star, diamond, oval, pentagon, hexagon
- **Variation control**: Parameterized shape generation
- **Human simulation**: Realistic drawing imperfections
- **Noise modeling**: Speed-based accuracy variations

### Data Augmentation Pipeline
```python
augmentations = [
    '_add_noise',           # Gaussian, salt-pepper, drift noise
    '_scale_transform',     # Random scaling (0.7-1.4x)
    '_rotate_transform',    # Rotation (±45°)
    '_shear_transform',     # Shear transformation
    '_add_gaps',           # Simulate pen lifts
    '_simulate_pen_lift',  # Incomplete strokes
    '_time_pressure_variation'  # Variable point density
]
```

### Quality Validation
- **Point count validation**: 5-200 points per stroke
- **Length validation**: Minimum stroke length requirements
- **Coverage validation**: Appropriate canvas utilization
- **Variation validation**: Sufficient coordinate variance
- **Duplicate detection**: Remove redundant consecutive points

## 📈 Training Pipeline

### 1. Enhanced Training Script
```bash
python training/enhanced_training.py
```

**Features:**
- **Comprehensive data generation**: 15,000+ synthetic samples
- **Real-time validation**: Quality filtering during generation  
- **Advanced monitoring**: Training curves, metrics logging
- **Model checkpointing**: Save best validation accuracy
- **Experiment tracking**: Optional Weights & Biases integration

### 2. Configuration Options
```python
enhanced_train_model(
    epochs=100,                    # Training epochs
    batch_size=64,                 # Batch size
    learning_rate=0.001,           # Initial learning rate
    validation_split=0.2,          # Validation data ratio
    num_samples=20000,             # Synthetic samples to generate
    use_augmentation=True,         # Enable data augmentation
    use_wandb=False,              # Enable experiment tracking
    save_dataset=True,            # Save generated dataset
    device='cuda'                 # Training device
)
```

### 3. Automatic Features
- **Learning rate scheduling**: Reduce on plateau
- **Early stopping**: Save best model weights
- **Comprehensive evaluation**: Per-class accuracy testing
- **Visualization**: Training curves and dataset statistics

## 🌐 Data Collection Interface

### Start Collection Server
```bash
python training/data_collection_interface.py
```

### Interface Features
- **Interactive canvas**: 800x600 drawing area
- **Shape guidelines**: Examples and tips for each shape
- **Real-time feedback**: Drawing validation and statistics
- **Progress tracking**: Collection stats per shape type
- **Quality assurance**: Automatic validation of submissions

### API Endpoints
- `GET /` - Drawing interface
- `POST /api/submit_drawing` - Submit user drawing
- `GET /api/collection_stats` - Collection statistics  
- `GET /api/shape_requirements` - Shape drawing guidelines
- `POST /api/export_dataset` - Export collected data

## 📁 Dataset Management

### Storage System
```python
from training.dataset_manager import DatasetStorage, DatasetVisualizer

# Initialize storage
storage = DatasetStorage("datasets")

# Save dataset
dataset_id = storage.save_dataset(strokes, "my_dataset", "Description")

# Load dataset
strokes = storage.load_dataset("my_dataset")

# Visualize
visualizer = DatasetVisualizer()
visualizer.plot_dataset_overview(strokes)
```

### Dataset Statistics
- **Class distribution**: Samples per shape type
- **Quality metrics**: Validation pass rates
- **Point density**: Distribution of points per stroke
- **Canvas coverage**: Spatial utilization statistics
- **Temporal data**: Drawing speed and timing analysis

## 🎯 Best Practices

### 1. **Data Quality**
- Generate 10,000+ samples per training run
- Use validation to filter low-quality data
- Balance classes (minimum 500 samples per class)
- Apply diverse augmentations (2-3x original dataset)

### 2. **Training Strategy**
- Start with synthetic data for baseline
- Add real user data for robustness  
- Use validation split (20%) for model selection
- Monitor training curves for overfitting

### 3. **Collection Guidelines**
- Clear shape requirements and examples
- Real-time feedback for contributors
- Quality validation before storage
- Progress tracking to motivate contribution

### 4. **Model Evaluation**
```python
# Test on diverse examples
test_model_comprehensive(model, dataset, device)

# Per-class accuracy analysis
for shape_class in dataset.shape_labels:
    class_accuracy = evaluate_class_performance(model, dataset, shape_class)
    print(f"{shape_class}: {class_accuracy:.1f}% accuracy")
```

## 🔍 Data Validation Rules

### Stroke Quality Criteria
- **Minimum points**: 5 points per stroke
- **Maximum points**: 200 points per stroke  
- **Minimum length**: 10 pixels total stroke length
- **Canvas coverage**: 1-80% of canvas area
- **Point variation**: σ ≥ 2.0 pixels coordinate standard deviation
- **Duplicate limit**: <10% consecutive identical points

### Dataset Balance
- **Balance ratio**: Min class ≥ 10% of max class samples
- **Class coverage**: All shape types represented
- **Quality distribution**: >80% validation pass rate target

## 📊 Monitoring & Visualization

### Training Curves
- Loss progression (train/validation)
- Accuracy trends (train/validation)  
- Learning rate schedule visualization
- Real-time metrics during training

### Dataset Visualization
- Class distribution histograms
- Sample shapes by category
- Point density distributions
- Canvas coverage analysis
- Quality metrics overview

## 🚀 Production Deployment

### Export Trained Model
```python
# Model is automatically saved as:
# - models/enhanced_shape_detector.pth (model weights)
# - label_map.json (updated class mapping)
# - training_curves.png (training visualization)
# - training_logs/ (detailed logs and metrics)
```

### Integration with Main App
```python
# Update your existing shape detector
from models.shape_detector import ShapeDetector
import json

# Load enhanced model
model = ShapeDetector(num_classes=len(label_map))
model.load_state_dict(torch.load('models/enhanced_shape_detector.pth'))

# Load updated label mapping
with open('label_map.json') as f:
    label_map = json.load(f)
```

## 🛠️ Troubleshooting

### Common Issues

1. **Low validation accuracy**
   - Increase dataset size (20,000+ samples)
   - Add more augmentation variations
   - Check class balance in dataset
   - Reduce learning rate

2. **Data collection interface not accessible**
   - Check firewall settings for port 8000
   - Verify FastAPI and uvicorn installation
   - Check server logs for binding errors

3. **Dataset validation failures**
   - Review validation rules in DatasetValidator
   - Check canvas size and coordinate ranges
   - Verify point array format and types

4. **Training memory issues**
   - Reduce batch size (32 or 16)
   - Use CPU if GPU memory insufficient
   - Enable gradient checkpointing for large models

### Performance Optimization
- Use GPU for training (CUDA/MPS)
- Enable multi-worker data loading
- Batch dataset validation operations
- Cache augmented samples for repeated use

## 📚 Advanced Usage

### Custom Shape Types
```python
# Add new shape generator
def _generate_custom_shape(self, params: Dict) -> Tuple[np.ndarray, Dict]:
    # Your shape generation logic
    points = generate_your_shape(params)
    metadata = {"shape_type": "custom", "params": params}
    return points, metadata

# Register in HighQualityShapeGenerator
generator.shape_categories["custom"] = generator._generate_custom_shape
```

### Custom Augmentations
```python
# Add custom augmentation
def _custom_augmentation(self, stroke: StrokeData) -> StrokeData:
    # Your augmentation logic
    modified_points = apply_transformation(stroke.points)
    stroke.points = modified_points
    stroke.metadata['augmentation'] = 'custom_transform'
    return stroke

# Add to augmenter
augmenter.augmentations.append(augmenter._custom_augmentation)
```

This system provides a complete pipeline for creating high-quality, consistent training data that will significantly improve your shape detection model's accuracy and robustness.