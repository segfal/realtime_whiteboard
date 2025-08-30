# Docker Development Environment

This directory contains Docker configurations for running the ML Shape Detection service and other components in containers.

## 🐳 Quick Start

### Start ML Service Only

```bash
# Using the management script (recommended)
./scripts/docker-dev.sh ml start

# Or using docker-compose directly
docker-compose -f docker-compose.dev.yml up ml-service -d
```

### Start All Services

```bash
./scripts/docker-dev.sh start
```

### Check Service Status

```bash
./scripts/docker-dev.sh status
```

### Test ML Service

```bash
./scripts/docker-dev.sh ml test
```

## 📁 File Structure

```
docker/
├── README.md                 # This file
├── docker-compose.yml        # Production configuration
├── docker-compose.dev.yml    # Development configuration
└── websocket-server/         # Go backend Docker config

ml_shapes/
├── Dockerfile               # ML service container definition
├── requirements.txt         # Python dependencies (simple pip)
├── .dockerignore           # Docker build exclusions
└── api/                    # FastAPI application
```

## 🔧 ML Service Configuration

### Dockerfile Features

- **Base Image**: `python:3.11-slim` for optimal size
- **Dependencies**: Using `pip` with `requirements.txt` (no Poetry)
- **Security**: Non-root user (`app`)
- **Health Checks**: Built-in endpoint monitoring
- **Optimizations**: Multi-stage build with layer caching

### Key Benefits

- ✅ **No Python Environment Issues**: Isolated container environment
- ✅ **Consistent Deployment**: Same environment everywhere
- ✅ **Easy Scaling**: Can run multiple instances
- ✅ **Simple Dependencies**: Standard pip instead of Poetry
- ✅ **Health Monitoring**: Automatic health checks
- ✅ **Security**: Non-root execution

## 🛠 Management Commands

The `./scripts/docker-dev.sh` script provides easy management:

### General Commands

```bash
./scripts/docker-dev.sh start      # Start all services
./scripts/docker-dev.sh stop       # Stop all services
./scripts/docker-dev.sh restart    # Restart all services
./scripts/docker-dev.sh build      # Build all services
./scripts/docker-dev.sh status     # Check service health
./scripts/docker-dev.sh clean      # Clean up resources
```

### ML Service Specific

```bash
./scripts/docker-dev.sh ml start    # Start ML service
./scripts/docker-dev.sh ml stop     # Stop ML service
./scripts/docker-dev.sh ml restart  # Restart ML service
./scripts/docker-dev.sh ml build    # Build ML service
./scripts/docker-dev.sh ml logs     # View ML service logs
./scripts/docker-dev.sh ml test     # Test ML endpoints
```

### Log Management

```bash
./scripts/docker-dev.sh logs                # All service logs
./scripts/docker-dev.sh logs ml-service     # ML service logs only
```

## 🌐 Service Endpoints

When running in Docker:

| Service        | Port | Endpoint                | Health Check |
| -------------- | ---- | ----------------------- | ------------ |
| **ML API**     | 5050 | `http://localhost:5050` | `/health`    |
| **Go Backend** | 8080 | `http://localhost:8080` | External     |
| **Frontend**   | 5173 | `http://localhost:5173` | External     |
| **PostgreSQL** | 5432 | `localhost:5432`        | N/A          |
| **Redis**      | 6379 | `localhost:6379`        | N/A          |

## 🧪 Testing ML Service

### Health Check

```bash
curl http://localhost:5050/health
```

### Shape Detection

```bash
curl -X POST http://localhost:5050/detect \
  -H "Content-Type: application/json" \
  -d '{
    "points": [[10,10],[90,10],[90,90],[10,90],[10,10]],
    "room_id": "test",
    "stroke_id": "rectangle_test"
  }'
```

### API Documentation

Visit: `http://localhost:5050/docs` (FastAPI auto-generated docs)

## 🔧 Development Workflow

### 1. Start ML Service

```bash
./scripts/docker-dev.sh ml start
```

### 2. Start Go Backend (External)

```bash
cd go-server && go run main.go
```

### 3. Start Frontend (External)

```bash
cd frontend && npm run dev
```

### 4. Test Integration

```bash
./scripts/docker-dev.sh status
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
./scripts/docker-dev.sh logs ml-service

# Rebuild container
./scripts/docker-dev.sh ml build
./scripts/docker-dev.sh ml start
```

### Port Conflicts

```bash
# Clean up all ports
./scripts/kill-all-ports.sh

# Or check what's using port 5050
lsof -ti:5050
```

### Volume Issues

```bash
# Clean up Docker volumes
./scripts/docker-dev.sh clean
```

### Health Check Failures

```bash
# Check container status
docker ps

# Check container logs
docker logs realtime_whiteboard-ml-service-1

# Test endpoints manually
curl http://localhost:5050/health
```

## 🚀 Production Deployment

For production, use the main `docker-compose.yml`:

```bash
docker-compose up -d
```

This includes:

- All services (Go backend, ML service, PostgreSQL, Redis)
- Production-optimized configurations
- Proper networking and security
- Health checks and restart policies

## 📊 Resource Usage

The ML service container typically uses:

- **CPU**: 0.5-2.0 cores (depending on inference load)
- **Memory**: 1-2 GB (PyTorch model + dependencies)
- **Disk**: ~500MB (container image)
- **Network**: Minimal (HTTP API only)

## 🔒 Security Notes

- Container runs as non-root user (`app`)
- No unnecessary packages installed
- Health checks prevent unhealthy containers
- Network isolation via Docker networks
- No sensitive data in container images
