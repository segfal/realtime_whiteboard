import type { ToolType, ToolSettings } from '../types/tool'

export interface ToolbarProps {
    activeTool: ToolType;
    onToolSelect: (toolType: ToolType) => void;
    settings: ToolSettings;
    onSettingsChange: (settings: Partial<ToolSettings>) => void;
}

export interface CanvasProps {
    width: number;
    height: number;
} 