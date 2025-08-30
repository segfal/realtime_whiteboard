import React from "react";

interface ShapeDetectionResult {
  shape: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  refinedPoints: Array<{ x: number; y: number }>;
}

export interface ShapeSuggestionProps {
  suggestion: ShapeDetectionResult;
  onAccept: () => void;
  onReject: () => void;
  position?: { x: number; y: number };
}

export const ShapeSuggestionPanel: React.FC<ShapeSuggestionProps> = ({
  suggestion,
  onAccept,
  onReject,
  position = { x: 20, y: 20 },
}) => {
  const getShapeIcon = (shape: string): string => {
    const icons = {
      line: "📏",
      rectangle: "⬜",
      circle: "⭕",
      triangle: "🔺",
      arrow: "➡️",
      star: "⭐",
      freehand: "✏️",
    };
    return icons[shape as keyof typeof icons] || "🎨";
  };

  const getShapeDisplayName = (shape: string): string => {
    const names = {
      line: "Line",
      rectangle: "Rectangle",
      circle: "Circle",
      triangle: "Triangle",
      arrow: "Arrow",
      star: "Star",
      freehand: "Freehand",
    };
    return names[shape as keyof typeof names] || shape;
  };

  return (
    <div
      className="shape-suggestion-panel"
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        background: "white",
        border: "2px solid #007acc",
        borderRadius: "12px",
        padding: "16px",
        minWidth: "280px",
        boxShadow: "0 8px 24px rgba(0, 122, 204, 0.2)",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui',
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <div
        className="suggestion-header"
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "24px" }}>
          {getShapeIcon(suggestion.shape)}
        </span>
        <div>
          <h4
            style={{
              margin: 0,
              color: "#007acc",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            Shape Detected!
          </h4>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#666",
            }}
          >
            I found a <strong>{getShapeDisplayName(suggestion.shape)}</strong>
          </p>
        </div>
      </div>

      <div
        className="confidence-bar"
        style={{
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#666",
            marginBottom: "4px",
          }}
        >
          <span>Confidence</span>
          <span>{Math.round(suggestion.confidence * 100)}%</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "4px",
            backgroundColor: "#e0e0e0",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${suggestion.confidence * 100}%`,
              height: "100%",
              backgroundColor:
                suggestion.confidence > 0.8 ? "#4caf50" : "#ff9800",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <p
        style={{
          margin: "0 0 16px 0",
          fontSize: "14px",
          color: "#333",
        }}
      >
        Would you like me to clean it up?
      </p>

      <div
        className="suggestion-actions"
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          onClick={onAccept}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#005a9e")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#007acc")
          }
        >
          ✓ Yes, clean it up
        </button>
        <button
          onClick={onReject}
          style={{
            flex: 1,
            padding: "8px 16px",
            backgroundColor: "#f5f5f5",
            color: "#666",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#e8e8e8")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#f5f5f5")
          }
        >
          ✗ Keep as drawn
        </button>
      </div>

      {/* Show all probabilities if available */}
      {Object.keys(suggestion.allProbabilities).length > 0 && (
        <details style={{ fontSize: "12px", color: "#666" }}>
          <summary
            style={{
              cursor: "pointer",
              marginBottom: "8px",
              userSelect: "none",
            }}
          >
            🔍 Detection Details
          </summary>
          <div
            style={{
              maxHeight: "120px",
              overflowY: "auto",
              padding: "8px",
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
            }}
          >
            {Object.entries(suggestion.allProbabilities)
              .sort(([, a], [, b]) => b - a)
              .map(([shape, prob]) => (
                <div
                  key={shape}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <span>
                    {getShapeIcon(shape)} {getShapeDisplayName(shape)}
                  </span>
                  <span style={{ fontWeight: "500" }}>
                    {Math.round(prob * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </details>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
