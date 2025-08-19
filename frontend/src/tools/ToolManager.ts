import type {
  DrawingTool,
  ToolType,
  ToolSettings,
  ToolState,
} from "../types/tool";
import { StrokeTool } from "./StrokeTool";
import { RectangleTool } from "./RectangleTool";
import { EllipseTool } from "./EllipseTool";
import { EraserTool } from "./EraserTool";
import { SelectTool } from "./SelectTool";
import type { WASMShape } from "../types/wasm";

export class ToolManager {
  private tools: Map<ToolType, DrawingTool> = new Map();
  private activeTool: ToolType = "stroke";
  private settings: ToolSettings = {
    color: { r: 0, g: 0, b: 0, a: 1 },
    thickness: 2,
  };

  constructor() {
    this.initializeTools();
    // Set the first tool as active
    this.setActiveTool("stroke");
  }

  private initializeTools(): void {
    // Initialize all tools with default settings
    this.tools.set("stroke", new StrokeTool(this.settings));
    this.tools.set("rectangle", new RectangleTool(this.settings));
    this.tools.set("ellipse", new EllipseTool(this.settings));
    this.tools.set("eraser", new EraserTool(this.settings));
    this.tools.set("select", new SelectTool(this.settings));

    console.log(
      "ToolManager: Initialized tools:",
      Array.from(this.tools.keys()),
    );
  }

  getActiveTool(): DrawingTool {
    const tool = this.tools.get(this.activeTool);
    if (!tool) {
      throw new Error(`Tool ${this.activeTool} not found`);
    }
    return tool;
  }

  setActiveTool(toolType: ToolType): void {
    if (!this.tools.has(toolType)) {
      throw new Error(`Tool ${toolType} not found`);
    }

    console.log("ToolManager: Switching from", this.activeTool, "to", toolType);

    // Deactivate previous tool
    const previousTool = this.tools.get(this.activeTool);
    if (previousTool) {
      previousTool.isActive = false;
    }

    // Activate new tool
    this.activeTool = toolType;
    const newTool = this.tools.get(toolType);
    if (newTool) {
      newTool.isActive = true;
    }

    console.log("ToolManager: Active tool is now", this.activeTool);
  }

  getTool(toolType: ToolType): DrawingTool | undefined {
    return this.tools.get(toolType);
  }

  getAllTools(): DrawingTool[] {
    return Array.from(this.tools.values());
  }

  updateSettings(settings: Partial<ToolSettings>): void {
    this.settings = { ...this.settings, ...settings };

    console.log("ToolManager: Updating settings:", this.settings);

    // Update all tools with new settings
    this.tools.forEach((tool) => {
      tool.updateSettings?.(this.settings);
    });

    // Also update the active tool's color and thickness directly
    const activeTool = this.getActiveTool();
    if (settings.color) activeTool.color = settings.color;
    if (settings.thickness) activeTool.thickness = settings.thickness;
  }

  getSettings(): ToolSettings {
    return { ...this.settings };
  }

  // Tool operation methods
  startDrawing(point: { x: number; y: number }): void {
    const tool = this.getActiveTool();
    tool.startDrawing?.(point);
  }

  continueDrawing(point: { x: number; y: number }): void {
    const tool = this.getActiveTool();
    tool.continueDrawing?.(point);
  }

  finishDrawing(): WASMShape | null {
    const tool = this.getActiveTool();
    return tool.finishDrawing?.() || null;
  }

  // Event handling
  handlePointerDown(event: PointerEvent, canvas: HTMLCanvasElement): void {
    const tool = this.getActiveTool();
    tool.onPointerDown?.(event, canvas);
  }

  handlePointerMove(event: PointerEvent, canvas: HTMLCanvasElement): void {
    const tool = this.getActiveTool();
    tool.onPointerMove?.(event, canvas);
  }

  handlePointerUp(event: PointerEvent, canvas: HTMLCanvasElement): void {
    const tool = this.getActiveTool();
    tool.onPointerUp?.(event, canvas);
  }

  // State management
  getState(): ToolState {
    return {
      activeTool: this.activeTool,
      tools: Object.fromEntries(this.tools) as Record<ToolType, DrawingTool>,
      settings: this.settings,
    };
  }
}
