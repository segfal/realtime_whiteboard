# Multi-stage build for C++ WebSocket server
FROM gcc:latest AS builder

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code
COPY . .

# Clone dependencies if not present
RUN if [ ! -d "vendor/uWebSockets" ]; then \
        mkdir -p vendor && \
        git clone --recursive https://github.com/uNetworking/uWebSockets.git vendor/uWebSockets; \
    fi

RUN if [ ! -d "vendor/json" ]; then \
        git clone https://github.com/nlohmann/json.git vendor/json; \
    fi

# Build the server
RUN mkdir -p build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Runtime stage
FROM ubuntu:22.04 AS runtime

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Set working directory
WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/build/server .

# Change ownership
RUN chown appuser:appuser /app/server

# Switch to non-root user
USER appuser

# Expose WebSocket port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD echo "Health check not implemented yet" || exit 1

# Run the server
CMD ["./server"]
