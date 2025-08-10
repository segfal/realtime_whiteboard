import type { DrawingEngineWASM, WASMStroke, WASMPoint, WASMShape, WASMStrokeShape } from '../types/wasm';



declare global {
    interface Window {
        DrawingEngine: {
            new(): DrawingEngineWASM;
        };
    }
}



class DrawingEngineBridge {
    private module: any = null;
    private engine: any = null;
    private isLoaded = false;

    async loadWASM(): Promise<void> {
        try {
            // Wait for the WASM module to be available
            let DrawingEngineModule = null;
            let attempts = 0;
            const maxAttempts = 50; // Wait up to 5 seconds
            
            while (!DrawingEngineModule && attempts < maxAttempts) {
                // @ts-ignore
                DrawingEngineModule = (window as any).DrawingEngineModule || (globalThis as any).DrawingEngineModule;
                if (!DrawingEngineModule) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
            }
            
            if (!DrawingEngineModule) {
                throw new Error('DrawingEngineModule not found after waiting. Make sure the WASM script is loaded.');
            }
            
            console.log('Found DrawingEngineModule, initializing...');
            this.module = await DrawingEngineModule();
            console.log('Module loaded:', this.module);
            console.log('Available module properties:', Object.getOwnPropertyNames(this.module));
            
            // Test if DrawingEngine constructor exists
            if (!this.module.DrawingEngine) {
                console.error('DrawingEngine constructor not found in module');
                throw new Error('DrawingEngine constructor not available');
            }
            
            this.engine = new this.module.DrawingEngine();
            console.log('Engine created:', this.engine);
            
            // WASM methods are not directly enumerable, so we need to check them differently
            const hasMethod = (obj: any, methodName: string) => {
                return typeof obj[methodName] === 'function';
            };
            
            console.log('Checking WASM methods:');
            console.log('- addStroke:', hasMethod(this.engine, 'addStroke'));
            console.log('- addPointToStroke:', hasMethod(this.engine, 'addPointToStroke'));
            console.log('- removeStroke:', hasMethod(this.engine, 'removeStroke'));
            console.log('- moveStroke:', hasMethod(this.engine, 'moveStroke'));
            console.log('- clear:', hasMethod(this.engine, 'clear'));
            console.log('- getStrokes:', hasMethod(this.engine, 'getStrokes'));
            
            // Test if addStroke method exists
            if (!hasMethod(this.engine, 'addStroke')) {
                console.error('addStroke method not found on engine');
                throw new Error('addStroke method not available on engine');
            }
            
            this.isLoaded = true;
            console.log('WASM loaded successfully:', this.engine);
            
            // Test the WASM module with a simple operation
            try {
                this.engine.clear();
                console.log('WASM test: clear() method works');
            } catch (error) {
                console.error('WASM test: clear() method failed:', error);
            }
        } catch (error) {
            console.error('Failed to load WASM:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this.isLoaded && this.engine !== null;
    }

    // Legacy methods for backward compatibility (these work with the simplified bindings)
    addStroke(stroke: WASMStroke): void {
        if (!this.isReady()) {
            console.error('WASM not ready. isLoaded:', this.isLoaded, 'engine:', this.engine);
            throw new Error('WASM not loaded');
        }
        
        const hasMethod = (obj: any, methodName: string) => {
            return typeof obj[methodName] === 'function';
        };
        
        if (!hasMethod(this.engine, 'addStroke')) {
            console.error('addStroke method not found on engine:', this.engine);
            throw new Error('addStroke method not available on engine');
        }
        
        // Create a proper StrokeShape instance using the C++ constructor
        const StrokeShape = this.module.StrokeShape;
        if (!StrokeShape) {
            console.error('StrokeShape constructor not found in module');
            throw new Error('StrokeShape constructor not available');
        }
        
        // Convert JS array to C++ vector
        const PointVector = this.module.PointVector;
        if (!PointVector) {
            console.error('PointVector constructor not found in module');
            throw new Error('PointVector constructor not available');
        }
        
        const pointsVec = new PointVector();
        stroke.points.forEach(pt => pointsVec.push_back(pt));
        
        // Create StrokeShape with color, thickness, and points
        const strokeShape = new StrokeShape(stroke.color, stroke.thickness, pointsVec);
        this.engine.addStroke(strokeShape);
    }

    addPointToStroke(strokeIndex: number, point: WASMPoint): void {
        if (!this.isReady()) throw new Error('WASM not loaded');
        this.engine.addPointToStroke(strokeIndex, point);
    }

    removeStroke(index: number): void {
        if (!this.isReady()) throw new Error('WASM not loaded');
        this.engine.removeStroke(index);
    }

    moveStroke(index: number, dx: number, dy: number): void {
        if (!this.isReady()) throw new Error('WASM not loaded');
        this.engine.moveStroke(index, dx, dy);
    }

    clear(): void {
        if (!this.isReady()) throw new Error('WASM not loaded');
        this.engine.clear();
    }

    getStrokes(): WASMStroke[] {
        if (!this.isReady()) throw new Error('WASM not loaded');
        const strokesVec = this.engine.getStrokes();
        // Embind vector has .size() and .get(i)
        if (typeof strokesVec.size === 'function' && typeof strokesVec.get === 'function') {
            const arr = [];
            for (let i = 0; i < strokesVec.size(); i++) {
                const stroke = strokesVec.get(i);
                
                // Convert ClassHandle points to plain objects
                const points = [];
                if (stroke.points && typeof stroke.points.size === 'function') {
                    for (let j = 0; j < stroke.points.size(); j++) {
                        const point = stroke.points.get(j);
                        points.push({ x: point.x, y: point.y });
                    }
                }
                
                // Use getter methods to access color and thickness
                const color = stroke.getColor ? stroke.getColor() : { r: 0, g: 0, b: 0, a: 1 };
                const thickness = stroke.getThickness ? stroke.getThickness() : 1;
                

                
                arr.push({
                    points: points,
                    color: color,
                    thickness: thickness
                });
            }
            return arr;
        }
        // fallback: if it's already an array
        if (Array.isArray(strokesVec)) {
            return strokesVec;
        }
        return [];
    }

    getVertexBufferData(): number[] {
        if (!this.isReady()) throw new Error('WASM not loaded');
        return this.engine.getVertexBufferData();
    }

    // Polymorphic shape methods
    addShape(shape: WASMShape): void {
        if (shape.type === 'stroke') {
            const strokeShape = shape as WASMStrokeShape;
            this.addStroke({
                points: strokeShape.points,
                color: strokeShape.color,
                thickness: strokeShape.thickness
            });
        } else if (shape.type === 'rectangle') {
            // For now, convert rectangle to stroke since rectangle shapes aren't implemented in WASM yet
            const rectShape = shape as any;
            const points = [
                { x: rectShape.topLeft.x, y: rectShape.topLeft.y },
                { x: rectShape.bottomRight.x, y: rectShape.topLeft.y },
                { x: rectShape.bottomRight.x, y: rectShape.bottomRight.y },
                { x: rectShape.topLeft.x, y: rectShape.bottomRight.y },
                { x: rectShape.topLeft.x, y: rectShape.topLeft.y }
            ];
            this.addStroke({
                points: points,
                color: rectShape.color,
                thickness: rectShape.thickness
            });
        } else {
            const shapeType = (shape as any).type;
            console.warn(`Shape type ${shapeType} is not yet supported in WASM`);
        }
    }

    removeShape(index: number): void {
        this.removeStroke(index);
    }

    moveShape(index: number, dx: number, dy: number): void {
        this.moveStroke(index, dx, dy);
    }
}

export const drawingEngine = new DrawingEngineBridge();

// Test function to verify WASM functionality
export const testWASM = async () => {
    try {
        await drawingEngine.loadWASM();
        console.log('WASM test: Module loaded successfully');
        
        // Test creating a simple stroke
        const testStroke: WASMStroke = {
            points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
            color: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
            thickness: 2.0
        };
        
        drawingEngine.addStroke(testStroke);
        console.log('WASM test: addStroke works');
        
        const strokes = drawingEngine.getStrokes();
        console.log('WASM test: getStrokes works, count:', strokes.length);
        
        return true;
    } catch (error) {
        console.error('WASM test failed:', error);
        return false;
    }
};