# Makefile for Realtime Whiteboard Project
# Provides targets for building, running, debugging, and cleaning

# Configuration
BACKEND_DIR = backend
FRONTEND_DIR = frontend
SCRIPTS_DIR = scripts

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Default target
.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)Realtime Whiteboard Project Makefile$(NC)"
	@echo "====================================="
	@echo ""
	@echo "$(YELLOW)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make build-backend    # Build the C++ backend to WebAssembly"
	@echo "  make run-frontend     # Start the frontend development server"
	@echo "  make debug-frontend   # Start frontend with debugging enabled"
	@echo "  make clean           # Remove all debug and test files"
	@echo "  make full-clean      # Clean + remove node_modules and build artifacts"

# Backend targets
.PHONY: build-backend
build-backend: ## Build the C++ backend to WebAssembly
	@echo "$(BLUE)[INFO]$(NC) Building backend to WebAssembly..."
	@cd $(BACKEND_DIR) && ./scripts/build_wasm.sh
	@echo "$(GREEN)[SUCCESS]$(NC) Backend built successfully!"

.PHONY: build-backend-native
build-backend-native: ## Build the C++ backend for native testing
	@echo "$(BLUE)[INFO]$(NC) Building backend for native testing..."
	@cd $(BACKEND_DIR) && ./scripts/build_native.sh
	@echo "$(GREEN)[SUCCESS]$(NC) Native backend built successfully!"

.PHONY: build-backend-all
build-backend-all: build-backend build-backend-native ## Build both WebAssembly and native versions

# Frontend targets
.PHONY: install-frontend
install-frontend: ## Install frontend dependencies
	@echo "$(BLUE)[INFO]$(NC) Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && npm install
	@echo "$(GREEN)[SUCCESS]$(NC) Frontend dependencies installed!"

.PHONY: run-frontend
run-frontend: ## Start the frontend development server
	@echo "$(BLUE)[INFO]$(NC) Starting frontend development server..."
	@cd $(FRONTEND_DIR) && npm run dev

.PHONY: debug-frontend
debug-frontend: ## Start frontend with debugging enabled
	@echo "$(BLUE)[INFO]$(NC) Starting frontend with debugging..."
	@cd $(FRONTEND_DIR) && npm run debug:chrome

.PHONY: debug-frontend-full
debug-frontend-full: ## Start frontend with full debugging (includes Chrome launch)
	@echo "$(BLUE)[INFO]$(NC) Starting frontend with full debugging..."
	@cd $(FRONTEND_DIR) && npm run debug:full

.PHONY: build-frontend
build-frontend: ## Build frontend for production
	@echo "$(BLUE)[INFO]$(NC) Building frontend for production..."
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)[SUCCESS]$(NC) Frontend built successfully!"

# Development workflow targets
.PHONY: dev
dev: build-backend run-frontend ## Build backend and start frontend development server

.PHONY: dev-debug
dev-debug: build-backend debug-frontend ## Build backend and start frontend with debugging

.PHONY: dev-full
dev-full: build-backend debug-frontend-full ## Build backend and start frontend with full debugging

# Testing targets
.PHONY: test-backend
test-backend: ## Run backend tests
	@echo "$(BLUE)[INFO]$(NC) Running backend tests..."
	@cd $(BACKEND_DIR) && ./scripts/test_all.sh
	@echo "$(GREEN)[SUCCESS]$(NC) Backend tests completed!"

.PHONY: test-frontend
test-frontend: ## Run frontend tests
	@echo "$(BLUE)[INFO]$(NC) Running frontend tests..."
	@cd $(FRONTEND_DIR) && npm run lint
	@echo "$(GREEN)[SUCCESS]$(NC) Frontend linting completed!"

.PHONY: test
test: test-backend test-frontend ## Run all tests

# Cleaning targets
.PHONY: clean
clean: ## Remove all debug and test files
	@echo "$(BLUE)[INFO]$(NC) Cleaning debug and test files..."
	@./$(SCRIPTS_DIR)/cleanup.sh

.PHONY: clean-frontend
clean-frontend: ## Clean frontend build artifacts and node_modules
	@echo "$(BLUE)[INFO]$(NC) Cleaning frontend..."
	@cd $(FRONTEND_DIR) && rm -rf node_modules dist .vite
	@echo "$(GREEN)[SUCCESS]$(NC) Frontend cleaned!"

.PHONY: clean-backend
clean-backend: ## Clean backend build artifacts
	@echo "$(BLUE)[INFO]$(NC) Cleaning backend..."
	@cd $(BACKEND_DIR) && rm -rf build/*.js build/*.wasm build/*.o build/test_native
	@echo "$(GREEN)[SUCCESS]$(NC) Backend cleaned!"

.PHONY: full-clean
full-clean: clean clean-frontend clean-backend ## Complete cleanup of all files

# Setup targets
.PHONY: setup
setup: install-frontend build-backend ## Initial project setup

.PHONY: setup-debug
setup-debug: install-frontend build-backend ## Setup with debugging tools

# Utility targets
.PHONY: status
status: ## Show project status
	@echo "$(BLUE)[INFO]$(NC) Project Status:"
	@echo "  Backend: $(shell if [ -f $(FRONTEND_DIR)/public/drawing_engine.wasm ]; then echo "$(GREEN)✓ Built$(NC)"; else echo "$(RED)✗ Not built$(NC)"; fi)"
	@echo "  Frontend: $(shell if [ -d $(FRONTEND_DIR)/node_modules ]; then echo "$(GREEN)✓ Dependencies installed$(NC)"; else echo "$(RED)✗ Dependencies missing$(NC)"; fi)"
	@echo "  Debug files: $(shell if find . -name "*debug*" -o -name "*test*" | grep -v ".git" | grep -q .; then echo "$(YELLOW)⚠ Present$(NC)"; else echo "$(GREEN)✓ Clean$(NC)"; fi)"

.PHONY: logs
logs: ## View debug logs
	@echo "$(BLUE)[INFO]$(NC) Recent debug logs:"
	@find . -name "*.log" -o -name "*debug*" -o -name "*test_results*" | head -10 | while read file; do echo "  $$file"; done

# Development convenience targets
.PHONY: restart
restart: clean dev ## Clean and restart development environment

.PHONY: restart-debug
restart-debug: clean dev-debug ## Clean and restart with debugging

# Documentation
.PHONY: docs
docs: ## Generate documentation
	@echo "$(BLUE)[INFO]$(NC) Documentation generation not yet implemented"
	@echo "$(YELLOW)[TODO]$(NC) Add documentation generation targets"

# Default target when no arguments provided
.DEFAULT_GOAL := help 