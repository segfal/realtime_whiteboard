# Realtime Whiteboard Frontend

A modern web-based whiteboard application with real-time drawing capabilities, built with React, TypeScript, and WebAssembly.

## Features

### 🎨 Drawing Tools

- **Pen Tool**: Freehand drawing with customizable color and thickness
- **Rectangle Tool**: Draw rectangles with click and drag
- **Ellipse Tool**: Draw ellipses with click and drag
- **Eraser Tool**: Erase strokes with adjustable eraser size
- **Select Tool**: Select and move existing strokes

### 🛠️ Tool Features

- **Color Picker**: Choose any color for your drawings
- **Thickness Control**: Adjust line thickness from 1-20px
- **Eraser Size**: Adjustable eraser size from 5-50px
- **Real-time Preview**: See shapes as you draw them
- **Selection Highlighting**: Selected strokes are highlighted in green

### 📁 Export Options

- **PNG Export**: Save your whiteboard as a PNG image
- **SVG Export**: Save your whiteboard as an SVG vector file

### 🎯 Selection & Manipulation

- **Multi-stroke Selection**: Select multiple strokes at once
- **Drag & Drop**: Move selected strokes around the canvas
- **Delete Selected**: Remove selected strokes with one click
- **Clear All**: Clear the entire whiteboard

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

### Drawing
1. Select a drawing tool from the toolbar (Pen, Rectangle, Ellipse)
2. Choose your desired color and thickness
3. Click and drag on the canvas to draw

### Erasing
1. Select the Eraser tool
2. Adjust the eraser size using the slider
3. Click and drag over strokes to erase them

### Selecting & Moving
1. Select the Select tool
2. Click and drag to select strokes (they will be highlighted in green)
3. Click and drag on selected strokes to move them
4. Use the "Delete Selected" button to remove selected strokes

### Exporting
1. Choose your export format (PNG or SVG)
2. Click the "Save" button
3. Your whiteboard will be downloaded to your device

## Technical Details

### Architecture
- **Frontend**: React with TypeScript
- **Drawing Engine**: WebAssembly (C++ compiled to WASM)
- **Graphics**: HTML5 Canvas with 2D context
- **State Management**: React hooks with custom tool management

### Tool System
The application uses a modular tool system where each tool implements a common interface:
- `DrawingTool`: Base interface for all tools
- `ToolManager`: Manages tool state and switching
- Individual tool classes: `StrokeTool`, `RectangleTool`, `EllipseTool`, `EraserTool`, `SelectTool`

### WASM Integration
- Drawing operations are handled by a C++ WebAssembly module
- Provides high-performance drawing capabilities
- Supports stroke management, shape creation, and manipulation

## Development

### Project Structure
```
src/
├── components/          # React components
│   ├── Canvas.tsx      # Main drawing canvas
│   └── Toolbar.tsx     # Tool selection and settings
├── hooks/              # Custom React hooks
│   ├── useToolManager.ts
│   ├── useWasm.ts
│   └── useWebGPU.ts
├── tools/              # Drawing tool implementations
│   ├── ToolManager.ts
│   ├── StrokeTool.ts
│   ├── RectangleTool.ts
│   ├── EllipseTool.ts
│   ├── EraserTool.ts
│   └── SelectTool.ts
├── types/              # TypeScript type definitions
│   ├── tool.ts
│   └── wasm.ts
└── wasm/               # WebAssembly integration
    └── drawingEngine.ts
```

### Adding New Tools
1. Create a new tool class implementing the `DrawingTool` interface
2. Add the tool to the `ToolManager`
3. Update the toolbar to include the new tool
4. Add any necessary event handling in the Canvas component

## Browser Support
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## License
This project is part of a larger realtime whiteboard application.
