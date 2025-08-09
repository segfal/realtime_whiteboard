# Makefile for C++ WebSocket Test Client
CXX = g++
CXXFLAGS = -std=c++20 -Wall -Wextra -O2
TARGET = cpp_client
SOURCE = cpp_client.cpp

# Include directories (adjust paths as needed)
INCLUDES = -I../backend/cpp_server/vendor/uWebSockets/src \
           -I../backend/cpp_server/vendor/json/include \
           -I../backend/cpp_server/vendor/uWebSockets/uSockets/src

# Library paths and libraries
LIBS = -pthread -lz

# uSockets static library path (assuming it's built in the server directory)
USOCKETS_LIB = ../backend/cpp_server/build/libuSockets.a

# Default target
all: $(TARGET)

# Build the client
$(TARGET): $(SOURCE)
	@echo "🔨 Building C++ WebSocket test client..."
	@if [ ! -f "$(USOCKETS_LIB)" ]; then \
		echo "❌ uSockets library not found at $(USOCKETS_LIB)"; \
		echo "   Please build the server first:"; \
		echo "   cd ../backend/cpp_server && make"; \
		exit 1; \
	fi
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(TARGET) $(SOURCE) $(USOCKETS_LIB) $(LIBS)
	@echo "✅ Build complete! Run with: ./$(TARGET)"

# Alternative build if uSockets is in different location
alt-build: $(SOURCE)
	@echo "🔨 Building with system libraries (if available)..."
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o $(TARGET) $(SOURCE) $(LIBS)

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -f $(TARGET)
	@echo "✅ Clean complete!"

# Build and run
run: $(TARGET)
	@echo "🚀 Running C++ test client..."
	./$(TARGET)

# Build and run in background (for testing)
run-bg: $(TARGET)
	@echo "🚀 Running C++ test client in background..."
	./$(TARGET) &

# Check dependencies
check-deps:
	@echo "🔍 Checking dependencies..."
	@echo "Checking for uWebSockets headers..."
	@if [ -d "../backend/cpp_server/vendor/uWebSockets" ]; then \
		echo "✅ uWebSockets found"; \
	else \
		echo "❌ uWebSockets not found"; \
	fi
	@echo "Checking for nlohmann/json headers..."
	@if [ -d "../backend/cpp_server/vendor/json" ]; then \
		echo "✅ nlohmann/json found"; \
	else \
		echo "❌ nlohmann/json not found"; \
	fi
	@echo "Checking for uSockets library..."
	@if [ -f "$(USOCKETS_LIB)" ]; then \
		echo "✅ uSockets library found"; \
	else \
		echo "❌ uSockets library not found at $(USOCKETS_LIB)"; \
		echo "   Build the server first: cd ../backend/cpp_server && make"; \
	fi

# Install dependencies (placeholder - adjust for your system)
install-deps:
	@echo "📦 Installing dependencies..."
	@echo "Note: This assumes you have the required libraries in the server vendor directory"
	@echo "If not, you may need to install uWebSockets and nlohmann/json manually"

# Help target
help:
	@echo "🛠️  Available targets:"
	@echo "  all        - Build the test client (default)"
	@echo "  run        - Build and run the test client"
	@echo "  run-bg     - Build and run in background"
	@echo "  clean      - Remove build artifacts"
	@echo "  check-deps - Check if dependencies are available"
	@echo "  help       - Show this help message"
	@echo ""
	@echo "📋 Usage:"
	@echo "  1. Make sure the C++ server is built: cd ../backend/cpp_server && make"
	@echo "  2. Build this client: make"
	@echo "  3. Start the server: cd ../backend/cpp_server && ./server"
	@echo "  4. Run this client: ./cpp_client"

# Debug build
debug: CXXFLAGS += -g -DDEBUG
debug: $(TARGET)

# Verbose build
verbose: CXXFLAGS += -v
verbose: $(TARGET)

.PHONY: all clean run run-bg check-deps install-deps help debug verbose alt-build
