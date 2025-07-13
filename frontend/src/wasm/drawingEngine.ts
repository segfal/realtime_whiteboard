import type { DrawingEngineWASM, WASMStroke, WASMPoint } from '../types/wasm';



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
            // @ts-ignore
            const DrawingEngineModule = window.DrawingEngineModule;
            this.module = await DrawingEngineModule();
            this.engine = new this.module.DrawingEngine();
            this.isLoaded = true;
        } catch (error) {
            console.error('Failed to load WASM:', error);
            throw error;
        }
    }

    isReady(): boolean {
        return this.isLoaded && this.engine !== null;
    }

    // Bridge methods
    addStroke(stroke: WASMStroke): void {
        if (!this.isReady()) throw new Error('WASM not loaded');
        // Convert JS array to C++ vector
        const PointVector = this.module.PointVector;
        const pointsVec = new PointVector();
        stroke.points.forEach(pt => pointsVec.push_back(pt));
        // Construct the stroke with the correct vector type
        const wasmStroke = {
            points: pointsVec,
            color: stroke.color,
            thickness: stroke.thickness
        };
        this.engine.addStroke(wasmStroke);
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
                arr.push({
                    points: points,
                    color: stroke.color,
                    thickness: stroke.thickness
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
}

export const drawingEngine = new DrawingEngineBridge();