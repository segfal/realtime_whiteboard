export interface GoWebSocketMessage {
  type: "join" | "joined" | "stroke" | "operation" | "clear" | "chat:message";
  room?: string;
  username?: string;
  data?: any;
}
// TODO: Look for Socket issues
/**
 * Problem: 
 * Socket is not loading and not syncing
 * Find the issue
 */
export interface GoStroke {
  points: [number, number][];
  color: string;
  thickness: number;
  isEraser: boolean;
}

export class GoWebSocketService {
  private ws: WebSocket | null = null;
  private room: string = "hackathon-room";
  private username: string | null = null;
  private onMessage: ((message: GoWebSocketMessage) => void) | null = null;
  private onConnect: (() => void) | null = null;
  private onDisconnect: (() => void) | null = null;

  constructor(private serverUrl: string = "ws://localhost:8080/ws") {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {

        console.log("Connected to Go WebSocket server");
        this.onConnect?.();
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: GoWebSocketMessage = JSON.parse(event.data);
          console.log("Received Go WebSocket message:", message);

          if (message.type === "joined") {
            this.username = message.username || null;
          }
          // Forward 'operation' messages to onMessage for consumers to handle

          this.onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("Disconnected from Go WebSocket server");
        this.onDisconnect?.();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };
    });
  }

  joinRoom(room: string = "hackathon-room"): void {
    this.room = room;
    const message: GoWebSocketMessage = {
      type: "join",
      room: room,
    };
    this.send(message);
  }

  sendStroke(stroke: GoStroke): void {
    const message: GoWebSocketMessage = {
      type: "stroke",
      room: this.room,
      username: this.username || "unknown",
      data: stroke,
    };
    this.send(message);
  }

  clearCanvas(): void {
    const message: GoWebSocketMessage = {
      type: "clear",
      room: this.room,
      username: this.username || "unknown",
    };
    this.send(message);
  }

  sendChat(messageText: string): void {
    const message: GoWebSocketMessage = {
      type: "chat:message",
      room: this.room,
      username: this.username || "unknown",
      data: { message: messageText, timestamp: new Date().toISOString() },
    };
    this.send(message);
  }

  private send(message: GoWebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, cannot send message");
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
