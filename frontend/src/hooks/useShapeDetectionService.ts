import { useCallback, useEffect, useState } from "react";
import { ShapeDetectionService } from "../services/ShapeDetectionService";

export interface UseShapeDetectionServiceResult {
  isServiceAvailable: boolean;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  checkServiceStatus: () => Promise<void>;
}

export const useShapeDetectionService = (
  initialEnabled: boolean = true
): UseShapeDetectionServiceResult => {
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);

  const checkServiceStatus = useCallback(async () => {
    try {
      const service = ShapeDetectionService.getInstance();
      await service.refreshAvailability();
      const available = service.isServiceAvailable();
      setIsServiceAvailable(available);

      // If service becomes unavailable, disable shape detection
      if (!available && isEnabled) {
        setIsEnabled(false);
      }
    } catch (error) {
      console.warn("Failed to check shape detection service status:", error);
      setIsServiceAvailable(false);
      if (isEnabled) {
        setIsEnabled(false);
      }
    }
  }, [isEnabled]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (enabled && !isServiceAvailable) {
        console.warn("Cannot enable shape detection: service is not available");
        return;
      }
      setIsEnabled(enabled);
    },
    [isServiceAvailable]
  );

  // Initial service check
  useEffect(() => {
    checkServiceStatus();
  }, [checkServiceStatus]);

  // Periodic service availability check
  useEffect(() => {
    const interval = setInterval(checkServiceStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [checkServiceStatus]);

  return {
    isServiceAvailable,
    isEnabled,
    setEnabled,
    checkServiceStatus,
  };
};
