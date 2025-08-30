import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureShowcase } from "../components/FeatureShowcase";
import { RecentRoomsList } from "../components/RecentRoomsList";
import { RoomCreationModal } from "../components/RoomCreationModal";
import { RoomJoinModal } from "../components/RoomJoinModal";
import { UserService } from "../services/UserService";
import "../styles/HomePage.css";

interface Room {
  room_id: string;
  admin_user_id: string;
  created_at: string;
  last_activity: string;
  user_count: number;
  max_users: number;
  is_active: boolean;
  thumbnail?: string;
  room_settings?: {
    name?: string;
    is_private?: boolean;
    allow_shape_detection?: boolean;
  };
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    activeRooms: 0,
    totalUsers: 0,
    strokesDrawn: 0,
  });

  useEffect(() => {
    loadRecentRooms();
    loadStats();
  }, []);

  const loadRecentRooms = async () => {
    try {
      const response = await fetch("/api/rooms/recent");
      if (response.ok) {
        const data = await response.json();
        setRecentRooms(data.rooms || []);
      }
    } catch (error) {
      console.error("Failed to load recent rooms:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats/global");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
      // Set some default demo stats
      setStats({
        activeRooms: Math.floor(Math.random() * 50) + 10,
        totalUsers: Math.floor(Math.random() * 500) + 100,
        strokesDrawn: Math.floor(Math.random() * 10000) + 5000,
      });
    }
  };

  const handleCreateRoom = async (roomConfig: {
    maxUsers: number;
    roomName?: string;
    isPrivate: boolean;
    allowShapeDetection: boolean;
  }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_users: roomConfig.maxUsers,
          room_settings: {
            name: roomConfig.roomName,
            is_private: roomConfig.isPrivate,
            allow_shape_detection: roomConfig.allowShapeDetection,
            auto_save: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();

      // Generate display name for the admin
      const userService = UserService.getInstance();
      const displayName = userService.generateDisplayName();

      // Navigate to whiteboard with room data
      navigate(`/room/${data.room.room_id}`, {
        state: {
          room: data.room,
          inviteUrl: data.invite_url,
          isAdmin: true,
          displayName: displayName,
          userId: data.room.admin_user_id,
        },
      });
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    } finally {
      setLoading(false);
      setShowCreateModal(false);
    }
  };

  const handleJoinRoom = async (joinData: {
    roomCode: string;
    displayName: string;
  }) => {
    setLoading(true);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: joinData.roomCode.startsWith("room_")
            ? joinData.roomCode
            : undefined,
          invite_code: !joinData.roomCode.startsWith("room_")
            ? joinData.roomCode
            : undefined,
          display_name: joinData.displayName,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();

      // Navigate to whiteboard
      navigate(`/room/${data.room_id}`, {
        state: {
          userId: data.user_id,
          displayName: data.display_name,
          websocketUrl: data.websocket_url,
          isAdmin: false,
        },
      });
    } catch (error) {
      console.error("Error joining room:", error);
      alert(`Failed to join room: ${(error as Error).message}`);
    } finally {
      setLoading(false);
      setShowJoinModal(false);
    }
  };

  const handleRoomSelect = (room: Room) => {
    // Pre-populate the join modal with the selected room
    setShowJoinModal(true);
    // You could pass the room ID to the modal component if needed
  };

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            🎨 <span className="gradient-text">Collaborative Whiteboard</span>
          </h1>
          <p className="hero-subtitle">
            Create, draw, and collaborate in real-time with AI-powered shape
            detection
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{stats.activeRooms}</span>
              <span className="stat-label">Active Rooms</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{stats.totalUsers}</span>
              <span className="stat-label">Users Online</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {(stats.strokesDrawn / 1000).toFixed(1)}K
              </span>
              <span className="stat-label">Strokes Drawn</span>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={loading}
            className="primary-action-btn"
          >
            {loading ? "⏳ Creating..." : "🚀 Create New Room"}
          </button>

          <button
            onClick={() => setShowJoinModal(true)}
            className="secondary-action-btn"
          >
            🎯 Join Existing Room
          </button>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions-section">
        <div className="container">
          <h2>🚀 Quick Start</h2>

          <div className="action-cards">
            <div className="action-card">
              <div className="card-icon">🎨</div>
              <h3>Create & Draw</h3>
              <p>Start a new collaborative whiteboard session instantly</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="card-action"
              >
                Create Room
              </button>
            </div>

            <div className="action-card">
              <div className="card-icon">🤝</div>
              <h3>Join & Collaborate</h3>
              <p>Enter a room code or use an invite link to join others</p>
              <button
                onClick={() => setShowJoinModal(true)}
                className="card-action"
              >
                Join Room
              </button>
            </div>

            <div className="action-card">
              <div className="card-icon">📱</div>
              <h3>Share & Export</h3>
              <p>Easily share your creations and export in multiple formats</p>
              <button
                className="card-action"
                onClick={() => {
                  // Scroll to features section
                  document.getElementById("features")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                Learn More
              </button>
            </div>

            <div className="action-card">
              <div className="card-icon">🧪</div>
              <h3>Try Enhanced Demo</h3>
              <p>Experience all features including AI shape detection</p>
              <div
                style={{ display: "flex", gap: "8px", flexDirection: "column" }}
              >
                <a
                  href="/demo"
                  className="card-action"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  Basic Demo
                </a>
                <a
                  href="/whiteboard"
                  className="card-action enhanced"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  🤖 Enhanced Demo
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Rooms */}
      {recentRooms.length > 0 && (
        <section className="recent-rooms-section">
          <div className="container">
            <h2>📚 Recent Rooms</h2>
            <RecentRoomsList
              rooms={recentRooms}
              onRoomSelect={handleRoomSelect}
              onRefresh={loadRecentRooms}
            />
          </div>
        </section>
      )}

      {/* Features Showcase */}
      <FeatureShowcase />

      {/* Getting Started Guide */}
      <section className="getting-started-section" id="getting-started">
        <div className="container">
          <h2>🎯 How It Works</h2>

          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h3>Create or Join</h3>
              <p>Start a new room or join an existing one with a room code</p>
            </div>

            <div className="step-item">
              <div className="step-number">2</div>
              <h3>Draw Together</h3>
              <p>Use our powerful drawing tools to create and collaborate</p>
            </div>

            <div className="step-item">
              <div className="step-number">3</div>
              <h3>AI Enhancement</h3>
              <p>Let our AI detect and refine your shapes automatically</p>
            </div>

            <div className="step-item">
              <div className="step-number">4</div>
              <h3>Share Results</h3>
              <p>Export your work or share invite links with others</p>
            </div>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showCreateModal && (
        <RoomCreationModal
          onClose={() => setShowCreateModal(false)}
          onCreateRoom={handleCreateRoom}
          loading={loading}
        />
      )}

      {showJoinModal && (
        <RoomJoinModal
          onClose={() => setShowJoinModal(false)}
          onJoinRoom={handleJoinRoom}
          loading={loading}
        />
      )}
    </div>
  );
};
