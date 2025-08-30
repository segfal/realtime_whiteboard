import React, { useCallback, useReducer, type ReactNode } from "react";
import { useWASM } from "../hooks/useWasm";
import type { Point, Stroke } from "../interfaces/canvas";
import {
  GoWebSocketService,
  type GoStroke,
  type GoWebSocketMessage,
} from "../services/goWebSocketService";
import { ToolManager } from "../tools/ToolManager";
import type { ChatMessage, WASMStroke, WebSocketMessage } from "../types";
import type { DrawingTool, ToolSettings, ToolType } from "../types/tool";
import { logger, PerformanceTracker, ToolDebugger } from "../utils/debug";
import { WhiteboardContext } from "./ctx";
import type { WhiteboardContextType, WhiteboardState } from "./types";

// Action types for the reducer
type WhiteboardAction =
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "SET_CHAT_MESSAGES"; payload: ChatMessage[] }
  | {
      type: "SET_TYPING_STATUS";
      payload: { userId: string; isTyping: boolean };
    }
  | { type: "CLEAR_CHAT" }
  | { type: "SET_UNREAD_COUNT"; payload: number }
  | { type: "SET_ACTIVE_TOOL"; payload: ToolType }
  | { type: "UPDATE_SETTINGS"; payload: Partial<ToolSettings> }
  | { type: "SET_CURRENT_STROKE"; payload: Stroke | null }
  | { type: "SET_STROKES"; payload: Stroke[] }
  | { type: "SET_SELECTED_STROKES"; payload: Set<number> }
  | { type: "SET_PREVIEW_SHAPE"; payload: Stroke | null }
  | {
      type: "SET_SPLINE_PREVIEW";
      payload: {
        controlPoints: Point[];
        splinePoints: Point[];
        color: string;
        thickness: number;
      } | null;
    }
  | {
      type: "SET_DRAGGING";
      payload: { isDragging: boolean; dragStart?: Point | null };
    }
  | { type: "SET_EXPORT_FORMAT"; payload: "png" | "svg" }
  | { type: "SET_WASM_LOADED"; payload: boolean }
  | { type: "SET_WASM_ERROR"; payload: string | null }
  | { type: "TRIGGER_STROKE_UPDATE" }
  | { type: "CLEAR_CANVAS" }
  | { type: "SET_ALL_TOOLS"; payload: DrawingTool[] }
  | {
      type: "SET_WEBSOCKET_CONNECTED";
      payload: { websocket: WebSocket | null; isConnected: boolean };
    }
  | { type: "SET_GO_WEBSOCKET_SERVICE"; payload: GoWebSocketService | null }
  | { type: "SET_CURRENT_STROKE_ID"; payload: string | null }
  | { type: "MARK_CHAT_AS_READ" };

// Initial state
const initialState: WhiteboardState = {
  activeTool: {} as DrawingTool, // Will be set by ToolManager
  settings: {
    color: { r: 0, g: 0, b: 0, a: 1 },
    thickness: 2,
    eraserSize: 10,
  },
  allTools: [],
  currentStroke: null,
  strokes: [],
  selectedStrokes: new Set(),
  previewShape: null,
  splinePreview: null,
  isDragging: false,
  dragStart: null,
  exportFormat: "png",
  isWasmLoaded: false,
  wasmError: null,
  strokeUpdateTrigger: 0,
  websocket: null,
  isConnected: false,
  goWebSocketService: null as GoWebSocketService | null,
  userId: localStorage.getItem("userId") || crypto.randomUUID(), //TODO:
  currentStrokeId: null,
  chat: {
    messages: [],
    isTyping: false,
    typingUsers: new Set(),
    unreadCount: 0,
  },
};

localStorage.setItem("userId", initialState.userId);

// Reducer function for state management
function whiteboardReducer(
  state: WhiteboardState,
  action: WhiteboardAction
): WhiteboardState {
  switch (action.type) {
    case "SET_ACTIVE_TOOL": {
      console.log("SET_ACTIVE_TOOL reducer called with:", action.payload);
      console.log(
        "Current allTools:",
        state.allTools.map((t) => t.id)
      );
      const foundTool = state.allTools.find(
        (tool) => tool.id === action.payload
      );
      console.log("Found tool:", foundTool?.id || "NOT FOUND");

      // If tool not found, use the first available tool as fallback
      const toolToUse =
        foundTool ||
        (state.allTools.length > 0 ? state.allTools[0] : state.activeTool);
      console.log("Using tool:", toolToUse?.id || "NO TOOL AVAILABLE");

      return {
        ...state,
        activeTool: toolToUse,
      };
    }
    case "UPDATE_SETTINGS":
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    case "SET_CURRENT_STROKE":
      return {
        ...state,
        currentStroke: action.payload,
      };

    case "SET_STROKES":
      return {
        ...state,
        strokes: action.payload,
      };

    case "SET_SELECTED_STROKES":
      return {
        ...state,
        selectedStrokes: action.payload,
      };

    case "SET_PREVIEW_SHAPE":
      return {
        ...state,
        previewShape: action.payload,
      };

    case "SET_SPLINE_PREVIEW":
      return {
        ...state,
        splinePreview: action.payload,
      };

    case "SET_DRAGGING":
      return {
        ...state,
        isDragging: action.payload.isDragging,
        dragStart:
          action.payload.dragStart !== undefined
            ? action.payload.dragStart
            : state.dragStart,
      };

    case "SET_EXPORT_FORMAT":
      return {
        ...state,
        exportFormat: action.payload,
      };

    case "SET_WASM_LOADED":
      return {
        ...state,
        isWasmLoaded: action.payload,
      };

    case "SET_WASM_ERROR":
      return {
        ...state,
        wasmError: action.payload,
      };

    case "TRIGGER_STROKE_UPDATE":
      return {
        ...state,
        strokeUpdateTrigger: state.strokeUpdateTrigger + 1,
      };

    case "CLEAR_CANVAS":
      return {
        ...state,
        strokes: [],
        selectedStrokes: new Set(),
        currentStroke: null,
        previewShape: null,
      };

    case "SET_ALL_TOOLS":
      return {
        ...state,
        allTools: action.payload,
      };

    case "SET_WEBSOCKET_CONNECTED":
      return {
        ...state,
        websocket: action.payload.websocket,
        isConnected: action.payload.isConnected,
      };

    case "SET_GO_WEBSOCKET_SERVICE":
      return {
        ...state,
        goWebSocketService: action.payload,
      };

    case "SET_CURRENT_STROKE_ID":
      return {
        ...state,
        currentStrokeId: action.payload,
      };

    case "ADD_CHAT_MESSAGE":
      console.log("Adding chat message to state:", action.payload);
      console.log("Current chat messages count:", state.chat.messages.length);
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [...state.chat.messages, action.payload],
          unreadCount: state.chat.unreadCount + 1,
        },
      };
    case "SET_CHAT_MESSAGES":
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: action.payload,
        },
      };
    case "SET_TYPING_STATUS":
      return {
        ...state,
        chat: {
          ...state.chat,
          typingUsers: action.payload.isTyping
            ? new Set([...state.chat.typingUsers, action.payload.userId])
            : new Set(
                Array.from(state.chat.typingUsers).filter(
                  (userId: string) => userId !== action.payload.userId
                )
              ),
        },
      };
    case "CLEAR_CHAT":
      return {
        ...state,
        chat: {
          ...state.chat,
          messages: [],
          isTyping: false,
          typingUsers: new Set(),
        },
      };
    case "SET_UNREAD_COUNT":
      return {
        ...state,
        chat: {
          ...state.chat,
          unreadCount: action.payload,
        },
      };
    case "MARK_CHAT_AS_READ":
      return {
        ...state,
        chat: {
          ...state.chat,
          unreadCount: 0,
        },
      };

    default:
      return state;
  }
}

// Provider component
interface WhiteboardProviderProps {
  children: ReactNode;
}

export const WhiteboardProvider: React.FC<WhiteboardProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(whiteboardReducer, initialState);
  const { drawingEngine: wasmEngine, isLoaded, error } = useWASM();
  const [pendingStrokes, setPendingStrokes] = React.useState<
    GoWebSocketMessage[]
  >([]);

  // Initialize tool manager
  const [toolManager] = React.useState(() => new ToolManager());

  // Initialize tools on mount
  React.useEffect(() => {
    console.log("Initializing tools...");
    const allTools = toolManager.getAllTools();
    console.log(
      "Available tools:",
      allTools.map((t) => t.id)
    );

    // Set allTools first
    dispatch({ type: "SET_ALL_TOOLS", payload: allTools });

    // Update settings
    dispatch({ type: "UPDATE_SETTINGS", payload: toolManager.getSettings() });
  }, [toolManager]);

  // Set initial active tool after allTools is available
  React.useEffect(() => {
    if (state.allTools.length > 0) {
      const activeTool = toolManager.getActiveTool();
      console.log(
        "Setting initial active tool after allTools loaded:",
        activeTool.id
      );
      dispatch({ type: "SET_ACTIVE_TOOL", payload: activeTool.id as ToolType });
    }
  }, [state.allTools.length, toolManager]);

  // Process pending strokes when WASM becomes loaded
  React.useEffect(() => {
    if (isLoaded && wasmEngine && pendingStrokes.length > 0) {
      console.log(`Processing ${pendingStrokes.length} pending strokes...`);
      pendingStrokes.forEach((message) => {
        if (message.type === "stroke" && message.data) {
          const strokeData: GoStroke = message.data;
          const wasmStroke: WASMStroke = {
            points: (strokeData.points || []).map(([x, y]) => ({ x, y })),
            color: parseRgbString(strokeData.color),
            thickness: strokeData.thickness,
          };
          wasmEngine.addStroke(wasmStroke);
        }
      });
      setPendingStrokes([]);
      dispatch({ type: "TRIGGER_STROKE_UPDATE" });
    }
  }, [isLoaded, wasmEngine, pendingStrokes]);

  // Update WASM state
  React.useEffect(() => {
    dispatch({ type: "SET_WASM_LOADED", payload: isLoaded });
    if (error) {
      dispatch({ type: "SET_WASM_ERROR", payload: error });
    }
  }, [isLoaded, error]);

  // Helper function to convert WASM stroke to React stroke
  const wasmStrokeToReact = useCallback((wasmStroke: WASMStroke): Stroke => {
    if (!wasmStroke) {
      return { points: [], color: "rgb(0, 0, 0)", thickness: 1 };
    }

    if (!wasmStroke.color) {
      return {
        points: wasmStroke.points || [],
        color: "rgb(0, 0, 0)",
        thickness: wasmStroke.thickness || 1,
      };
    }

    return {
      points: wasmStroke.points || [],
      color: `rgb(${Math.round((wasmStroke.color.r || 0) * 255)}, ${Math.round((wasmStroke.color.g || 0) * 255)}, ${Math.round((wasmStroke.color.b || 0) * 255)})`,
      thickness: wasmStroke.thickness || 1,
    };
  }, []);

  // Utility function to convert RGB string to WASM color format
  const parseRgbString = (rgbString: string): WASMColor => {
    console.log("Parsing RGB string:", rgbString);
    // Handle different RGB formats: "rgb(255, 0, 0)", "rgba(255, 0, 0, 1)", etc.
    const match = rgbString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/
    );
    if (match) {
      const [, r, g, b, a = "1"] = match;
      const color = {
        r: parseInt(r) / 255,
        g: parseInt(g) / 255,
        b: parseInt(b) / 255,
        a: parseFloat(a),
      };
      console.log("Parsed color:", color);
      return color;
    }

    // Fallback to black if parsing fails
    console.warn(`Failed to parse color: ${rgbString}, using black`);
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  // WebSocket connection function
  const connectWebSocket = useCallback(async () => {
    try {
      const goWebSocketService = new GoWebSocketService();

      goWebSocketService.setConnectHandler(() => {
        console.log("Connected to Go WebSocket server");
        dispatch({
          type: "SET_WEBSOCKET_CONNECTED",
          payload: { websocket: null, isConnected: true },
        });
        dispatch({
          type: "SET_GO_WEBSOCKET_SERVICE",
          payload: goWebSocketService,
        });

        // Auto-join the hackathon room
        goWebSocketService.joinRoom("hackathon-room");
      });

      goWebSocketService.setDisconnectHandler(() => {
        console.log("Disconnected from Go WebSocket server");
        dispatch({
          type: "SET_WEBSOCKET_CONNECTED",
          payload: { websocket: null, isConnected: false },
        });
        dispatch({
          type: "SET_GO_WEBSOCKET_SERVICE",
          payload: null,
        });
      });

      goWebSocketService.setMessageHandler((message: GoWebSocketMessage) => {
        handleGoWebSocketMessage(message);
      });

      await goWebSocketService.connect();
    } catch (error) {
      console.error("Failed to connect to Go WebSocket server:", error);
    }
  }, []);

  const handleGoWebSocketMessage = useCallback(
    (message: GoWebSocketMessage) => {
      console.log("=== HANDLING GO WEBSOCKET MESSAGE ===");
      console.log("Message type:", message.type);
      console.log("Full message:", message);

      switch (message.type) {
        case "joined": {
          console.log(`Joined room as ${message.username}`);
          if (message.data && Array.isArray(message.data)) {
            // Load existing strokes from the server
            message.data.forEach((strokeData: GoStroke) => {
              if (isLoaded && wasmEngine) {
                const wasmStroke: WASMStroke = {
                  points: (strokeData.points || []).map(([x, y]) => ({ x, y })),
                  color: parseRgbString(strokeData.color),
                  thickness: strokeData.thickness,
                };
                wasmEngine.addStroke(wasmStroke);
              }
            });
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
          }
          break;
        }

        case "stroke": {
          console.log("Processing stroke message:", message);
          console.log("Stroke processing conditions:", {
            hasData: !!message.data,
            isLoaded,
            hasWasmEngine: !!wasmEngine,
            messageData: message.data,
          });

          if (message.data) {
            // Temporarily disable username check to debug
            // const currentUsername = state.goWebSocketService?.getUsername();
            // console.log("Username comparison:", {
            //   messageUsername: message.username,
            //   currentUsername: currentUsername,
            //   isSameUser: message.username === currentUsername
            // });
            // if (message.username === currentUsername) {
            //   console.log("Ignoring stroke from same user:", message.username);
            //   break;
            // }

            const strokeData: GoStroke = message.data;
            console.log("Received stroke from server:", strokeData);
            console.log("Stroke data type:", typeof strokeData);
            console.log("Stroke data keys:", Object.keys(strokeData));
            console.log("Stroke points:", strokeData.points);
            console.log("Stroke color:", strokeData.color);
            console.log("Stroke thickness:", strokeData.thickness);

            if (isLoaded && wasmEngine) {
              // Process stroke immediately if WASM is loaded
              const wasmStroke: WASMStroke = {
                points: (strokeData.points || []).map(([x, y]) => ({ x, y })),
                color: parseRgbString(strokeData.color),
                thickness: strokeData.thickness,
              };
              console.log("Converted to WASM stroke:", wasmStroke);
              console.log("Adding stroke to WASM engine...");
              wasmEngine.addStroke(wasmStroke);
              console.log("Stroke added to WASM, triggering update");
              dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            } else {
              // Queue stroke for later processing when WASM loads
              console.log(
                "WASM not loaded, queuing stroke for later processing"
              );
              setPendingStrokes((prev) => [...prev, message]);
            }
          } else {
            console.log("Cannot process stroke: no data");
          }
          break;
        }

        case "clear": {
          if (isLoaded && wasmEngine) {
            wasmEngine.clear();
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
          }
          break;
        }

        case "chat:message": {
          if (message.data) {
            console.log("Raw chat message data:", message.data);

            // Use a more stable ID to prevent duplicates
            const messageId = message.data.id || crypto.randomUUID();
            const existingMessage = state.chat.messages.find(
              (msg) =>
                msg.content ===
                  (message.data.content || message.data.message) &&
                msg.username === message.username &&
                Math.abs(
                  msg.timestamp - (message.data.timestamp || Date.now())
                ) < 1000 // Within 1 second
            );

            if (existingMessage) {
              console.log(
                "Duplicate chat message detected, skipping:",
                message.data
              );
              break;
            }

            const chatMessage: ChatMessage = {
              id: messageId,
              userId: message.username || "unknown",
              username: message.username || "unknown",
              content: message.data.content || message.data.message || "",
              timestamp: message.data.timestamp || Date.now(),
              type: "text", // Add the required type field
            };
            dispatch({ type: "ADD_CHAT_MESSAGE", payload: chatMessage });
            console.log("Processed chat message:", chatMessage);
          }
          break;
        }
      }
    },
    [isLoaded, wasmEngine]
  );

  // Connect WebSocket on mount
  React.useEffect(() => {
    console.log("Connecting to WebSocket...");
    connectWebSocket();
  }, [connectWebSocket]);

  // Sync strokes from WASM to React state
  const syncStrokesFromWasm = useCallback(() => {
    if (!isLoaded) {
      console.log("WASM not loaded, skipping stroke sync");
      return;
    }

    try {
      PerformanceTracker.start("syncStrokes");
      const wasmStrokes = wasmEngine.getStrokes();
      console.log("Syncing strokes from WASM:", wasmStrokes.length, "strokes");
      const reactStrokes = wasmStrokes.map(wasmStrokeToReact);
      logger.debug("Syncing strokes from WASM:", wasmStrokes.length, "strokes");
      dispatch({ type: "SET_STROKES", payload: reactStrokes });
      PerformanceTracker.end("syncStrokes");
    } catch (err) {
      console.error("Failed to get strokes from WASM:", err);
      logger.error("Failed to get strokes from WASM:", err);
    }
  }, [isLoaded, wasmEngine, wasmStrokeToReact]);

  const strokeToJSON = useCallback(
    (wasmStroke: WASMStroke) => {
      const strokeId = crypto.randomUUID();
      const timestamp = Date.now();

      return {
        type: "stroke:add",
        payload: {
          stroke: {
            id: strokeId,
            color: wasmStroke.color,
            thickness: wasmStroke.thickness,
            points: wasmStroke.points,
            timestamp: timestamp,
            userId: state.userId,
          },
        },
      };
    },
    [state.userId]
  );

  const sendStrokeViaWebSocket = useCallback(
    (strokeData: unknown) => {
      console.log("sendStrokeViaWebSocket called with:", strokeData);
      console.log("WebSocket state:", {
        hasService: !!state.goWebSocketService,
        isConnected: state.isConnected,
        serviceConnected: state.goWebSocketService?.isConnected(),
      });

      if (state.goWebSocketService && state.isConnected) {
        try {
          // Convert stroke data to Go format
          const stroke = strokeData as Stroke;
          const goStroke: GoStroke = {
            id: (stroke as any).id, // Include the stroke ID
            points: (stroke.points || []).map((p) => [p.x, p.y]),
            color: `rgb(${Math.round(state.settings.color.r * 255)}, ${Math.round(state.settings.color.g * 255)}, ${Math.round(state.settings.color.b * 255)})`,
            thickness: stroke.thickness,
            isEraser: (stroke as any).isEraser || false,
          };

          console.log("Sending stroke to server:", goStroke);
          state.goWebSocketService.sendStroke(goStroke);
          console.log("Sent stroke via Go WebSocket:", goStroke);
        } catch (error) {
          console.error("Failed to send stroke via Go WebSocket:", error);
        }
      } else {
        console.log("Go WebSocket not connected, cannot send stroke");
        console.log("Connection details:", {
          goWebSocketService: !!state.goWebSocketService,
          isConnected: state.isConnected,
          serviceConnected: state.goWebSocketService?.isConnected(),
        });
      }
    },
    [state.goWebSocketService, state.isConnected, state.settings.color]
  );

  // New message types for real-time drawing
  const sendStrokeStart = useCallback(
    (_point: Point) => {
      const message = {
        type: "stroke:start",
        payload: {
          strokeId: crypto.randomUUID(),
          color: state.settings.color,
          thickness: state.settings.thickness,
          userId: state.userId,
          timestamp: Date.now(),
        },
      };

      if (state.websocket && state.isConnected) {
        state.websocket.send(JSON.stringify(message));
        console.log("Sent stroke start:", message);
      }
    },
    [state.websocket, state.isConnected, state.settings, state.userId]
  );

  const sendStrokePoint = useCallback(
    (strokeId: string, point: Point) => {
      const message = {
        type: "stroke:point",
        payload: {
          strokeId: strokeId,
          point: point,
          userId: state.userId,
          timestamp: Date.now(),
        },
      };

      if (state.websocket && state.isConnected) {
        state.websocket.send(JSON.stringify(message));
        console.log("Sent stroke point:", message);
      }
    },
    [state.websocket, state.isConnected, state.userId]
  );

  const sendStrokeFinish = useCallback(
    (strokeId: string) => {
      const message = {
        type: "stroke:finish",
        payload: {
          strokeId: strokeId,
          userId: state.userId,
          timestamp: Date.now(),
        },
      };

      if (state.websocket && state.isConnected) {
        state.websocket.send(JSON.stringify(message));
        console.log("Sent stroke finish:", message);
      }
    },
    [state.websocket, state.isConnected, state.userId]
  );

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log("Received WebSocket message:", message);

        switch (message.type) {
          case "stroke:start": {
            if (!isLoaded || !wasmEngine) break;
            const strokeData = message.payload;
            console.log("Received stroke start:", strokeData);

            const wasmStroke: WASMStroke = {
              points: [],
              color: strokeData.color,
              thickness: strokeData.thickness,
            };

            wasmEngine.addStroke(wasmStroke);
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            break;
          }

          case "stroke:point": {
            if (!isLoaded || !wasmEngine) break;
            const { strokeId, point } = message.payload;
            console.log("Received stroke point:", { strokeId, point });

            const strokeIndex = wasmEngine.getStrokes().length - 1;
            if (strokeIndex >= 0) {
              wasmEngine.addPointToStroke(strokeIndex, point);
              dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            }
            break;
          }

          case "stroke:finish": {
            if (!isLoaded || !wasmEngine) break;
            const { strokeId } = message.payload;
            console.log("Received stroke finish:", strokeId);
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            break;
          }

          case "stroke:add": {
            if (!isLoaded || !wasmEngine) break;
            const strokeData = message.payload.stroke;
            const wasmStroke: WASMStroke = {
              points: strokeData.points,
              color: strokeData.color,
              thickness: strokeData.thickness,
            };

            wasmEngine.addStroke(wasmStroke);
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            break;
          }

          case "chat:sync": {
            const { chatHistory } = message.payload;
            console.log("Received chat sync:", chatHistory);
            dispatch({ type: "SET_CHAT_MESSAGES", payload: chatHistory });
            break;
          }

          case "chat:message": {
            console.log("Received chat message:", message.payload);
            const chatMessage: ChatMessage = {
              id: crypto.randomUUID(),
              userId: message.payload.userId,
              username: message.payload.username,
              content: message.payload.content,
              timestamp: message.payload.timestamp,
              type: "text",
            };
            console.log("Dispatching chat message:", chatMessage);
            dispatch({ type: "ADD_CHAT_MESSAGE", payload: chatMessage });
            break;
          }

          case "chat:typing": {
            dispatch({
              type: "SET_TYPING_STATUS",
              payload: {
                userId: message.payload.userId,
                isTyping: message.payload.isTyping,
              },
            });
            break;
          }

          case "user:join": {
            const systemMessage: ChatMessage = {
              id: crypto.randomUUID(),
              userId: "system",
              username: "System",
              content: `${message.payload.username} joined the session`,
              timestamp: message.payload.timestamp,
              type: "system",
            };
            dispatch({ type: "ADD_CHAT_MESSAGE", payload: systemMessage });
            break;
          }

          case "user:leave": {
            const systemMessage: ChatMessage = {
              id: crypto.randomUUID(),
              userId: "system",
              username: "System",
              content: `A user left the session`,
              timestamp: message.payload.timestamp,
              type: "system",
            };
            dispatch({ type: "ADD_CHAT_MESSAGE", payload: systemMessage });
            break;
          }

          case "board:sync": {
            if (!isLoaded || !wasmEngine) break;
            const { strokes } = message.payload;
            console.log("Received board sync:", strokes.length, "strokes");

            // Clear existing strokes and add synced strokes
            wasmEngine.clear();
            strokes.forEach((strokeData) => {
              const wasmStroke: WASMStroke = {
                points: strokeData.points,
                color: strokeData.color,
                thickness: strokeData.thickness,
              };
              wasmEngine.addStroke(wasmStroke);
            });

            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            break;
          }

          default: {
            // TypeScript will ensure we handle all cases
            const exhaustiveCheck: never = message;
            console.warn("Unhandled message type:", exhaustiveCheck);
          }
        }
      } catch (error) {
        console.error("Failed to handle WebSocket message:", error);
      }
    },
    [isLoaded, wasmEngine]
  );

  // Set WebSocket message handler when WebSocket is connected
  React.useEffect(() => {
    if (state.websocket && state.isConnected) {
      state.websocket.onmessage = handleWebSocketMessage;
      console.log("WebSocket message handler set");
    }
  }, [state.websocket, state.isConnected, handleWebSocketMessage]);

  // Tool management
  const setActiveTool = useCallback(
    (toolType: ToolType) => {
      console.log("setActiveTool called with:", toolType);
      console.log(
        "Current allTools:",
        state.allTools.map((t) => t.id)
      );

      // Safety check: ensure allTools is available
      if (state.allTools.length === 0) {
        console.log("allTools not available yet, skipping tool change");
        return;
      }

      logger.info("Setting active tool to:", toolType);
      toolManager.setActiveTool(toolType);
      const activeTool = toolManager.getActiveTool();
      console.log("ToolManager active tool:", activeTool.id);

      dispatch({ type: "SET_ACTIVE_TOOL", payload: toolType });
      ToolDebugger.logToolChange(state.activeTool.id, toolType);
    },
    [toolManager, state.activeTool.id, state.allTools]
  );

  const updateSettings = useCallback(
    (settings: Partial<ToolSettings>) => {
      toolManager.updateSettings(settings);
      dispatch({ type: "UPDATE_SETTINGS", payload: settings });
    },
    [toolManager]
  );

  // Drawing operations
  const startDrawing = useCallback(
    async (point: Point) => {
      console.log(
        "startDrawing called with point:",
        point,
        "WASM loaded:",
        isLoaded
      );
      if (!isLoaded) {
        console.log("WASM not loaded, cannot start drawing");
        return;
      }

      try {
        PerformanceTracker.start("strokeCreation");
        const wasmStrokes = wasmEngine.getStrokes();
        console.log("Current WASM strokes before adding:", wasmStrokes.length);

        // Start new stroke in WASM
        const wasmStroke: WASMStroke = {
          points: [point],
          color: state.settings.color,
          thickness: state.settings.thickness,
        };

        console.log("Adding stroke to WASM:", wasmStroke);

        // Log drawing operation
        await logger.logDrawing("stroke", {
          mouse: point,
          color: state.settings.color,
          thickness: state.settings.thickness,
          operation: "start",
        });
        wasmEngine.addStroke(wasmStroke);
        console.log("Stroke added to WASM, triggering update");
        dispatch({ type: "TRIGGER_STROKE_UPDATE" });
        PerformanceTracker.end("strokeCreation");
      } catch (err) {
        console.error("WASM stroke error:", err);
        logger.error("WASM stroke error:", err);
        return;
      }

      // Set current stroke in React state for immediate UI feedback
      dispatch({
        type: "SET_CURRENT_STROKE",
        payload: {
          points: [point],
          color: `rgb(${Math.round(state.settings.color.r * 255)}, ${Math.round(state.settings.color.g * 255)}, ${Math.round(state.settings.color.b * 255)})`,
          thickness: state.settings.thickness,
        },
      });

      // Send stroke start via WebSocket
      const strokeId = crypto.randomUUID();
      dispatch({ type: "SET_CURRENT_STROKE_ID", payload: strokeId });
      sendStrokeStart(point);
    },
    [isLoaded, wasmEngine, state.settings, sendStrokeStart]
  );

  const continueDrawing = useCallback(
    async (point: Point) => {
      console.log(
        "continueDrawing called with point:",
        point,
        "current stroke points:",
        state.currentStroke?.points.length || 0
      );
      if (!isLoaded || !state.currentStroke) {
        console.log("Cannot continue drawing:", {
          isLoaded,
          hasCurrentStroke: !!state.currentStroke,
        });
        return;
      }

      try {
        // Add point to current stroke in WASM
        const strokeIndex = wasmEngine.getStrokes().length - 1;
        console.log("Adding point to WASM stroke index:", strokeIndex);
        wasmEngine.addPointToStroke(strokeIndex, point);
        dispatch({ type: "TRIGGER_STROKE_UPDATE" });

        // Only log every 10th point to reduce overhead
        if (state.currentStroke.points.length % 10 === 0) {
          PerformanceTracker.start("strokePointAddition");

          await logger.logDrawing("stroke", {
            mouse: point,
            strokeIndex,
            operation: "addPoint",
            totalPoints: state.currentStroke.points.length + 1,
          });

          PerformanceTracker.end("strokePointAddition");
        }
      } catch (err) {
        console.error("WASM not ready yet:", err);
        logger.error("WASM not ready yet:", err);
        return;
      }

      // Update React state for immediate feedback
      const updatedStroke = {
        points: [...state.currentStroke.points, point],
        color: state.currentStroke.color,
        thickness: state.currentStroke.thickness,
      };

      dispatch({
        type: "SET_CURRENT_STROKE",
        payload: updatedStroke,
      });

      // Send real-time stroke update via WebSocket (every few points to avoid spam)
      if (updatedStroke.points.length % 3 === 0) {
        // Send every 3rd point for smoother real-time
        const strokeWithId = {
          ...updatedStroke,
          id: state.currentStrokeId || crypto.randomUUID(),
        };
        console.log("Sending real-time stroke update:", strokeWithId);
        sendStrokeViaWebSocket(strokeWithId);
      }

      // Send point update via WebSocket (legacy)
      if (state.currentStrokeId) {
        sendStrokePoint(state.currentStrokeId, point);
      }
    },
    [
      isLoaded,
      wasmEngine,
      state.currentStroke,
      state.currentStrokeId,
      sendStrokePoint,
      sendStrokeViaWebSocket,
    ]
  );

  const finishDrawing = useCallback(() => {
    console.log(
      "finishDrawing called, current stroke points:",
      state.currentStroke?.points.length || 0
    );
    console.log("Current stroke data:", state.currentStroke);

    // Get the latest stroke from WASM as fallback
    const wasmStrokes = wasmEngine.getStrokes();
    const latestWasmStroke = wasmStrokes[wasmStrokes.length - 1];
    console.log("Latest WASM stroke:", latestWasmStroke);

    // Use React state stroke if available, otherwise use WASM stroke
    let strokeToSend = state.currentStroke;
    if (!strokeToSend || strokeToSend.points.length === 0) {
      if (latestWasmStroke) {
        strokeToSend = wasmStrokeToReact(latestWasmStroke);
        console.log("Using WASM stroke as fallback:", strokeToSend);
      }
    }

    if (strokeToSend && strokeToSend.points.length > 0) {
      try {
        // Add stroke ID for tracking
        const strokeWithId = {
          ...strokeToSend,
          id: state.currentStrokeId || crypto.randomUUID(),
        };

        // Send stroke to other users via WebSocket
        console.log(
          "Sending stroke to server for real-time sync:",
          strokeWithId
        );
        sendStrokeViaWebSocket(strokeWithId);

        dispatch({ type: "TRIGGER_STROKE_UPDATE" });
      } catch (err) {
        console.error("Failed to send stroke via WebSocket:", err);
        logger.error("Failed to send stroke via WebSocket:", err);
      }
    } else {
      console.warn("No valid stroke to send");
    }

    // Send stroke finish via WebSocket
    if (state.currentStrokeId) {
      sendStrokeFinish(state.currentStrokeId);
      dispatch({ type: "SET_CURRENT_STROKE_ID", payload: null });
    }

    // Clear current stroke
    console.log("Clearing current stroke");
    dispatch({ type: "SET_CURRENT_STROKE", payload: null });
  }, [
    state.currentStroke,
    wasmEngine,
    state.currentStrokeId,
    sendStrokeFinish,
    sendStrokeViaWebSocket,
    wasmStrokeToReact,
  ]);

  // Eraser operations
  const eraseAtPoint = useCallback(
    async (point: Point) => {
      if (!isLoaded) return;

      try {
        PerformanceTracker.start("eraserOperation");
        const wasmStrokes = wasmEngine.getStrokes();
        const eraserSize = state.settings.eraserSize || 10;

        for (let i = wasmStrokes.length - 1; i >= 0; i--) {
          const stroke = wasmStrokes[i];
          const reactStroke = wasmStrokeToReact(stroke);

          // Check if point is near stroke (simplified collision detection)
          const isNear = reactStroke.points.some((strokePoint) => {
            const distance = Math.hypot(
              point.x - strokePoint.x,
              point.y - strokePoint.y
            );
            return distance <= eraserSize;
          });

          if (isNear) {
            // Log erasing operation
            await logger.logErasing("eraser", {
              mouse: point,
              eraserSize,
              strokeIndex: i,
              strokeData: reactStroke,
            });
            console.log("Removing stroke:", i);
            wasmEngine.removeStroke(i);
            dispatch({ type: "TRIGGER_STROKE_UPDATE" });
            break;
          }
        }

        PerformanceTracker.end("eraserOperation");
      } catch (err) {
        logger.error("WASM not ready yet:", err);
      }
    },
    [isLoaded, wasmEngine, state.settings.eraserSize, wasmStrokeToReact]
  );

  // Selection operations
  const selectStrokes = useCallback((indices: Set<number>) => {
    dispatch({ type: "SET_SELECTED_STROKES", payload: indices });
  }, []);

  const moveSelectedStrokes = useCallback(
    (dx: number, dy: number) => {
      if (!isLoaded) return;

      try {
        state.selectedStrokes.forEach((index) => {
          wasmEngine.moveStroke(index, dx, dy);
        });
        dispatch({ type: "TRIGGER_STROKE_UPDATE" });
      } catch (err) {
        logger.error("WASM not ready yet:", err);
      }
    },
    [isLoaded, wasmEngine, state.selectedStrokes]
  );

  const deleteSelectedStrokes = useCallback(() => {
    if (!isLoaded) return;

    const indicesToRemove = Array.from(state.selectedStrokes).sort(
      (a, b) => b - a
    );
    indicesToRemove.forEach((index) => {
      wasmEngine.removeStroke(index);
    });
    dispatch({ type: "SET_SELECTED_STROKES", payload: new Set() });
    dispatch({ type: "TRIGGER_STROKE_UPDATE" });
  }, [isLoaded, wasmEngine, state.selectedStrokes]);

  // Canvas operations
  const clearCanvas = useCallback(() => {
    if (wasmEngine) {
      wasmEngine.clear();
      dispatch({ type: "CLEAR_CANVAS" });

      // Send clear message via Go WebSocket
      if (state.goWebSocketService && state.isConnected) {
        state.goWebSocketService.clearCanvas();
      }
    }
  }, [wasmEngine, state.goWebSocketService, state.isConnected]);

  const exportCanvas = useCallback((format: "png" | "svg") => {
    dispatch({ type: "SET_EXPORT_FORMAT", payload: format });
    // Export logic would be implemented in the Canvas component
  }, []);

  const triggerStrokeUpdate = useCallback(() => {
    dispatch({ type: "TRIGGER_STROKE_UPDATE" });
  }, []);

  const setSplinePreview = useCallback(
    (
      preview: {
        controlPoints: Point[];
        splinePoints: Point[];
        color: string;
        thickness: number;
      } | null
    ) => {
      dispatch({ type: "SET_SPLINE_PREVIEW", payload: preview });
    },
    []
  );

  // RDP Stroke Simplification
  const simplifyStroke = useCallback(
    (strokeIndex: number, epsilon: number = 1.0) => {
      if (!isLoaded || !wasmEngine) {
        console.log("WASM not loaded, cannot simplify stroke");
        return;
      }

      try {
        console.log(
          `Simplify requested for stroke ${strokeIndex} with epsilon ${epsilon} (not supported)`
        );
        dispatch({ type: "TRIGGER_STROKE_UPDATE" });
        console.log(`Simplify fallback completed`);
      } catch (err) {
        console.error("Failed to simplify stroke:", err);
        logger.error("Failed to simplify stroke:", err);
      }
    },
    [isLoaded, wasmEngine]
  );

  // Simplify all strokes
  const simplifyAllStrokes = useCallback(
    (epsilon: number = 1.0) => {
      if (!isLoaded || !wasmEngine) {
        console.log("WASM not loaded, cannot simplify strokes");
        return;
      }

      try {
        const strokeCount = wasmEngine.getStrokes().length;
        console.log(
          `Simplify all requested for ${strokeCount} strokes with epsilon ${epsilon} (not supported)`
        );
        dispatch({ type: "TRIGGER_STROKE_UPDATE" });
        console.log(`Simplify all fallback completed`);
      } catch (err) {
        console.error("Failed to simplify strokes:", err);
        logger.error("Failed to simplify strokes:", err);
      }
    },
    [isLoaded, wasmEngine]
  );

  // Chat operations
  const sendWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      if (!state.websocket || !state.isConnected) {
        console.warn("WebSocket not connected, cannot send message");
        return;
      }

      try {
        const messageString = JSON.stringify(message);
        console.log("Sending WebSocket message:", messageString);
        state.websocket.send(messageString);
        console.log("WebSocket message sent successfully");
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
      }
    },
    [state.websocket, state.isConnected]
  );

  const sendChatMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      if (state.goWebSocketService && state.isConnected) {
        // Use the Go WebSocket service
        state.goWebSocketService.sendChat(content.trim());
        console.log("Sent chat message via Go WebSocket:", content.trim());
      } else {
        console.warn("Go WebSocket not connected, cannot send chat message");
      }
    },
    [state.goWebSocketService, state.isConnected]
  );

  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      const message: WebSocketMessage = {
        type: "chat:typing",
        userId: state.userId,
        timestamp: Date.now(),
        payload: {
          userId: state.userId,
          isTyping,
        },
      };

      sendWebSocketMessage(message);
    },
    [state.userId, sendWebSocketMessage]
  );

  const clearChat = useCallback(() => {
    dispatch({ type: "CLEAR_CHAT" });
  }, []);

  const markChatAsRead = useCallback(() => {
    dispatch({ type: "MARK_CHAT_AS_READ" });
  }, []);

  // Sync strokes when WASM updates
  React.useEffect(() => {
    console.log("Stroke update trigger changed:", state.strokeUpdateTrigger);
    if (state.strokeUpdateTrigger > 0) {
      console.log("Triggering stroke sync from WASM");
      syncStrokesFromWasm();
    }
  }, [state.strokeUpdateTrigger, syncStrokesFromWasm]);

  const contextValue: WhiteboardContextType = {
    state,
    setActiveTool,
    updateSettings,
    startDrawing,
    continueDrawing,
    finishDrawing,
    eraseAtPoint,
    selectStrokes,
    moveSelectedStrokes,
    deleteSelectedStrokes,
    clearCanvas,
    exportCanvas,
    simplifyStroke,
    simplifyAllStrokes,
    triggerStrokeUpdate,
    syncStrokesFromWasm,
    connectWebSocket,
    strokeToJSON,
    sendStrokeViaWebSocket,
    handleWebSocketMessage,
    sendStrokeStart,
    sendStrokePoint,
    sendStrokeFinish,
    sendChatMessage,
    sendTypingStatus,
    clearChat,
    markChatAsRead,
    sendWebSocketMessage,
    setSplinePreview,
  };

  return (
    <WhiteboardContext.Provider value={contextValue}>
      {children}
    </WhiteboardContext.Provider>
  );
};
