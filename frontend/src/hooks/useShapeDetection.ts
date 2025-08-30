import { useCallback, useEffect, useRef, useState } from "react";
import { ShapeDetectionService } from "../services/ShapeDetectionService";

interface ShapeDetectionResult {
  shape: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  refinedPoints: Array<{ x: number; y: number }>;
}

interface UseShapeDetectionProps {
  enabled: boolean;
  roomId: string;
  onShapeSuggestion?: (
    suggestion: ShapeDetectionResult,
    strokeId: string
  ) => void;
  confidenceThreshold?: number;
}

export const useShapeDetection = ({
  enabled,
  roomId,
  onShapeSuggestion,
  confidenceThreshold = 0.7,
}: UseShapeDetectionProps) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<{
    result: ShapeDetectionResult;
    strokeId: string;
  } | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const detectionService = useRef(ShapeDetectionService.getInstance());

  // Check service availability on mount
  useEffect(() => {
    const checkService = async () => {
      const available = await detectionService.current.refreshAvailability();
      setIsServiceAvailable(available);

      if (available) {
        console.log("🔍 Shape detection service is available");
      } else {
        console.log("🔍 Shape detection service is not available");
      }
    };

    checkService();
  }, []);

  const detectShape = useCallback(
    async (points: Array<{ x: number; y: number }>, strokeId: string) => {
      if (!enabled || !isServiceAvailable || points.length < 3) {
        return null;
      }

      setIsDetecting(true);

      try {
        const result = await detectionService.current.detectShape(
          points,
          strokeId,
          roomId
        );

        if (result && result.confidence >= confidenceThreshold) {
          const suggestion = { result, strokeId };
          setCurrentSuggestion(suggestion);
          onShapeSuggestion?.(result, strokeId);

          console.log(
            `✨ Shape suggestion: ${result.shape} (${(result.confidence * 100).toFixed(1)}%)`
          );
          return result;
        }

        return result;
      } catch (error) {
        console.error("❌ Shape detection failed:", error);
        return null;
      } finally {
        setIsDetecting(false);
      }
    },
    [
      enabled,
      isServiceAvailable,
      roomId,
      confidenceThreshold,
      onShapeSuggestion,
    ]
  );

  const dismissSuggestion = useCallback(() => {
    setCurrentSuggestion(null);
  }, []);

  const acceptSuggestion = useCallback(() => {
    if (currentSuggestion) {
      console.log(
        `✅ Accepted shape suggestion: ${currentSuggestion.result.shape}`
      );
      return currentSuggestion.result.refinedPoints;
    }
    return null;
  }, [currentSuggestion]);

  const rejectSuggestion = useCallback(() => {
    if (currentSuggestion) {
      console.log(
        `❌ Rejected shape suggestion: ${currentSuggestion.result.shape}`
      );
    }
    dismissSuggestion();
  }, [currentSuggestion, dismissSuggestion]);

  // Auto-dismiss suggestion after timeout
  useEffect(() => {
    if (currentSuggestion) {
      const timer = setTimeout(() => {
        console.log("⏰ Shape suggestion timed out");
        dismissSuggestion();
      }, 10000); // 10 second timeout

      return () => clearTimeout(timer);
    }
  }, [currentSuggestion, dismissSuggestion]);

  return {
    detectShape,
    isDetecting,
    currentSuggestion: currentSuggestion?.result || null,
    currentStrokeId: currentSuggestion?.strokeId || null,
    dismissSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    isServiceAvailable,
  };
};
