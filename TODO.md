# TODO - Whiteboard Development

## 🚨 High Priority Issues

### 1. Performance Optimization - Reduce Lag
**Issue**: Eraser and drawing operations have noticeable lag

**Files to investigate**:
- `frontend/src/contexts/WhiteboardContext.tsx` - Check state updates and re-renders
- `frontend/src/components/Canvas.tsx` - Look at drawing loop and event handling
- `frontend/src/wasm/drawingEngine.ts` - Check WASM method calls and data transfer
- `frontend/src/hooks/useWasm.ts` - Examine WASM loading and synchronization

**Potential fixes**:
- Implement stroke batching for eraser operations
- Add debouncing to pointer move events
- Optimize canvas redraw frequency
- Check for unnecessary re-renders in React components

### 2. Shape Rendering Bug - Fix Disconnected Ellipses
**Issue**: Ellipses render as disconnected segments connected by lines (see image)

**Files to investigate**:
- `frontend/src/components/Canvas.tsx` - Lines 200-280 (handleShapeUp method)
- `frontend/src/tools/EllipseTool.ts` - Check ellipse point generation
- `frontend/src/contexts/WhiteboardContext.tsx` - Look at shape creation logic

**Current problematic code**:
```typescript
// In Canvas.tsx handleShapeUp - this creates separate strokes instead of one shape
startDrawing(points[0])
points.slice(1).forEach(point => {
  continueDrawing(point)
})
finishDrawing()
```

**Potential fixes**:
- Create single stroke with all ellipse points
- Use WASM shape methods instead of stroke-based rendering
- Fix point generation algorithm in EllipseTool
- Ensure proper stroke closure for ellipses

## 🔧 Development Tasks

### 3. Debug Infrastructure Cleanup
- Review debug logging performance impact
- Consider conditional debug logging based on environment
- Clean up debug files in `debug-logs/` directory

### 4. Code Organization
- Move shape generation logic from Canvas to respective tool classes
- Implement proper shape preview rendering
- Add proper error boundaries for WASM operations

## 📁 Key Files Reference

### Core Components
- `frontend/src/components/Canvas.tsx` - Main drawing canvas
- `frontend/src/contexts/WhiteboardContext.tsx` - State management
- `frontend/src/wasm/drawingEngine.ts` - WASM bridge

### Tools
- `frontend/src/tools/EllipseTool.ts` - Ellipse drawing logic
- `frontend/src/tools/EraserTool.ts` - Eraser functionality
- `frontend/src/tools/RectangleTool.ts` - Rectangle drawing logic

### Debug & Performance
- `frontend/src/utils/debug.ts` - Debugging utilities
- `frontend/src/hooks/useWasm.ts` - WASM integration
- `frontend/src/components/DebugPanel.tsx` - Debug interface

## 🎯 Next Steps
1. **Start with performance**: Profile eraser operations in browser dev tools
2. **Fix shape rendering**: Modify ellipse generation to create single connected stroke
3. **Test thoroughly**: Ensure changes don't break other tools
4. **Update documentation**: Document any architectural changes

## 🔍 Debugging Tips
- Use browser dev tools Performance tab to identify lag sources
- Check React DevTools for unnecessary re-renders
- Use debug panel to monitor WASM operations
- Test with different stroke sizes and shapes 