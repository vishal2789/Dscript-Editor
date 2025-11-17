#!/bin/bash

# Quick start script for Descript-Style Video Editor
# This script helps set up and start the application with Docker

set -e

echo "🎬 Descript-Style Video Editor - Quick Start"
echo "=============================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    echo "Please install Docker Compose from: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo ""
    echo "Creating .env from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and add your API keys:"
    echo "   - OPENAI_API_KEY (get from: https://platform.openai.com/api-keys)"
    echo "   - PEXELS_API_KEY (get from: https://www.pexels.com/api/)"
    echo ""
    read -p "Press Enter after you've added your API keys to .env file..."
fi

# Verify API keys are set
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo "❌ OPENAI_API_KEY is not set in .env file!"
    echo "Please edit .env and add your OpenAI API key"
    exit 1
fi

if [ -z "$PEXELS_API_KEY" ] || [ "$PEXELS_API_KEY" = "your_pexels_api_key_here" ]; then
    echo "❌ PEXELS_API_KEY is not set in .env file!"
    echo "Please edit .env and add your Pexels API key"
    exit 1
fi

echo "✅ API keys configured"
echo ""

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/uploads backend/exports backend/temp
echo "✅ Directories created"
echo ""

# Build Docker images
echo "🔨 Building Docker images (this may take a few minutes)..."
docker-compose build
echo "✅ Images built successfully"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose up -d
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check backend health
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "⚠️  Backend health check timed out, but services may still be starting"
    echo "   Check logs with: docker-compose logs -f"
fi

echo ""
echo "=============================================="
echo "✅ Application is running!"
echo "=============================================="
echo ""
echo "📍 Access the application:"
echo "   Frontend:    http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo "   Health:      http://localhost:3001/api/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs:       docker-compose logs -f"
echo "   Stop services:   docker-compose down"
echo "   Restart:         docker-compose restart"
echo ""
echo "📚 Full documentation: See DOCKER-SETUP.md"
echo ""

