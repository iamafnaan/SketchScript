#!/bin/bash

echo "🚀 Starting SketchScript..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Start PostgreSQL
echo "📊 Starting PostgreSQL..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Start backend server
echo "🖥️  Starting backend server..."
cd server && npm start &
BACKEND_PID=$!

# Wait for backend to start and test it
echo "⏳ Waiting for backend to be ready..."
sleep 3
for i in {1..10}; do
  if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend server is ready!"
    break
  fi
  echo "  Waiting for backend... ($i/10)"
  sleep 1
done

# Start frontend development server
echo "🎨 Starting frontend development server..."
cd ../client && npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to be ready..."
sleep 5

echo ""
echo "✅ SketchScript is now running!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend:  http://localhost:8000"
echo "📊 Database: PostgreSQL on port 5432"
echo "🔗 WebSockets: ws://localhost:8000"
echo ""
echo "🎯 Open http://localhost:3000 in your browser to start collaborating!"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down SketchScript..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  docker-compose down
  echo "✅ All services stopped"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for user to stop services
wait $BACKEND_PID $FRONTEND_PID 