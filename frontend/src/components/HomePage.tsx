import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

interface Room {
  room_id: string;
  admin_user_id: string;
  created_at: string;
  max_users: number;
  is_active: boolean;
}

export const HomePage: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [maxUsers, setMaxUsers] = useState(10);
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsCreating(true);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          max_users: maxUsers,
          room_settings: {
            allow_shape_detection: true,
            auto_save: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();

      // Navigate to whiteboard with room data
      navigate(`/room/${data.room.room_id}`, {
        state: {
          room: data.room,
          inviteUrl: data.invite_url,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error("Error creating room:", error);
      alert("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim() || !displayName.trim()) {
      alert("Please enter both room code and display name");
      return;
    }

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room_id: joinCode.startsWith("room_") ? joinCode : undefined,
          invite_code: !joinCode.startsWith("room_") ? joinCode : undefined,
          display_name: displayName,
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
        },
      });
    } catch (error) {
      console.error("Error joining room:", error);
      alert(`Failed to join room: ${(error as Error).message}`);
    }
  };

  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>🎨 Collaborative Whiteboard</h1>
        <p>Create, draw, and collaborate in real-time</p>
      </div>

      <div className="actions-grid">
        <div className="action-card">
          <h2>Create New Room</h2>
          <div className="form-group">
            <label>Max Users:</label>
            <input
              type="number"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value) || 10)}
              min="2"
              max="50"
            />
          </div>

          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="primary-button"
          >
            {isCreating ? "Creating..." : "🚀 Create Room"}
          </button>
        </div>

        <div className="action-card">
          <h2>Join Room</h2>

          <div className="form-group">
            <label>Room Code or Invite Link:</label>
            <input
              type="text"
              placeholder="room_abc123 or invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Your Name:</label>
            <input
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <button onClick={handleJoinRoom} className="secondary-button">
            🎯 Join Room
          </button>
        </div>
      </div>

      <div className="features-section">
        <h3>✨ Features</h3>
        <ul>
          <li>🎨 Real-time collaborative drawing</li>
          <li>🤖 AI-powered shape detection</li>
          <li>💬 Built-in chat</li>
          <li>📤 Export your creations</li>
          <li>🔗 Easy sharing with invite links</li>
        </ul>
      </div>
    </div>
  );
};
