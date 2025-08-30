# Use Python 3.11 slim image for smaller size
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for PyTorch and ML libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Upgrade pip and install wheel for faster builds
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /app/models /app/logs

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose the port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5050/health || exit 1

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=5050

# Command to run the application
CMD ["python", "api/detection_service.py"]