#include "App.h"
#include <nlohmann/json.hpp>
#include <iostream>
#include <vector>
#include <string>

using json = nlohmann::json;

// Global storage for whiteboard data
std::vector<json> strokes;
std::vector<json> chat_messages;

// Track connected clients for broadcasting
struct UserData {
    std::string user_id;
    // Add more user data as needed
};

int main() {
    std::cout << "Starting Realtime Whiteboard Server..." << std::endl;
    
    /* Keep in mind that uWS::SSLApp({options}) is the same as uWS::App() when compiled without SSL support.
     * We use uWS::App() since we don't need SSL for local development */
    uWS::App().ws<UserData>("/*", {
        /* Settings */
        .compression = uWS::CompressOptions(uWS::SHARED_COMPRESSOR),
        .maxPayloadLength = 16 * 1024 * 1024,
        .idleTimeout = 16,
        .maxBackpressure = 16 * 1024 * 1024,
        .closeOnBackpressureLimit = false,
        .resetIdleTimeoutOnSend = false,
        .sendPingsAutomatically = true,
        
        /* Handlers */
        .upgrade = nullptr,
        
        .open = [](auto *ws) {
            std::cout << "WebSocket connection opened" << std::endl;
            
            // Subscribe to the whiteboard topic for broadcasting
            ws->subscribe("whiteboard");
            
            // Send board sync message to new client
            json board_sync = {
                {"type", "board:sync"},
                {"payload", {
                    {"strokes", strokes},
                    {"users", json::array()}  // TODO: implement user tracking
                }}
            };
            
            ws->send(board_sync.dump(), uWS::OpCode::TEXT);
            
            // Send chat sync message
            json chat_sync = {
                {"type", "chat:sync"},
                {"payload", {
                    {"chatHistory", chat_messages}
                }}
            };
            
            ws->send(chat_sync.dump(), uWS::OpCode::TEXT);
        },
        
        .message = [](auto *ws, std::string_view message, uWS::OpCode opCode) {
            std::cout << "Received message: " << message << std::endl;
            
            try {
                json msg = json::parse(message);
                
                if (msg["type"] == "stroke:add") {
                    // Store the stroke
                    strokes.push_back(msg["payload"]["stroke"]);
                    std::cout << "Total strokes: " << strokes.size() << std::endl;
                    
                    // Broadcast to all clients (including sender)
                    ws->publish("whiteboard", message, opCode);
                    
                } else if (msg["type"] == "chat:message") {
                    // Store the chat message
                    chat_messages.push_back(msg["payload"]);
                    std::cout << "Total chat messages: " << chat_messages.size() << std::endl;
                    
                    // Broadcast to all clients (including sender)
                    ws->publish("whiteboard", message, opCode);
                    
                } else {
                    std::cout << "Unknown message type: " << msg["type"] << std::endl;
                }
                
            } catch (const json::exception& e) {
                std::cerr << "JSON parse error: " << e.what() << std::endl;
            }
        },
        
        .dropped = [](auto */*ws*/, std::string_view /*message*/, uWS::OpCode /*opCode*/) {
            std::cout << "Message dropped due to backpressure" << std::endl;
        },
        
        .drain = [](auto *ws) {
            std::cout << "Buffered amount: " << ws->getBufferedAmount() << std::endl;
        },
        
        .ping = [](auto */*ws*/, std::string_view) {
            // Ping handler (not implemented yet)
        },
        
        .pong = [](auto */*ws*/, std::string_view) {
            // Pong handler (not implemented yet)
        },
        
        .close = [](auto */*ws*/, int code, std::string_view message) {
            std::cout << "WebSocket connection closed with code: " << code << std::endl;
        }
    }).listen(9000, [](auto *listen_socket) {
        if (listen_socket) {
            std::cout << "Realtime Whiteboard Server listening on ws://localhost:9000" << std::endl;
        } else {
            std::cout << "Failed to listen on port 9000" << std::endl;
        }
    }).run();
    
    return 0;
} 