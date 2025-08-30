import React, { useEffect, useState } from "react";
import { UserService } from "../services/UserService";

interface RoomJoinModalProps {
  onClose: () => void;
  onJoinRoom: (data: { roomCode: string; displayName: string }) => void;
  loading: boolean;
  prefilledRoomCode?: string;
}

export const RoomJoinModal: React.FC<RoomJoinModalProps> = ({
  onClose,
  onJoinRoom,
  loading,
  prefilledRoomCode = "",
}) => {
  const [roomCode, setRoomCode] = useState(prefilledRoomCode);
  const [displayName, setDisplayName] = useState("");
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [loadingRoomInfo, setLoadingRoomInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate default display name or load from storage
    const userService = UserService.getInstance();
    const storedData = userService.getStoredUserData();
    setDisplayName(storedData.displayName || userService.generateDisplayName());
  }, []);

  useEffect(() => {
    // Auto-fetch room info when room code is entered
    if (roomCode.length > 5) {
      fetchRoomInfo();
    } else {
      setRoomInfo(null);
      setError(null);
    }
  }, [roomCode]);

  const fetchRoomInfo = async () => {
    setLoadingRoomInfo(true);
    setError(null);

    try {
      const endpoint = roomCode.startsWith("room_")
        ? `/api/rooms/${roomCode}`
        : `/api/invites/${roomCode}`;

      const response = await fetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        setRoomInfo(data);
      } else {
        setError("Room not found or invite expired");
        setRoomInfo(null);
      }
    } catch (err) {
      setError("Failed to fetch room information");
      setRoomInfo(null);
    } finally {
      setLoadingRoomInfo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomCode.trim() || !displayName.trim()) {
      setError("Please fill in all fields");
      return;
    }

    const userService = UserService.getInstance();
    if (!userService.validateDisplayName(displayName)) {
      setError("Please enter a valid display name (2-30 characters)");
      return;
    }

    // Store the display name for future use
    userService.storeUserData({ displayName: displayName.trim() });

    onJoinRoom({
      roomCode: roomCode.trim(),
      displayName: displayName.trim(),
    });
  };

  const generateNewName = () => {
    const userService = UserService.getInstance();
    setDisplayName(userService.generateDisplayName());
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Join Room</h2>
          <button onClick={onClose} className="modal-close" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="room-join-form">
          <div className="form-group">
            <label htmlFor="roomCode">🔗 Room Code or Invite Link</label>
            <input
              id="roomCode"
              type="text"
              placeholder="room_abc123 or invite code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              required
            />
            {loadingRoomInfo && (
              <div className="loading-indicator">🔍 Looking up room...</div>
            )}
          </div>

          {roomInfo && (
            <div className="room-info-card">
              <h4>📋 Room Information</h4>
              <div className="room-details">
                <div className="detail-item">
                  <span className="label">Name:</span>
                  <span className="value">
                    {roomInfo.room?.room_settings?.name || "Untitled Room"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Users:</span>
                  <span className="value">
                    {roomInfo.user_count || 0} /{" "}
                    {roomInfo.room?.max_users || "?"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span
                    className={`status ${roomInfo.room?.is_active ? "active" : "inactive"}`}
                  >
                    {roomInfo.room?.is_active ? "🟢 Active" : "🔴 Inactive"}
                  </span>
                </div>
                {roomInfo.room?.room_settings?.is_private && (
                  <div className="detail-item">
                    <span className="private-indicator">🔒 Private Room</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <div className="error-message">⚠️ {error}</div>}

          <div className="form-group">
            <label htmlFor="displayName">👤 Your Display Name</label>
            <div className="name-input-group">
              <input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={30}
                required
              />
              <button
                type="button"
                onClick={generateNewName}
                className="generate-name-btn"
                title="Generate random name"
              >
                🎲
              </button>
            </div>
            <small>{displayName.length}/30 characters</small>
          </div>

          <div className="join-preview">
            <h4>🎭 Preview</h4>
            <div className="preview-card">
              <div className="user-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{displayName || "Your Name"}</span>
                <span className="join-action">
                  Joining{" "}
                  {roomCode
                    ? `room ${roomCode.substring(0, 10)}${roomCode.length > 10 ? "..." : ""}`
                    : "room"}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="cancel-btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="join-btn"
              disabled={
                loading ||
                !roomCode.trim() ||
                !displayName.trim() ||
                (roomInfo && !roomInfo.room?.is_active)
              }
            >
              {loading ? "⏳ Joining..." : "🎯 Join Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
