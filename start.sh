#!/bin/bash

echo "🚀 Starting Transkriber App locally..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start backend and Redis
echo "📦 Starting backend and Redis containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if backend is healthy
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running at http://localhost:8000"
else
    echo "⚠️  Backend might still be starting. Check logs with: docker-compose logs backend"
fi

# Check if Redis is healthy
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "⚠️  Redis might still be starting"
fi

echo ""
echo "📝 Next steps:"
echo "1. Start the frontend: cd frontend && npm install && npm run dev"
echo "2. Open http://localhost:3000 in your browser"
echo ""
echo "📊 View logs: docker-compose logs -f"
echo "🛑 Stop services: docker-compose down"
echo ""
