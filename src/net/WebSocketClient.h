#pragma once

#include <string>
#include <functional>
#include <memory>
#include <thread>
#include <mutex>
#include <queue>
#include <atomic>

namespace whiteboard {

class WebSocketClient {
public:
    WebSocketClient();
    ~WebSocketClient();
    
    // Connection management
    bool connect(const std::string& url);
    void disconnect();
    bool isConnected() const;
    
    // Message handling
    void sendMessage(const std::string& message);
    void setMessageCallback(std::function<void(const std::string&)> callback);
    
    // Room management
    void joinRoom(const std::string& roomId);
    void leaveRoom();
    std::string getCurrentRoom() const;
    
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
    
    void messageLoop();
    void processMessage(const std::string& message);
    
    std::thread messageThread_;
    std::mutex messageMutex_;
    std::queue<std::string> messageQueue_;
    std::atomic<bool> running_;
    std::function<void(const std::string&)> messageCallback_;
    std::string currentRoom_;
};

} // namespace whiteboard
