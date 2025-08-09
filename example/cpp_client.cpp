#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <fstream>
#include <nlohmann/json.hpp>
#include <App.h>

using json = nlohmann::json;

class WhiteboardTestClient {
private:
    uWS::WebSocket<false, true, int>* ws = nullptr;
    bool connected = false;
    std::string room_id = "cpp-test-room";
    std::string user_id = "cpp_test_user";
    json test_data;

public:
    WhiteboardTestClient() {
        loadTestData();
    }

    void loadTestData() {
        try {
            std::ifstream file("test_data.json");
            if (file.is_open()) {
                file >> test_data;
                file.close();
                std::cout << "✅ Loaded test data from test_data.json" << std::endl;
            } else {
                std::cout << "⚠️  Could not load test_data.json, using hardcoded data" << std::endl;
                createFallbackTestData();
            }
        } catch (const std::exception& e) {
            std::cout << "❌ Error loading test data: " << e.what() << std::endl;
            createFallbackTestData();
        }
    }

    void createFallbackTestData() {
        test_data = {
            {"sample_strokes", json::array({
                {
                    {"id", "cpp_stroke_001"},
                    {"color", {{"r", 1.0}, {"g", 0.5}, {"b", 0.0}, {"a", 1.0}}},
                    {"thickness", 3.0},
                    {"points", json::array({
                        {{"x", 10}, {"y", 10}},
                        {{"x", 50}, {"y", 50}},
                        {{"x", 90}, {"y", 30}}
                    })},
                    {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                        std::chrono::system_clock::now().time_since_epoch()).count()},
                    {"user_id", user_id}
                }
            })}
        };
    }

    void connect() {
        std::cout << "🔌 Connecting to WebSocket server..." << std::endl;

        uWS::App().ws<int>("/*", {
            .open = [this](auto *websocket) {
                std::cout << "✅ Connected to server!" << std::endl;
                this->ws = websocket;
                this->connected = true;
                
                // Start automated testing
                this->startTests();
            },
            
            .message = [this](auto */*websocket*/, std::string_view message, uWS::OpCode /*opCode*/) {
                std::cout << "📥 Received: " << message << std::endl;
                
                try {
                    json msg = json::parse(message);
                    this->handleMessage(msg);
                } catch (const json::exception& e) {
                    std::cout << "❌ JSON parse error: " << e.what() << std::endl;
                }
            },
            
            .close = [this](auto */*websocket*/, int code, std::string_view /*message*/) {
                std::cout << "🔌 Connection closed (code: " << code << ")" << std::endl;
                this->connected = false;
                this->ws = nullptr;
            }
        }).get("/*", [](auto *res, auto */*req*/) {
            res->end("WebSocket client test");
        }).listen(9001, [this](auto *token) {
            if (token) {
                std::cout << "✅ Client listening on port 9001" << std::endl;
                // Connect to the actual server
                this->connectToServer();
            } else {
                std::cout << "❌ Failed to listen on port 9001" << std::endl;
            }
        }).run();
    }

    void handleMessage(const json& msg) {
        if (msg.contains("type")) {
            std::string type = msg["type"];
            
            if (type == "room:joined") {
                std::cout << "🏠 Successfully joined room!" << std::endl;
            } else if (type == "board:sync") {
                std::cout << "🔄 Received board sync with " << 
                    msg["payload"]["strokes"].size() << " strokes" << std::endl;
            } else if (type == "stroke:add") {
                std::cout << "✏️  Stroke added to board" << std::endl;
            } else if (type == "chat:message") {
                std::cout << "💬 Chat message received" << std::endl;
            }
        }
    }

    void startTests() {
        std::cout << "\n🧪 Starting automated tests..." << std::endl;
        
        // Test 1: Join room
        std::this_thread::sleep_for(std::chrono::milliseconds(500));
        testJoinRoom();
        
        // Test 2: Send strokes
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
        testSendStrokes();
        
        // Test 3: Send chat messages
        std::this_thread::sleep_for(std::chrono::milliseconds(1500));
        testSendChat();
        
        // Test 4: Stress test
        std::this_thread::sleep_for(std::chrono::milliseconds(2000));
        testStressStrokes();
        
        // Test 5: Keep connection alive for manual testing
        std::cout << "\n✨ Automated tests complete. Connection will stay open for manual testing." << std::endl;
        std::cout << "Press Ctrl+C to exit." << std::endl;
    }

    void testJoinRoom() {
        std::cout << "\n🧪 Test 1: Joining room '" << room_id << "'" << std::endl;
        
        json joinMessage = {
            {"type", "room:join"},
            {"payload", {
                {"room_id", room_id},
                {"username", "CppTestClient"},
                {"user_key", user_id}
            }}
        };
        
        sendMessage(joinMessage);
    }

    void testSendStrokes() {
        std::cout << "\n🧪 Test 2: Sending sample strokes" << std::endl;
        
        if (test_data.contains("sample_strokes")) {
            for (const auto& stroke : test_data["sample_strokes"]) {
                json strokeMessage = {
                    {"type", "stroke:add"},
                    {"payload", {
                        {"stroke", stroke}
                    }}
                };
                
                sendMessage(strokeMessage);
                std::this_thread::sleep_for(std::chrono::milliseconds(300));
            }
        }
        
        // Send a live-generated stroke
        json liveStroke = generateRandomStroke();
        json strokeMessage = {
            {"type", "stroke:add"},
            {"payload", {
                {"stroke", liveStroke}
            }}
        };
        sendMessage(strokeMessage);
    }

    void testSendChat() {
        std::cout << "\n🧪 Test 3: Sending chat messages" << std::endl;
        
        json chatMessage = {
            {"type", "chat:message"},
            {"payload", {
                {"user", "CppTestClient"},
                {"message", "Hello from C++ test client! 🤖"},
                {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count()},
                {"user_id", user_id}
            }}
        };
        
        sendMessage(chatMessage);
    }

    void testStressStrokes() {
        std::cout << "\n🧪 Test 4: Stress testing with multiple rapid strokes" << std::endl;
        
        for (int i = 0; i < 10; i++) {
            json stroke = generateRandomStroke();
            stroke["id"] = "stress_stroke_" + std::to_string(i);
            
            json strokeMessage = {
                {"type", "stroke:add"},
                {"payload", {
                    {"stroke", stroke}
                }}
            };
            
            sendMessage(strokeMessage);
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
    }

    json generateRandomStroke() {
        auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
        
        // Generate random color
        double r = static_cast<double>(rand()) / RAND_MAX;
        double g = static_cast<double>(rand()) / RAND_MAX;
        double b = static_cast<double>(rand()) / RAND_MAX;
        
        // Generate random points
        json points = json::array();
        int numPoints = 3 + (rand() % 8); // 3-10 points
        
        for (int i = 0; i < numPoints; i++) {
            double x = 50 + (rand() % 400); // x: 50-450
            double y = 50 + (rand() % 300); // y: 50-350
            points.push_back({{"x", x}, {"y", y}});
        }
        
        return {
            {"id", "cpp_random_" + std::to_string(now)},
            {"color", {{"r", r}, {"g", g}, {"b", b}, {"a", 1.0}}},
            {"thickness", 1.0 + static_cast<double>(rand()) / RAND_MAX * 4.0}, // 1-5
            {"points", points},
            {"timestamp", now},
            {"user_id", user_id}
        };
    }

    void sendMessage(const json& message) {
        if (connected && ws) {
            std::string messageStr = message.dump();
            ws->send(messageStr, uWS::OpCode::TEXT);
            std::cout << "📤 Sent: " << messageStr << std::endl;
        } else {
            std::cout << "❌ Cannot send message: not connected" << std::endl;
        }
    }

    void runInteractiveMode() {
        std::cout << "\n🎮 Interactive mode - available commands:" << std::endl;
        std::cout << "  's' - Send random stroke" << std::endl;
        std::cout << "  'c' - Send chat message" << std::endl;
        std::cout << "  'j' - Join room" << std::endl;
        std::cout << "  'q' - Quit" << std::endl;
        
        char command;
        while (std::cin >> command && command != 'q') {
            switch (command) {
                case 's':
                    {
                        json stroke = generateRandomStroke();
                        json message = {
                            {"type", "stroke:add"},
                            {"payload", {{"stroke", stroke}}}
                        };
                        sendMessage(message);
                    }
                    break;
                case 'c':
                    {
                        json message = {
                            {"type", "chat:message"},
                            {"payload", {
                                {"user", "CppTestClient"},
                                {"message", "Interactive message from C++ client"},
                                {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                                    std::chrono::system_clock::now().time_since_epoch()).count()},
                                {"user_id", user_id}
                            }}
                        };
                        sendMessage(message);
                    }
                    break;
                case 'j':
                    testJoinRoom();
                    break;
                default:
                    std::cout << "Unknown command. Use 's', 'c', 'j', or 'q'" << std::endl;
            }
        }
    }
};

int main() {
    std::cout << "🚀 C++ WebSocket Test Client for Realtime Whiteboard" << std::endl;
    std::cout << "======================================================" << std::endl;
    
    // Seed random number generator
    srand(static_cast<unsigned>(time(nullptr)));
    
    WhiteboardTestClient client;
    
    // Start connection in a separate thread
    std::thread connectionThread([&client]() {
        client.connect();
    });
    
    // Wait a bit for connection to establish
    std::this_thread::sleep_for(std::chrono::seconds(3));
    
    // Run interactive mode in main thread
    client.runInteractiveMode();
    
    std::cout << "👋 Shutting down..." << std::endl;
    
    // Wait for connection thread to finish
    if (connectionThread.joinable()) {
        connectionThread.join();
    }
    
    return 0;
}
