#include <App.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <thread>
#include <mutex>
#include <functional>
#include <shared_mutex>

using json = nlohmann::json;

// Global storage for whiteboard data
std::vector<json> strokes;
std::vector<json> chat_messages;

// Track connected clients for broadcasting
struct UserData {
    std::string user_id;
    // Add more user data as needed
};


// create a websocket approach
struct AppState {
    std::vector<json> stroke;
    std::vector<json> chat_messages;
    mutable std::shared_mutex m;

    void add_stroke(const json &stroke) {
        std::unique_lock lock(m);
        chat_messages.push_back(stroke);
    }

    void add_chat(const json &chat) {
        std::unique_lock lock(m);
        chat_messages.push_back(chat);
    }

    std::pair<std::vector<json>, std::vector<json>> snapshot() const {
		std::shared_lock lock(m);
		return {strokes, chat_messages};
	}

    
};

using WS = uWS::WebSocket<false,true, UserData>;

// dispatch method to for optimal message grabbing
struct MessageDispatcher {
	using Handler = std::function<void(WS*, const json&, std::string_view, uWS::OpCode)>;
	std::unordered_map<std::string, Handler> handlers;

	void on(const std::string &type, Handler h) { handlers[type] = std::move(h); }

	void dispatch(WS *ws, const json &msg,
        std::string_view raw, 
        uWS::OpCode op) {
		const std::string type = msg.value("type", "");
		if (auto it = handlers.find(type); it != handlers.end()) it->second(ws, msg, raw, op);
		else std::cout << "Unknown message type: " << type << std::endl;
	}
};




int main() {
    std::cout << "Starting Realtime Whiteboard Server..." << std::endl;

    AppState state;
    MessageDispatcher dispatcher;

    // Register handlers
    dispatcher.on("stroke:start", [](WS *ws, const json&, std::string_view raw, uWS::OpCode op){
        ws->publish("whiteboard", raw, op);
    });
    dispatcher.on("stroke:point", [](WS *ws, const json&, std::string_view raw, uWS::OpCode op){
        ws->publish("whiteboard", raw, op);
    });
    dispatcher.on("stroke:finish", [](WS *ws, const json&, std::string_view raw, uWS::OpCode op){
        ws->publish("whiteboard", raw, op);
    });
    dispatcher.on("stroke:add", [&state](WS *ws, const json &msg, std::string_view raw, uWS::OpCode op){
        const auto &p = msg.value("payload", json::object());
        if (p.contains("stroke")) {
            state.add_stroke(p["stroke"]);
            ws->publish("whiteboard", raw, op);
        } else {
            std::cout << "Invalid payload for stroke:add" << std::endl;
        }
    });
    dispatcher.on("chat:message", [&state](WS *ws, const json &msg, std::string_view raw, uWS::OpCode op){
        state.add_chat(msg.value("payload", json::object()));
        ws->publish("whiteboard", raw, op);
    });

    uWS::App().ws<UserData>("/*", {
        .compression = uWS::CompressOptions(uWS::SHARED_COMPRESSOR),
        .maxPayloadLength = 16 * 1024 * 1024,
        .idleTimeout = 16,
        .maxBackpressure = 16 * 1024 * 1024,
        .closeOnBackpressureLimit = false,
        .resetIdleTimeoutOnSend = false,
        .sendPingsAutomatically = true,

        .upgrade = nullptr,

        .open = [&state](auto *ws) {
            std::cout << "WebSocket connection opened" << std::endl;
            ws->subscribe("whiteboard");

            auto [strokes, chats] = state.snapshot();

            json board_sync = {
                {"type", "board:sync"},
                {"payload", {
                    {"strokes", strokes},
                    {"users", json::array()}
                }}
            };
            ws->send(board_sync.dump(), uWS::OpCode::TEXT);

            json chat_sync = {
                {"type", "chat:sync"},
                {"payload", {{"chatHistory", chats}}}
            };
            ws->send(chat_sync.dump(), uWS::OpCode::TEXT);
        },

        .message = [&dispatcher](auto *ws, std::string_view message, uWS::OpCode opCode) {
            std::cout << "Received message: " << message << std::endl;
            try {
                json msg = json::parse(message);
                dispatcher.dispatch(static_cast<WS*>(ws), msg, message, opCode);
            } catch (const json::exception &e) {
                std::cerr << "JSON parse error: " << e.what() << std::endl;
            }
        },

        .dropped = [](auto */*ws*/, std::string_view /*message*/, uWS::OpCode /*opCode*/) {
            std::cout << "Message dropped due to backpressure" << std::endl;
        },

        .drain = [](auto *ws) {
            std::cout << "Buffered amount: " << ws->getBufferedAmount() << std::endl;
        },

        .ping = [](auto */*ws*/, std::string_view) {},
        .pong = [](auto */*ws*/, std::string_view) {},

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