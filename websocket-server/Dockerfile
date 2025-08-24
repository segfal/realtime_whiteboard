FROM gcc:12

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libssl-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source code
COPY . .

# Build the application
RUN mkdir -p build && cd build \
    && cmake .. \
    && make -j$(nproc)

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9000/health || exit 1

# Run the server
CMD ["./build/server"]
