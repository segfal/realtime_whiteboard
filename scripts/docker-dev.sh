#!/bin/bash

# Docker Development Environment Management Script
# Manages all services for the realtime whiteboard application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to project root
cd "$(dirname "$0")/.."

# Command handling
case "${1:-help}" in
    "start"|"up")
        print_status "Starting all development services..."
        docker-compose -f docker-compose.dev.yml up -d
        print_success "All services started!"
        ;;
    
    "stop"|"down")
        print_status "Stopping all services..."
        docker-compose -f docker-compose.dev.yml down
        print_success "All services stopped!"
        ;;
    
    "restart")
        print_status "Restarting all services..."
        docker-compose -f docker-compose.dev.yml down
        docker-compose -f docker-compose.dev.yml up -d
        print_success "All services restarted!"
        ;;
    
    "build")
        print_status "Building all services..."
        docker-compose -f docker-compose.dev.yml build --no-cache
        print_success "All services built!"
        ;;
    
    "ml")
        case "${2:-help}" in
            "start")
                print_status "Starting ML service..."
                docker-compose -f docker-compose.dev.yml up ml-service -d
                ;;
            "stop")
                print_status "Stopping ML service..."
                docker-compose -f docker-compose.dev.yml stop ml-service
                ;;
            "restart")
                print_status "Restarting ML service..."
                docker-compose -f docker-compose.dev.yml restart ml-service
                ;;
            "build")
                print_status "Building ML service..."
                docker-compose -f docker-compose.dev.yml build ml-service --no-cache
                ;;
            "logs")
                docker-compose -f docker-compose.dev.yml logs -f ml-service
                ;;
            "test")
                print_status "Testing ML service..."
                echo "Health check:"
                curl -s http://localhost:5050/health | jq . || print_error "Health check failed"
                echo -e "\nShape detection test:"
                curl -X POST http://localhost:5050/detect \
                    -H "Content-Type: application/json" \
                    -d '{"points":[[10,10],[90,10],[90,90],[10,90],[10,10]],"room_id":"test","stroke_id":"rect"}' \
                    | jq . || print_error "Shape detection test failed"
                ;;
            *)
                echo "ML service commands:"
                echo "  $0 ml start   - Start ML service"
                echo "  $0 ml stop    - Stop ML service"
                echo "  $0 ml restart - Restart ML service"
                echo "  $0 ml build   - Build ML service"
                echo "  $0 ml logs    - Show ML service logs"
                echo "  $0 ml test    - Test ML service endpoints"
                ;;
        esac
        ;;
    
    "logs")
        service="${2:-}"
        if [ -n "$service" ]; then
            docker-compose -f docker-compose.dev.yml logs -f "$service"
        else
            docker-compose -f docker-compose.dev.yml logs -f
        fi
        ;;
    
    "status")
        print_status "Service status:"
        docker-compose -f docker-compose.dev.yml ps
        echo ""
        print_status "Health checks:"
        
        # Check ML service
        if curl -s http://localhost:5050/health > /dev/null 2>&1; then
            print_success "ML Service (port 5050): ✅ RUNNING"
        else
            print_error "ML Service (port 5050): ❌ DOWN"
        fi
        
        # Check if other services are running (outside Docker)
        if lsof -ti:8080 > /dev/null 2>&1; then
            print_success "Go Backend (port 8080): ✅ RUNNING (external)"
        else
            print_warning "Go Backend (port 8080): ⚠️  NOT RUNNING"
        fi
        
        if lsof -ti:5173 > /dev/null 2>&1; then
            print_success "Frontend (port 5173): ✅ RUNNING (external)"
        else
            print_warning "Frontend (port 5173): ⚠️  NOT RUNNING"
        fi
        ;;
    
    "clean")
        print_warning "Cleaning up Docker resources..."
        docker-compose -f docker-compose.dev.yml down -v
        docker system prune -f
        print_success "Cleanup complete!"
        ;;
    
    "help"|*)
        echo "🐳 Docker Development Environment Manager"
        echo ""
        echo "Usage: $0 COMMAND [OPTIONS]"
        echo ""
        echo "Commands:"
        echo "  start, up     - Start all services"
        echo "  stop, down    - Stop all services"
        echo "  restart       - Restart all services"
        echo "  build         - Build all services"
        echo "  ml            - ML service specific commands"
        echo "  logs [service]- Show logs (all services or specific)"
        echo "  status        - Show service status and health"
        echo "  clean         - Clean up Docker resources"
        echo "  help          - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start           # Start all services"
        echo "  $0 ml start        # Start only ML service"
        echo "  $0 ml test         # Test ML service"
        echo "  $0 logs ml-service # Show ML service logs"
        echo "  $0 status          # Check all service status"
        ;;
esac
