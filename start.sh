#!/bin/bash

echo "🚀 Starting SketchScript with Supabase..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

# Note: No longer starting PostgreSQL - using Supabase instead
echo "📊 Using Supabase PostgreSQL (cloud database)..."

# Start code executor service only (for Docker-based code execution)
echo "🐳 Starting code executor service..."
docker-compose up -d code-executor

# Start backend server
echo "🖥️  Starting backend server..."
cd server && npm start &
BACKEND_PID=$!

# Wait for backend to start and test it
echo "⏳ Waiting for backend to be ready..."
sleep 3
for i in {1..10}; do
  if curl -s http://localhost:8000/health > /dev/null; then
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
echo "✅ SketchScript is now running with Supabase!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend:  http://localhost:8000"
echo "📊 Database: Supabase PostgreSQL (cloud)"
echo "🔗 WebSockets: ws://localhost:8000"
echo ""
echo "🎯 Open http://localhost:3000 in your browser to start collaborating!"
echo ""
echo "📝 Make sure to set up your .env files with Supabase credentials!"
echo "   Server: server/.env with DATABASE_URL"
echo "   Client: client/.env with VITE_SUPABASE_* variables"
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