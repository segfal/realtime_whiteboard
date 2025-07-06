# Erase Feature Implementation Guide

This guide explains how to implement and use the erase functionality in your whiteboard app, including different erase modes, layer management, and integration with the existing drawing system.

---

## Overview

The erase feature provides three main modes:
1. **Normal Mode**: Standard drawing mode
2. **Erase Mode**: Completely removes drawn content
3. **Soft Erase Mode**: Reduces opacity of drawn content

It also includes layer management for organizing your drawings.

---

## Features

### 1. Erase Modes

#### Normal Mode (✏️ Draw)
- Standard drawing functionality
- Draw lines, rectangles, circles
- Uses the current color and line width

#### Erase Mode (🧽 Erase)
- Completely removes drawn content within the erase radius
- Works by finding and removing vertices near the erase point
- Provides precise control over what gets erased

#### Soft Erase Mode (🌫️ Soft Erase)
- Reduces the opacity of drawn content instead of removing it
- Creates a "fade" effect
- Adjustable opacity reduction amount

### 2. Erase Controls

#### Radius Control
- Adjustable from 1 to 50 pixels
- Controls the size of the erase area
- Larger radius = bigger erase area

#### Opacity Control (Soft Erase Only)
- Adjustable from 0% to 100%
- Controls how much opacity is reduced
- 0% = no change, 100% = completely transparent

### 3. Layer Management

#### Multiple Layers
- Create multiple layers for organization
- Draw on different layers independently
- Switch between layers easily

#### Layer Operations
- **Add Layer**: Create a new layer
- **Remove Layer**: Delete the current layer (can't remove the last one)
- **Switch Layer**: Change which layer you're drawing on
- **Clear All**: Remove all content from all layers

---

## Implementation Details

### 1. WebGPU Renderer (C++)

The erase functionality is implemented in the WebGPU renderer with these key components:

#### Erase Mode Enum
```cpp
enum class EraseMode {
    NORMAL,     // Normal drawing mode
    ERASE,      // Erase mode - clears areas
    SOFT_ERASE  // Soft erase - reduces opacity
};
```

#### Layer Structure
```cpp
struct DrawingLayer {
    std::vector<float> vertices;
    std::vector<uint32_t> indices;
    bool visible;
    float opacity;
};
```

#### Key Methods
- `setEraseMode(EraseMode mode)`: Switch between modes
- `setEraseRadius(float radius)`: Set erase tool size
- `setEraseOpacity(float opacity)`: Set soft erase intensity
- `eraseAt(const glm::vec2& position)`: Erase at specific point
- `eraseLine(const glm::vec2& start, const glm::vec2& end)`: Erase along path

### 2. React Integration

The React hook provides a clean interface for the erase functionality:

#### State Management
```typescript
const [eraseMode, setEraseMode] = useState<'normal' | 'erase' | 'soft_erase'>('normal');
const [eraseRadius, setEraseRadius] = useState(10);
const [eraseOpacity, setEraseOpacity] = useState(0.5);
const [currentLayer, setCurrentLayer] = useState(0);
const [layerCount, setLayerCount] = useState(1);
```

#### Available Methods
- `setEraseMode(mode)`: Change erase mode
- `setEraseRadius(radius)`: Adjust erase size
- `setEraseOpacity(opacity)`: Set soft erase intensity
- `eraseAt(x, y)`: Erase at coordinates
- `eraseLine(x1, y1, x2, y2)`: Erase along line
- `addLayer()`: Create new layer
- `removeLayer()`: Delete current layer
- `setCurrentLayer(index)`: Switch layers
- `clearAllLayers()`: Clear everything

---

## How to Use

### 1. Basic Erasing

1. **Select Erase Mode**: Click the "🧽 Erase" button
2. **Adjust Radius**: Use the slider to set erase size
3. **Erase**: Click and drag on the canvas to erase content

### 2. Soft Erasing

1. **Select Soft Erase Mode**: Click the "🌫️ Soft Erase" button
2. **Adjust Radius**: Set the size of the soft erase area
3. **Adjust Opacity**: Use the opacity slider to control fade intensity
4. **Soft Erase**: Click and drag to reduce opacity of content

### 3. Layer Management

1. **Add Layer**: Click the "➕" button to create a new layer
2. **Switch Layers**: Use the dropdown to select which layer to draw on
3. **Remove Layer**: Click the "➖" button to delete the current layer
4. **Clear All**: Click "🗑️ Clear All" to start fresh

---

## Integration with Canvas

### 1. Mouse Events

The erase functionality works with standard mouse events:

```typescript
// Mouse down - start erase
const handleMouseDown = (e: React.MouseEvent) => {
  if (eraseMode !== 'normal') {
    eraseAt(e.clientX, e.clientY);
  }
};

// Mouse move - continue erase
const handleMouseMove = (e: React.MouseEvent) => {
  if (eraseMode !== 'normal' && isDrawing) {
    eraseLine(lastX, lastY, e.clientX, e.clientY);
  }
};
```

### 2. Touch Events

For mobile support, use touch events:

```typescript
// Touch start
const handleTouchStart = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  if (eraseMode !== 'normal') {
    eraseAt(touch.clientX, touch.clientY);
  }
};

// Touch move
const handleTouchMove = (e: React.TouchEvent) => {
  const touch = e.touches[0];
  if (eraseMode !== 'normal' && isDrawing) {
    eraseLine(lastX, lastY, touch.clientX, touch.clientY);
  }
};
```

---

## Performance Considerations

### 1. Vertex Management
- The erase system works by manipulating vertex data
- Large drawings may have performance impact during erasing
- Consider batching erase operations for better performance

### 2. Layer Optimization
- Each layer maintains its own vertex data
- More layers = more memory usage
- Consider limiting the number of layers for large drawings

### 3. Erase Radius
- Larger erase radius = more vertices to process
- Consider capping maximum erase radius for performance

---

## Troubleshooting

### Common Issues

#### 1. Erase Not Working
- Check that you're in erase mode (not normal mode)
- Verify the erase radius is not too small
- Ensure you're clicking on drawn content

#### 2. Performance Issues
- Reduce the number of layers
- Use smaller erase radius
- Limit the amount of content on screen

#### 3. Soft Erase Not Visible
- Check that you're in soft erase mode
- Adjust the opacity slider
- Ensure the content has sufficient initial opacity

### Debug Tips

1. **Check Console Logs**: The system logs all erase operations
2. **Verify Mode**: Ensure you're in the correct erase mode
3. **Test Radius**: Try different erase radius values
4. **Layer Check**: Verify you're on the correct layer

---

## Extending the Feature

### 1. Additional Erase Shapes
You can extend the erase functionality with different shapes:

```cpp
// Erase with rectangle
void eraseRectangle(const glm::vec2& position, const glm::vec2& size);

// Erase with circle
void eraseCircle(const glm::vec2& center, float radius);

// Erase with custom path
void erasePath(const std::vector<glm::vec2>& points);
```

### 2. Advanced Layer Features
Add more layer management features:

```cpp
// Layer visibility toggle
void setLayerVisible(int layerIndex, bool visible);

// Layer opacity control
void setLayerOpacity(int layerIndex, float opacity);

// Layer blending modes
void setLayerBlendMode(int layerIndex, BlendMode mode);
```

### 3. Undo/Redo Support
Implement undo/redo for erase operations:

```cpp
// Save state before erase
void saveState();

// Undo last erase operation
void undo();

// Redo last undone operation
void redo();
```

---

## Best Practices

### 1. User Experience
- Provide visual feedback for erase mode
- Show erase radius preview
- Use intuitive icons and labels

### 2. Performance
- Batch erase operations when possible
- Limit maximum erase radius
- Optimize vertex data structures

### 3. Accessibility
- Provide keyboard shortcuts
- Include screen reader support
- Use high contrast colors for UI elements

---

This erase feature provides a powerful and flexible way to edit your drawings while maintaining good performance and user experience. The modular design makes it easy to extend and customize for your specific needs. 