interface StrokePoint {
  x: number;
  y: number;
}

interface ShapeDetectionResult {
  shape: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  refinedPoints: StrokePoint[];
}

export class ShapeDetectionService {
  private static instance: ShapeDetectionService;
  private apiUrl = "http://localhost:5050";
  private isAvailable = false;

  static getInstance(): ShapeDetectionService {
    if (!ShapeDetectionService.instance) {
      ShapeDetectionService.instance = new ShapeDetectionService();
    }
    return ShapeDetectionService.instance;
  }

  constructor() {
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const health = await response.json();
        this.isAvailable = health.model_loaded === true;
        console.log(
          "🔍 Shape Detection Service:",
          this.isAvailable ? "Available" : "Model not loaded"
        );
      }
    } catch (error) {
      this.isAvailable = false;
      console.log("🔍 Shape Detection Service: Offline");
    }
  }

  async detectShape(
    points: StrokePoint[],
    strokeId: string,
    roomId: string
  ): Promise<ShapeDetectionResult | null> {
    if (!this.isAvailable || points.length < 3) {
      return null;
    }

    try {
      console.log(
        `🔍 Detecting shape for stroke ${strokeId} with ${points.length} points`
      );

      const response = await fetch(`${this.apiUrl}/detect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points: points.map((p) => [p.x, p.y]),
          stroke_id: strokeId,
          room_id: roomId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Detection API error: ${response.status}`);
      }

      const result = await response.json();

      console.log(
        `🎯 Detected: ${result.shape} (${(result.confidence * 100).toFixed(1)}%)`
      );

      return {
        shape: result.shape,
        confidence: result.confidence,
        allProbabilities: result.all_probabilities || {},
        refinedPoints: result.refined_points.map(([x, y]: number[]) => ({
          x,
          y,
        })),
      };
    } catch (error) {
      console.error("❌ Shape detection error:", error);
      return null;
    }
  }

  shouldShowSuggestion(confidence: number): boolean {
    return confidence > 0.7;
  }

  async detectAndSuggest(
    points: StrokePoint[],
    strokeId: string,
    roomId: string,
    onSuggestion: (result: ShapeDetectionResult) => void
  ): Promise<void> {
    const result = await this.detectShape(points, strokeId, roomId);

    if (result && this.shouldShowSuggestion(result.confidence)) {
      onSuggestion(result);
    }
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  async refreshAvailability(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }
}
