export interface GoWebSocketMessage {
  type: "join" | "joined" | "stroke" | "operation" | "clear" | "chat:message";
  room?: string;
  username?: string;
  data?: any;
}

export interface GoStroke {
  id?: string;
  points: [number, number][];
  color: string;
  thickness: number;
  isEraser: boolean;
}

export class GoWebSocketService {
  private ws: WebSocket | null = null;
  private room: string = "";
  private username: string | null = null;
  private onMessage: ((message: GoWebSocketMessage) => void) | null = null;
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  constructor(private serverUrl: string = "ws://localhost:8080") {}

  connect(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Store the room ID
      this.room = roomId;

      // Connect to the room-specific WebSocket endpoint
      const wsUrl = `${this.serverUrl}/ws/room/${roomId}`;
      console.log("Connecting to WebSocket URL:", wsUrl);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connection established for room:", roomId);
          this.onConnect?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: GoWebSocketMessage = JSON.parse(event.data);
            console.log("Received WebSocket message:", message);

            if (message.type === "joined") {
              this.username = message.username || null;
              console.log("Set username to:", this.username);
            }

            this.onMessage?.(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket connection closed");
          this.onDisconnect?.();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        reject(error);
      }
    });
  }

  joinRoom(roomId: string): void {
    console.log("Joining room:", roomId);
    this.room = roomId;
    const message: GoWebSocketMessage = {
      type: "join",
      room: roomId,
    };
    this.send(message);
  }

  sendStroke(stroke: GoStroke): void {
    console.log("Sending stroke:", stroke);
    const message: GoWebSocketMessage = {
      type: "stroke",
      room: this.room,
      username: this.username || "unknown",
      data: stroke,
    };
    this.send(message);
  }

  clearCanvas(): void {
    console.log("Sending clear canvas command");
    const message: GoWebSocketMessage = {
      type: "clear",
      room: this.room,
      username: this.username || "unknown",
    };
    this.send(message);
  }

  sendChat(messageText: string): void {
    console.log("Sending chat message:", messageText);
    const message: GoWebSocketMessage = {
      type: "chat:message",
      room: this.room,
      username: this.username || "unknown",
      data: { content: messageText, timestamp: new Date().toISOString() },
    };
    this.send(message);
  }

  private send(message: GoWebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      console.log("Sending WebSocket message:", messageString);
      this.ws.send(messageString);
    } else {
      console.warn("WebSocket not connected, cannot send message. State:", {
        ws: !!this.ws,
        readyState: this.ws?.readyState,
        room: this.room,
        username: this.username,
      });
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  setMessageHandler(handler: (message: GoWebSocketMessage) => void): void {
    this.onMessage = handler;
  }

  setConnectHandler(handler: () => void): void {
    this.onConnect = handler;
  }

  setDisconnectHandler(handler: () => void): void {
    this.onDisconnect = handler;
  }

  getUsername(): string | null {
    return this.username;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
