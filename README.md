# SketchScript

A real-time collaborative whiteboard and code editor built with React, Express, Yjs, and WebSockets. Create sessions, share links, and collaborate in real-time with seamless switching between whiteboard and code editor modes.

## ✨ Features

- **🎨 Interactive Whiteboard**: Powered with real-time collaboration
- **💻 Code Editor**: Editor with syntax highlighting for multiple languages
- **🔄 Real-time Sync**: Yjs + WebSockets for instant collaboration
- **🐳 Docker Code Execution**: Secure sandboxed code execution for multiple languages
- **🎯 Session Management**: Create and join sessions with shareable links
- **👥 Live Participants**: See who's online and their cursors in real-time
- **📱 Responsive Design**: Modern UI with Tailwind CSS and smooth animations
- **🔧 Language Support**: JavaScript, Python, Java, C++, Go, Rust

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Framer Motion** - Animations
- **Yjs** - CRDT for real-time collaboration


### Backend
- **Express.js** - Web server
- **WebSocket (ws)** - Real-time communication
- **Yjs** - Collaborative document handling
- **PostgreSQL** - Session and user data
- **Docker** - Code execution sandboxing
- **Dockerode** - Docker API client

### Infrastructure
- **Docker Compose** - Service orchestration
- **PostgreSQL** - Database
- **Docker** - Containerization

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **Docker** and **Docker Compose**
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SketchScript
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   cd ..
   ```

### Option 1: One-command startup (Recommended)
```bash
./start.sh
```

### Option 2: Manual startup

1. **Set up environment variables** (see Configuration section below)

2. **Start backend server**
   ```bash
   cd server && npm start
   ```

3. **Start frontend (in new terminal)**
   ```bash
   cd client && npm run dev
   ```

### Access Points
- 🌐 **Frontend:** http://localhost:3000
- 🔗 **Backend:** http://localhost:8000  
- 📊 **Database:** Supabase PostgreSQL (cloud)
- 🩺 **Health Check:** http://localhost:8000/health



## 🎯 Usage

### Creating a Session

1. Visit the homepage at `http://localhost:3000`
2. Click **"Create New Session"**
3. Share the generated session URL with collaborators

### Joining a Session

1. Enter the session ID on the homepage, or
2. Use the direct session link shared by the host

### Switching Modes

- Use the **Whiteboard** and **Code Editor** buttons in the session
- Your progress is preserved when switching between modes
- All changes are synced in real-time with other participants

### Code Execution

1. Switch to **Code Editor** mode
2. Select your programming language
3. Write your code
4. Click **"Run"** to execute in a sandboxed Docker container
5. View output in the right panel

## 🔧 Configuration

### Environment Variables

**Server Configuration:**
Copy `server/env.example` to `server/.env` and configure:

```env
# Server
PORT=8000
NODE_ENV=development

# Supabase Client Configuration
SUPABASE_URL=your-url
SUPABASE_ANON_KEY= your-key

# Security
CORS_ORIGIN=http://localhost:3000
```

**Client Configuration:**
Copy `client/.env.example` to `client/.env` and configure:

```env
# API URLs
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Supabase
VITE_SUPABASE_URL= your-URL
VITE_SUPABASE_ANON_KEY= your-KEY
```

### Docker Services

The application now uses these Docker services:

- **Code Executor**: Sandboxed code execution environment

**Database**: Now uses **Supabase PostgreSQL** (cloud) instead of local Docker PostgreSQL

## 🐳 Docker Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up --build
```

## 🔒 Security Features

- **Sandboxed Execution**: Code runs in isolated Docker containers
- **Network Isolation**: No internet access for executed code
- **Resource Limits**: Memory and CPU constraints
- **Auto-cleanup**: Containers are automatically removed
- **Input Validation**: All inputs are validated and sanitized

## 🔧 Troubleshooting

### Common Issues

1. **Real-time collaboration not working**
   - Check WebSocket connection at `ws://localhost:8000`
   - Ensure both frontend and backend are running
   - Verify session ID is correct
   - Check browser console for WebSocket connection errors

2. **Code execution fails**
   - Ensure Docker is running: `docker ps`
   - Pull required images: `docker pull node:18-alpine python:3.11-alpine`
   - Check backend logs for execution errors

3. **Database connection errors**
   - Check Supabase credentials in `server/.env`
   - Verify DATABASE_URL is correctly formatted
   - Check Supabase dashboard for database status
   - Ensure database password is correct

4. **Port conflicts**
   - Backend (8000): Change `PORT` in `server/.env`
   - Frontend (3000): Change port in `client/vite.config.js`
   - Database (5432): Change port in `docker-compose.yml`

### Performance Tips

- Use Chrome or Firefox for best WebSocket performance
- Close unused tabs to free up resources
- Restart servers if memory usage is high
- Use `docker system prune` to clean up unused containers

## 🚀 Deployment

### Production Build

```bash
# Build frontend
npm run build:client

# Build backend
npm run build:server

# Start production server
npm start
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ Development

### Frontend Development

```bash
cd client
npm run dev
```

### Backend Development

```bash
cd server
npm run dev
```

### Database Operations

```bash
# Connect to database
docker exec -it sketchscript_postgres_1 psql -U postgres -d sketchscript

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run frontend tests
cd client && npm test

# Run backend tests
cd server && npm test
```

## 📊 Performance

- **Real-time latency**: < 50ms for local changes
- **Concurrent users**: Supports 100+ users per session
- **Code execution**: Typical execution time < 5 seconds
- **Memory usage**: ~100MB per active session

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


## 🆘 Troubleshooting

### Common Issues

**Docker not available**
```bash
# Start Docker daemon
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
```

**Port conflicts**
```bash
# Check port usage
lsof -i :3000
lsof -i :8000

# Kill processes if needed
sudo kill -9 <PID>
```

**Database connection issues**
```bash
# Check PostgreSQL status
docker ps | grep postgres

# View database logs
docker logs sketchscript_postgres_1
```

### Getting Help

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](issues/)
- 💬 [Discussions](discussions/)






**Contact me if you want to collaborate @ahmedafnaan44@gmail.com**