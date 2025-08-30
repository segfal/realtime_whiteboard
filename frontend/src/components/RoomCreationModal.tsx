import React, { useState } from "react";

interface RoomCreationModalProps {
  onClose: () => void;
  onCreateRoom: (config: {
    maxUsers: number;
    roomName?: string;
    isPrivate: boolean;
    allowShapeDetection: boolean;
  }) => void;
  loading: boolean;
}

export const RoomCreationModal: React.FC<RoomCreationModalProps> = ({
  onClose,
  onCreateRoom,
  loading,
}) => {
  const [maxUsers, setMaxUsers] = useState(10);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowShapeDetection, setAllowShapeDetection] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      maxUsers,
      roomName: roomName.trim() || undefined,
      isPrivate,
      allowShapeDetection,
    });
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
          <h2>🚀 Create New Room</h2>
          <button onClick={onClose} className="modal-close" type="button">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="room-creation-form">
          <div className="form-group">
            <label htmlFor="roomName">📝 Room Name (Optional)</label>
            <input
              id="roomName"
              type="text"
              placeholder="My Awesome Whiteboard"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
            />
            <small>Leave empty for auto-generated name</small>
          </div>

          <div className="form-group">
            <label htmlFor="maxUsers">👥 Maximum Users: {maxUsers}</label>
            <input
              id="maxUsers"
              type="range"
              min="2"
              max="50"
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value))}
              className="range-slider"
            />
            <div className="range-labels">
              <span>2</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                <span className="checkmark"></span>
                🔒 Private Room
                <small>Only people with invite links can join</small>
              </label>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={allowShapeDetection}
                  onChange={(e) => setAllowShapeDetection(e.target.checked)}
                />
                <span className="checkmark"></span>
                🤖 Enable AI Shape Detection
                <small>Automatically detect and refine drawn shapes</small>
              </label>
            </div>
          </div>

          <div className="room-preview">
            <h4>🎯 Room Preview</h4>
            <div className="preview-card">
              <div className="preview-header">
                <span className="room-name">
                  {roomName.trim() || "Untitled Room"}
                </span>
                {isPrivate && <span className="private-badge">🔒 Private</span>}
              </div>
              <div className="preview-details">
                <span>👥 Up to {maxUsers} users</span>
                <span>
                  🤖 AI: {allowShapeDetection ? "Enabled" : "Disabled"}
                </span>
                <span>💾 Auto-save: Enabled</span>
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
            <button type="submit" className="create-btn" disabled={loading}>
              {loading ? "⏳ Creating..." : "🚀 Create Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
