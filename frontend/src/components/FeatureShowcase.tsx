import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;
  demo: string;
  benefits: string[];
  demoRoute?: string;
}

export const FeatureShowcase: React.FC = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);

  const features: Feature[] = [
    {
      id: "real-time",
      title: "Real-time Collaboration",
      description:
        "Draw together with multiple users simultaneously. See changes instantly as they happen.",
      icon: "🤝",
      demo: "/demos/real-time-demo.gif",
      benefits: [
        "Instant synchronization",
        "Multiple concurrent users",
        "Conflict-free drawing",
        "Live cursors",
      ],
    },
    {
      id: "ai-shapes",
      title: "AI Shape Detection",
      description:
        "Our smart AI recognizes your sketches and offers to convert them into perfect shapes.",
      icon: "🤖",
      demo: "/demos/ai-shapes-demo.gif",
      demoRoute: "/shape-detection",
      benefits: [
        "90%+ accuracy rate",
        "Supports 7 common shapes",
        "Real-time suggestions",
        "Optional refinement",
      ],
    },
    {
      id: "tools",
      title: "Advanced Drawing Tools",
      description:
        "Professional-grade drawing tools with pressure sensitivity and customizable brushes.",
      icon: "🎨",
      demo: "/demos/drawing-tools-demo.gif",
      demoRoute: "/demo",
      benefits: [
        "7 professional tools",
        "Color customization",
        "Stroke width control",
        "Undo/redo support",
      ],
    },
    {
      id: "export",
      title: "Export & Share",
      description:
        "Export your creations in multiple formats and share them easily with others.",
      icon: "📤",
      demo: "/demos/export-demo.gif",
      benefits: [
        "PNG, SVG formats",
        "High-resolution output",
        "Share via links",
        "Room invitations",
      ],
    },
  ];

  const handleTryFeature = () => {
    const feature = features[activeFeature];
    if (feature.demoRoute) {
      navigate(feature.demoRoute);
    } else {
      // For features without demo routes, scroll to getting started
      document.getElementById("getting-started")?.scrollIntoView({
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="feature-showcase" id="features">
      <div className="container">
        <div className="section-header">
          <h2>✨ Powerful Features</h2>
          <p>Everything you need for collaborative whiteboarding</p>
        </div>

        <div className="features-container">
          {/* Feature Navigation */}
          <div className="feature-nav">
            {features.map((feature, index) => (
              <button
                key={feature.id}
                className={`feature-tab ${index === activeFeature ? "active" : ""}`}
                onClick={() => setActiveFeature(index)}
                type="button"
              >
                <span className="feature-icon">{feature.icon}</span>
                <span className="feature-title">{feature.title}</span>
              </button>
            ))}
          </div>

          {/* Feature Content */}
          <div className="feature-content">
            <div className="feature-demo">
              <div className="demo-placeholder">
                <div className="demo-icon">{features[activeFeature].icon}</div>
                <p>Interactive Demo</p>
                <p className="demo-subtitle">{features[activeFeature].title}</p>
              </div>
              <div className="demo-overlay">
                <button
                  className="play-btn"
                  onClick={handleTryFeature}
                  type="button"
                >
                  {features[activeFeature].demoRoute
                    ? "🎮 Try Demo"
                    : "▶️ Learn More"}
                </button>
              </div>
            </div>

            <div className="feature-details">
              <h3>
                {features[activeFeature].icon} {features[activeFeature].title}
              </h3>
              <p className="feature-description">
                {features[activeFeature].description}
              </p>

              <ul className="feature-benefits">
                {features[activeFeature].benefits.map((benefit, index) => (
                  <li key={index}>✅ {benefit}</li>
                ))}
              </ul>

              <button
                className="try-feature-btn"
                onClick={handleTryFeature}
                type="button"
              >
                {features[activeFeature].demoRoute
                  ? "🎮 Try This Feature"
                  : "🚀 Get Started"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
