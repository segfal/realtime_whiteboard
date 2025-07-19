import { useEffect, useState } from 'react';
import { drawingEngine, testWASM } from '../wasm/drawingEngine';

export const useWASM = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWASM = async () => {
      try {
        // Run the test function first to verify WASM functionality
        console.log('Testing WASM functionality...');
        const testResult = await testWASM();
        if (!testResult) {
          setError('WASM test failed');
          return;
        }
        
        // If test passes, proceed with normal loading
        await drawingEngine.loadWASM();
        // Add a small delay to ensure the engine is fully ready
        setTimeout(() => {
          if (drawingEngine.isReady()) {
            setIsLoaded(true);
          } else {
            setError('Engine not ready after loading');
          }
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load WASM');
      }
    };

    loadWASM();
  }, []);

  return { drawingEngine, isLoaded, error };
};