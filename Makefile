# Makefile for Descript-Style Video Editor

.PHONY: help build up down restart logs clean dev dev-down

# Default target
help:
	@echo "🎬 Descript-Style Video Editor - Docker Commands"
	@echo ""
	@echo "Production:"
	@echo "  make build      - Build all Docker images"
	@echo "  make up         - Start all services"
	@echo "  make down       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs (all services)"
	@echo "  make clean      - Stop and remove everything"
	@echo ""
	@echo "Development:"
	@echo "  make dev        - Start in development mode"
	@echo "  make dev-down   - Stop development services"
	@echo ""
	@echo "Utilities:"
	@echo "  make shell-backend   - Open shell in backend container"
	@echo "  make shell-frontend  - Open shell in frontend container"
	@echo "  make health          - Check service health"
	@echo ""

# Production commands
build:
	@echo "🔨 Building Docker images..."
	docker-compose build

up:
	@echo "🚀 Starting services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:3001"
	@echo "   Health:   http://localhost:3001/api/health"

down:
	@echo "🛑 Stopping services..."
	docker-compose down

restart:
	@echo "🔄 Restarting services..."
	docker-compose restart

logs:
	@echo "📋 Viewing logs (Ctrl+C to exit)..."
	docker-compose logs -f

clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v --rmi local
	@echo "✅ Cleanup complete!"

# Development commands
dev:
	@echo "🛠️  Starting development environment..."
	docker-compose -f docker-compose.dev.yml up
	@echo "✅ Development services started!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:3001"

dev-down:
	@echo "🛑 Stopping development services..."
	docker-compose -f docker-compose.dev.yml down

# Utility commands
shell-backend:
	@echo "🐚 Opening shell in backend container..."
	docker-compose exec backend sh

shell-frontend:
	@echo "🐚 Opening shell in frontend container..."
	docker-compose exec frontend sh

health:
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3001/api/health | jq '.' || echo "❌ Backend not responding"
	@docker-compose ps

