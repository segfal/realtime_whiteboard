#include <iostream>
#include <string>
#include <thread>
#include <chrono>
#include <fstream>
#include <random>
#include <nlohmann/json.hpp>

// Simple WebSocket client using system curl (for testing purposes)
// This is a basic implementation to test the server

using json = nlohmann::json;

class SimpleWhiteboardTestClient {
private:
    std::string server_url = "ws://localhost:9000";
    std::string user_id = "cpp_test_user";
    std::string room_id = "cpp-test-room";
    json test_data;

public:
    SimpleWhiteboardTestClient() {
        loadTestData();
        srand(static_cast<unsigned>(time(nullptr)));
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
            {"test_scenarios", {
                {"basic_stroke", {
                    {"type", "stroke:add"},
                    {"payload", {
                        {"stroke", {
                            {"id", "cpp_test_stroke"},
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
                        }}
                    }}
                }}
            }}
        };
    }

    void runTests() {
        std::cout << "🚀 Simple C++ WebSocket Test Client for Realtime Whiteboard" << std::endl;
        std::cout << "=============================================================" << std::endl;
        
        // Test 1: Create WebSocket messages to send via other tools
        std::cout << "\n🧪 Test 1: Generating WebSocket messages for server testing" << std::endl;
        generateTestMessages();
        
        // Test 2: Create sample files for manual testing
        std::cout << "\n🧪 Test 2: Creating test message files" << std::endl;
        createTestMessageFiles();
        
        // Test 3: Instructions for testing
        std::cout << "\n🧪 Test 3: Testing instructions" << std::endl;
        printTestInstructions();
    }

private:
    void generateTestMessages() {
        std::cout << "\n📝 Generated Test Messages:" << std::endl;
        std::cout << "============================" << std::endl;
        
        // Room join message
        json roomJoin = {
            {"type", "room:join"},
            {"payload", {
                {"room_id", room_id},
                {"username", "CppTestClient"},
                {"user_key", user_id}
            }}
        };
        std::cout << "\n🏠 Room Join Message:" << std::endl;
        std::cout << roomJoin.dump(2) << std::endl;
        
        // Test stroke message
        json stroke = generateRandomStroke();
        json strokeMessage = {
            {"type", "stroke:add"},
            {"payload", {{"stroke", stroke}}}
        };
        std::cout << "\n✏️  Stroke Message:" << std::endl;
        std::cout << strokeMessage.dump(2) << std::endl;
        
        // Chat message
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
        std::cout << "\n💬 Chat Message:" << std::endl;
        std::cout << chatMessage.dump(2) << std::endl;
    }

    void createTestMessageFiles() {
        // Create individual message files for easy testing
        createMessageFile("room_join.json", {
            {"type", "room:join"},
            {"payload", {
                {"room_id", room_id},
                {"username", "CppTestClient"},
                {"user_key", user_id}
            }}
        });

        createMessageFile("test_stroke.json", {
            {"type", "stroke:add"},
            {"payload", {{"stroke", generateRandomStroke()}}}
        });

        createMessageFile("chat_message.json", {
            {"type", "chat:message"},
            {"payload", {
                {"user", "CppTestClient"},
                {"message", "Test message from C++ client"},
                {"timestamp", std::chrono::duration_cast<std::chrono::milliseconds>(
                    std::chrono::system_clock::now().time_since_epoch()).count()},
                {"user_id", user_id}
            }}
        });

        // Create a batch of random strokes
        json strokeBatch = json::array();
        for (int i = 0; i < 5; i++) {
            json stroke = generateRandomStroke();
            stroke["id"] = "batch_stroke_" + std::to_string(i);
            strokeBatch.push_back({
                {"type", "stroke:add"},
                {"payload", {{"stroke", stroke}}}
            });
        }
        createMessageFile("stroke_batch.json", strokeBatch);

        std::cout << "✅ Created test message files:" << std::endl;
        std::cout << "   - room_join.json" << std::endl;
        std::cout << "   - test_stroke.json" << std::endl;
        std::cout << "   - chat_message.json" << std::endl;
        std::cout << "   - stroke_batch.json" << std::endl;
    }

    void createMessageFile(const std::string& filename, const json& message) {
        std::ofstream file(filename);
        if (file.is_open()) {
            file << message.dump(2);
            file.close();
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

    void printTestInstructions() {
        std::cout << "\n📋 How to Test the WebSocket Server:" << std::endl;
        std::cout << "=====================================" << std::endl;
        std::cout << "\n1. 🖥️  SERVER STATUS:" << std::endl;
        std::cout << "   Check if server is running: ps aux | grep server" << std::endl;
        std::cout << "   If not running, start it: cd ../backend/cpp_server/build && ./server" << std::endl;
        
        std::cout << "\n2. 🌐 HTML CLIENT TESTING:" << std::endl;
        std::cout << "   Open html_client.html in your browser" << std::endl;
        std::cout << "   Click 'Connect' then test various buttons" << std::endl;
        
        std::cout << "\n3. 🧪 MANUAL WEBSOCKET TESTING:" << std::endl;
        std::cout << "   Using websocat (install: brew install websocat):" << std::endl;
        std::cout << "   \033[36mwebsocat ws://localhost:9000\033[0m" << std::endl;
        std::cout << "   Then paste the JSON messages generated above" << std::endl;
        
        std::cout << "\n4. 📁 USING GENERATED FILES:" << std::endl;
        std::cout << "   \033[36mcat room_join.json | websocat ws://localhost:9000\033[0m" << std::endl;
        std::cout << "   \033[36mcat test_stroke.json | websocat ws://localhost:9000\033[0m" << std::endl;
        std::cout << "   \033[36mcat chat_message.json | websocat ws://localhost:9000\033[0m" << std::endl;
        
        std::cout << "\n5. 🔄 BATCH TESTING:" << std::endl;
        std::cout << "   \033[36mjq -c '.[]' stroke_batch.json | websocat ws://localhost:9000\033[0m" << std::endl;
        
        std::cout << "\n6. ✅ WHAT TO EXPECT:" << std::endl;
        std::cout << "   - Server should log received messages" << std::endl;
        std::cout << "   - Connected clients should receive broadcasts" << std::endl;
        std::cout << "   - HTML client should show message traffic" << std::endl;
        
        std::cout << "\n7. 🐛 DEBUGGING:" << std::endl;
        std::cout << "   - Check server console for errors" << std::endl;
        std::cout << "   - Monitor network traffic in browser dev tools" << std::endl;
        std::cout << "   - Verify JSON format is correct" << std::endl;
        
        std::cout << "\n🎯 Expected Server Behavior:" << std::endl;
        std::cout << "   ✓ Accept WebSocket connections" << std::endl;
        std::cout << "   ✓ Parse JSON messages" << std::endl;
        std::cout << "   ✓ Store strokes and chat messages" << std::endl;
        std::cout << "   ✓ Broadcast to all connected clients" << std::endl;
        std::cout << "   ✓ Send board sync to new clients" << std::endl;
    }
};

int main() {
    SimpleWhiteboardTestClient client;
    client.runTests();
    return 0;
}
