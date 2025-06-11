#include "WebSocketClient.h"
#include <uWS/uWS.h>
#include <nlohmann/json.hpp>
#include <iostream>

namespace whiteboard {

struct WebSocketClient::Impl {
    uWS::Hub hub;
    uWS::WebSocket<uWS::CLIENT>* connection = nullptr;
};

WebSocketClient::WebSocketClient()
    : impl_(std::make_unique<Impl>())
    , running_(false)
{
    impl_->hub.onConnection([](uWS::WebSocket<uWS::CLIENT>* ws, uWS::HttpRequest req) {
        std::cout << "Connected to server" << std::endl;
    });

    impl_->hub.onDisconnection([](uWS::WebSocket<uWS::CLIENT>* ws, int code, char* message, size_t length) {
        std::cout << "Disconnected from server" << std::endl;
    });

    impl_->hub.onMessage([this](uWS::WebSocket<uWS::CLIENT>* ws, char* message, size_t length, uWS::OpCode opCode) {
        std::string msg(message, length);
        std::lock_guard<std::mutex> lock(messageMutex_);
        messageQueue_.push(msg);
    });
}

WebSocketClient::~WebSocketClient() {
    disconnect();
}

bool WebSocketClient::connect(const std::string& url) {
    if (isConnected()) {
        return true;
    }

    running_ = true;
    messageThread_ = std::thread(&WebSocketClient::messageLoop, this);

    impl_->hub.connect(url, nullptr, {}, 5000);
    return true;
}

void WebSocketClient::disconnect() {
    if (!isConnected()) {
        return;
    }

    running_ = false;
    if (messageThread_.joinable()) {
        messageThread_.join();
    }

    if (impl_->connection) {
        impl_->connection->close();
        impl_->connection = nullptr;
    }
}

bool WebSocketClient::isConnected() const {
    return impl_->connection != nullptr;
}

void WebSocketClient::sendMessage(const std::string& message) {
    if (!isConnected()) {
        return;
    }

    nlohmann::json msg = {
        {"type", "message"},
        {"room", currentRoom_},
        {"content", message}
    };

    impl_->connection->send(msg.dump(), uWS::OpCode::TEXT);
}

void WebSocketClient::setMessageCallback(std::function<void(const std::string&)> callback) {
    messageCallback_ = std::move(callback);
}

void WebSocketClient::joinRoom(const std::string& roomId) {
    if (!isConnected()) {
        return;
    }

    currentRoom_ = roomId;
    nlohmann::json msg = {
        {"type", "join"},
        {"room", roomId}
    };

    impl_->connection->send(msg.dump(), uWS::OpCode::TEXT);
}

void WebSocketClient::leaveRoom() {
    if (!isConnected() || currentRoom_.empty()) {
        return;
    }

    nlohmann::json msg = {
        {"type", "leave"},
        {"room", currentRoom_}
    };

    impl_->connection->send(msg.dump(), uWS::OpCode::TEXT);
    currentRoom_.clear();
}

std::string WebSocketClient::getCurrentRoom() const {
    return currentRoom_;
}

void WebSocketClient::messageLoop() {
    while (running_) {
        std::string message;
        {
            std::lock_guard<std::mutex> lock(messageMutex_);
            if (!messageQueue_.empty()) {
                message = messageQueue_.front();
                messageQueue_.pop();
            }
        }

        if (!message.empty()) {
            processMessage(message);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
}

void WebSocketClient::processMessage(const std::string& message) {
    try {
        auto json = nlohmann::json::parse(message);
        std::string type = json["type"];

        if (type == "message" && messageCallback_) {
            messageCallback_(json["content"]);
        }
    } catch (const std::exception& e) {
        std::cerr << "Error processing message: " << e.what() << std::endl;
    }
}

} // namespace whiteboard
