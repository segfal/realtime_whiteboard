# Shape Recognizer ML Service

This is the ML service component of the Realtime Whiteboard application, responsible for shape detection and recognition.

## Features

- Real-time shape detection from drawing strokes
- Support for multiple shape types (circles, rectangles, lines, etc.)
- Optimized for different hardware configurations (CPU, NVIDIA GPU, Apple Silicon)

## System Requirements

- Python 3.12+
- PyTorch 2.8.0+
- OpenCV
- NumPy
- Matplotlib

## Installation

The service automatically detects your system configuration and installs the appropriate PyTorch version:

- **NVIDIA GPU**: CUDA-enabled PyTorch
- **Apple Silicon**: CPU PyTorch optimized for Metal Performance Shaders
- **Other systems**: CPU-only PyTorch

## Usage

```bash
# Start the ML service
poetry run python api/main.py
```

## API Endpoints

- `GET /health` - Health check
- `POST /detect-shapes` - Shape detection from stroke data

## Development

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Start development server
poetry run uvicorn api.main:app --reload
```
