FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy poetry files
COPY pyproject.toml poetry.lock ./

# Install Python dependencies
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --only main

# Copy application code
COPY . .

# Create API service if it doesn't exist
RUN if [ ! -f "api/main.py" ]; then \
        mkdir -p api && \
        echo 'from fastapi import FastAPI\n\
from fastapi.middleware.cors import CORSMiddleware\n\
import uvicorn\n\
\n\
app = FastAPI(title="Whiteboard ML API")\n\
\n\
app.add_middleware(\n\
    CORSMiddleware,\n\
    allow_origins=["*"],\n\
    allow_credentials=True,\n\
    allow_methods=["*"],\n\
    allow_headers=["*"],\n\
)\n\
\n\
@app.get("/health")\n\
async def health_check():\n\
    return {"status": "healthy", "service": "ml-service"}\n\
\n\
@app.post("/detect-shapes")\n\
async def detect_shapes(request: dict):\n\
    # Placeholder for shape detection\n\
    return {"shapes": [], "confidence": 0.95}\n\
\n\
if __name__ == "__main__":\n\
    uvicorn.run(app, host="0.0.0.0", port=8000)' > api/main.py; \
    fi

# Install FastAPI and uvicorn if not in dependencies
RUN pip install fastapi uvicorn

# Verify Python version
RUN python --version && \
    echo "Python version check passed"

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "api/main.py"]
