import { useState, useEffect } from 'react';
import { 
  getDebugSession, 
  clearDebugSession, 
  downloadDebugSession,
  setDebugConfig,
  debugConfig 
} from '../utils/debug';

export const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(getDebugSession());
  const [config, setConfig] = useState(debugConfig);

  // Update session data every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSession(getDebugSession());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDownloadSession = () => {
    downloadDebugSession();
  };

  const handleOpenDebugFolder = () => {
    // This will open the debug-logs folder in the file explorer
    window.open('file://' + window.location.origin.replace('http://localhost:5173', '') + '/debug-logs', '_blank');
  };

  const handleClearSession = () => {
    clearDebugSession();
    setSession(getDebugSession());
  };

  const handleConfigChange = (key: keyof typeof debugConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setDebugConfig(newConfig);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
        title="Open Debug Panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Session Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-700 mb-2">Session Info</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>ID: {session.sessionId}</div>
          <div>Start: {new Date(session.startTime).toLocaleTimeString()}</div>
          <div>Operations: {session.metadata.totalOperations}</div>
          <div>Strokes: {session.metadata.totalStrokes}</div>
          <div>WASM Loaded: {session.metadata.wasmLoaded ? '✅' : '❌'}</div>
        </div>
      </div>

      {/* Recent Operations */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Recent Operations</h4>
        <div className="max-h-32 overflow-y-auto">
          {session.operations.slice(-5).reverse().map((op) => (
            <div key={op.id} className="text-xs p-2 bg-blue-50 rounded mb-1">
              <div className="font-medium">{op.type} ({op.tool})</div>
              <div className="text-gray-600">
                {new Date(op.timestamp).toLocaleTimeString()}
              </div>
              {op.performance && (
                <div className="text-green-600">
                  {op.performance.duration.toFixed(2)}ms
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Debug Configuration */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-700 mb-2">Debug Settings</h4>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.logToFile}
              onChange={(e) => handleConfigChange('logToFile', e.target.checked)}
              className="mr-2"
            />
            Log to File
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.logWASM}
              onChange={(e) => handleConfigChange('logWASM', e.target.checked)}
              className="mr-2"
            />
            Log WASM
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.logToolState}
              onChange={(e) => handleConfigChange('logToolState', e.target.checked)}
              className="mr-2"
            />
            Log Tool State
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.logEvents}
              onChange={(e) => handleConfigChange('logEvents', e.target.checked)}
              className="mr-2"
            />
            Log Events
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.logPerformance}
              onChange={(e) => handleConfigChange('logPerformance', e.target.checked)}
              className="mr-2"
            />
            Log Performance
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 mb-2">
        <button
          onClick={handleDownloadSession}
          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
        >
          Download Session
        </button>
        <button
          onClick={handleClearSession}
          className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition-colors"
        >
          Clear Session
        </button>
      </div>
      
      {/* Debug Info */}
      <div className="text-xs text-gray-500 text-center">
        Debug files auto-saved to: ~/realtime_whiteboard/debug-logs/
      </div>
    </div>
  );
}; 