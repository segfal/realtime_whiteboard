import { useState, useCallback, useMemo } from 'react';
import { ToolManager } from '../tools/ToolManager';
import type { ToolType, ToolSettings, ToolState } from '../types/tool';
import type { WASMShape } from '../types/wasm';

export const useToolManager = () => {
    const [toolManager] = useState(() => new ToolManager());
    const [state, setState] = useState<ToolState>(toolManager.getState());
    
    const setActiveTool = useCallback((toolType: ToolType) => {
        console.log('Setting active tool to:', toolType)
        toolManager.setActiveTool(toolType);
        setState(toolManager.getState());
    }, [toolManager]);
    
    const updateSettings = useCallback((settings: Partial<ToolSettings>) => {
        toolManager.updateSettings(settings);
        setState(toolManager.getState());
    }, [toolManager]);
    
    const startDrawing = useCallback((point: { x: number; y: number }) => {
        toolManager.startDrawing(point);
    }, [toolManager]);
    
    const continueDrawing = useCallback((point: { x: number; y: number }) => {
        toolManager.continueDrawing(point);
    }, [toolManager]);
    
    const finishDrawing = useCallback((): WASMShape | null => {
        return toolManager.finishDrawing();
    }, [toolManager]);
    
    const handlePointerDown = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
        toolManager.handlePointerDown(event, canvas);
    }, [toolManager]);
    
    const handlePointerMove = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
        toolManager.handlePointerMove(event, canvas);
    }, [toolManager]);
    
    const handlePointerUp = useCallback((event: PointerEvent, canvas: HTMLCanvasElement) => {
        toolManager.handlePointerUp(event, canvas);
    }, [toolManager]);
    
    const activeTool = useMemo(() => toolManager.getActiveTool(), [toolManager, state.activeTool]);
    const allTools = useMemo(() => toolManager.getAllTools(), [toolManager]);
    
    return {
        // State
        activeTool,
        allTools,
        settings: state.settings,
        toolState: state,
        
        // Actions
        setActiveTool,
        updateSettings,
        startDrawing,
        continueDrawing,
        finishDrawing,
        
        // Event handlers
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        
        // Utility
        getTool: toolManager.getTool.bind(toolManager)
    };
}; 