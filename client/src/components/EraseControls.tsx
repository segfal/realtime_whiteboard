import React from 'react';
import { useDrawingEngine } from '../hooks/useDrawingEngine';

/**
 * EraseControls Component
 * 
 * This component provides UI controls for the erase functionality:
 * - Erase mode selection (normal, erase, soft erase)
 * - Erase radius control
 * - Erase opacity control (for soft erase)
 * - Layer management (add, remove, switch layers)
 * 
 * It's designed to be beginner-friendly with clear labels and helpful tooltips.
 */
const EraseControls: React.FC = () => {
  const {
    eraseMode,
    eraseRadius,
    eraseOpacity,
    currentLayer,
    layerCount,
    setEraseMode,
    setEraseRadius,
    setEraseOpacity,
    addLayer,
    removeLayer,
    setCurrentLayer,
    clearAllLayers,
  } = useDrawingEngine();

  return (
    <div className="erase-controls" style={styles.container}>
      <h3 style={styles.title}>🎨 Drawing Tools</h3>
      
      {/* Erase Mode Selection */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>Mode</h4>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...(eraseMode === 'normal' ? styles.activeButton : {})
            }}
            onClick={() => setEraseMode('normal')}
            title="Normal drawing mode - draw lines, shapes, etc."
          >
            ✏️ Draw
          </button>
          <button
            style={{
              ...styles.button,
              ...(eraseMode === 'erase' ? styles.activeButton : {})
            }}
            onClick={() => setEraseMode('erase')}
            title="Erase mode - completely remove drawn content"
          >
            🧽 Erase
          </button>
          <button
            style={{
              ...styles.button,
              ...(eraseMode === 'soft_erase' ? styles.activeButton : {})
            }}
            onClick={() => setEraseMode('soft_erase')}
            title="Soft erase mode - reduce opacity of drawn content"
          >
            🌫️ Soft Erase
          </button>
        </div>
      </div>

      {/* Erase Radius Control */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>
          Erase Radius: {eraseRadius}px
        </h4>
        <input
          type="range"
          min="1"
          max="50"
          value={eraseRadius}
          onChange={(e) => setEraseRadius(Number(e.target.value))}
          style={styles.slider}
          title="Adjust the size of the erase tool"
        />
        <div style={styles.rangeLabels}>
          <span>Small</span>
          <span>Large</span>
        </div>
      </div>

      {/* Erase Opacity Control (only for soft erase) */}
      {eraseMode === 'soft_erase' && (
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>
            Erase Opacity: {Math.round(eraseOpacity * 100)}%
          </h4>
          <input
            type="range"
            min="0"
            max="100"
            value={eraseOpacity * 100}
            onChange={(e) => setEraseOpacity(Number(e.target.value) / 100)}
            style={styles.slider}
            title="Adjust how much opacity is reduced when soft erasing"
          />
          <div style={styles.rangeLabels}>
            <span>Light</span>
            <span>Heavy</span>
          </div>
        </div>
      )}

      {/* Layer Management */}
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>
          Layers ({layerCount} total)
        </h4>
        
        {/* Layer Selection */}
        <div style={styles.layerControls}>
          <select
            value={currentLayer}
            onChange={(e) => setCurrentLayer(Number(e.target.value))}
            style={styles.select}
            title="Select which layer to draw on"
          >
            {Array.from({ length: layerCount }, (_, i) => (
              <option key={i} value={i}>
                Layer {i + 1}
              </option>
            ))}
          </select>
          
          <button
            onClick={addLayer}
            style={styles.iconButton}
            title="Add a new layer"
          >
            ➕
          </button>
          
          <button
            onClick={removeLayer}
            style={styles.iconButton}
            title="Remove the current layer"
            disabled={layerCount <= 1}
          >
            ➖
          </button>
        </div>

        {/* Clear All Button */}
        <button
          onClick={clearAllLayers}
          style={styles.clearButton}
          title="Clear all layers and start fresh"
        >
          🗑️ Clear All
        </button>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h4 style={styles.sectionTitle}>How to Use</h4>
        <ul style={styles.instructionList}>
          <li>Select a mode: Draw, Erase, or Soft Erase</li>
          <li>Adjust the radius to control tool size</li>
          <li>Click and drag on the canvas to draw or erase</li>
          <li>Use layers to organize your drawing</li>
          <li>Soft erase reduces opacity instead of removing</li>
        </ul>
      </div>
    </div>
  );
};

// Styles for the component
const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    border: '1px solid #ddd',
    maxWidth: '300px',
    fontFamily: 'Arial, sans-serif',
  },
  title: {
    margin: '0 0 20px 0',
    color: '#333',
    fontSize: '18px',
    textAlign: 'center' as const,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    color: '#555',
    fontSize: '14px',
    fontWeight: 'bold' as const,
  },
  buttonGroup: {
    display: 'flex',
    gap: '5px',
  },
  button: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  activeButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderColor: '#0056b3',
  },
  slider: {
    width: '100%',
    margin: '10px 0',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
  },
  layerControls: {
    display: 'flex',
    gap: '5px',
    marginBottom: '10px',
  },
  select: {
    flex: 1,
    padding: '5px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '12px',
  },
  iconButton: {
    padding: '5px 8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  clearButton: {
    width: '100%',
    padding: '8px',
    border: '1px solid #dc3545',
    borderRadius: '4px',
    backgroundColor: '#dc3545',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  instructions: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
  },
  instructionList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#555',
  },
};

export default EraseControls; 