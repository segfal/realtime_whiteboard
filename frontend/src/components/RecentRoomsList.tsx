import React, { useState } from "react";

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
  };
}

interface RecentRoomsListProps {
  rooms: Room[];
  onRoomSelect: (room: Room) => void;
  onRefresh: () => void;
}

export const RecentRoomsList: React.FC<RecentRoomsListProps> = ({
  rooms,
  onRoomSelect,
  onRefresh,
}) => {
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const generateThumbnail = (roomId: string) => {
    // Generate a simple geometric pattern based on room ID
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
    ];
    const shapes = ["circle", "square", "triangle"];

    const hash = roomId.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

    const colorIndex = Math.abs(hash) % colors.length;
    const shapeIndex = Math.abs(hash >> 3) % shapes.length;

    return {
      backgroundColor: colors[colorIndex],
      shape: shapes[shapeIndex],
    };
  };

  const copyRoomLink = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // You could show a toast notification here
        console.log("Room link copied to clipboard");
      })
      .catch(() => {
        console.warn("Failed to copy room link");
      });
  };

  if (rooms.length === 0) {
    return (
      <div className="recent-rooms-empty">
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No Recent Rooms</h3>
          <p>Your recently visited rooms will appear here</p>
          <button onClick={onRefresh} className="refresh-btn">
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-rooms-list">
      <div className="list-header">
        <span className="rooms-count">{rooms.length} recent rooms</span>
        <button onClick={onRefresh} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="rooms-grid">
        {rooms.map((room) => {
          const thumbnail = generateThumbnail(room.room_id);

          return (
            <div
              key={room.room_id}
              className={`room-card ${hoveredRoom === room.room_id ? "hovered" : ""}`}
              onClick={() => onRoomSelect(room)}
              onMouseEnter={() => setHoveredRoom(room.room_id)}
              onMouseLeave={() => setHoveredRoom(null)}
            >
              {/* Room Thumbnail */}
              <div
                className="room-thumbnail"
                style={{ backgroundColor: thumbnail.backgroundColor }}
              >
                {room.thumbnail ? (
                  <img src={room.thumbnail} alt="Room preview" />
                ) : (
                  <div className={`placeholder-shape ${thumbnail.shape}`}>
                    🎨
                  </div>
                )}

                {/* Status indicator */}
                <div
                  className={`status-indicator ${room.is_active ? "active" : "inactive"}`}
                >
                  {room.is_active ? "🟢" : "🔴"}
                </div>
              </div>

              {/* Room Info */}
              <div className="room-info">
                <div className="room-header">
                  <h4 className="room-name">
                    {room.room_settings?.name ||
                      `Room ${room.room_id.substring(5, 10)}`}
                  </h4>
                  {room.room_settings?.is_private && (
                    <span className="private-badge">🔒</span>
                  )}
                </div>

                <div className="room-meta">
                  <span className="room-id">ID: {room.room_id}</span>
                  <span className="last-activity">
                    {formatTime(room.last_activity)}
                  </span>
                </div>

                <div className="room-stats">
                  <div className="stat">
                    <span className="stat-icon">👥</span>
                    <span className="stat-value">
                      {room.user_count}/{room.max_users}
                    </span>
                  </div>

                  <div className="stat">
                    <span className="stat-icon">
                      {room.is_active ? "🟢" : "🔴"}
                    </span>
                    <span className="stat-value">
                      {room.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hover Actions */}
              {hoveredRoom === room.room_id && (
                <div className="room-actions">
                  <button className="join-btn">🎯 Join Room</button>

                  <button
                    className="copy-link-btn"
                    onClick={(e) => copyRoomLink(e, room.room_id)}
                    title="Copy room link"
                  >
                    🔗
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
