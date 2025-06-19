const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const cors = require('cors')
const helmet = require('helmet')
const { v4: uuidv4 } = require('uuid')
const { setupWSConnection } = require('y-websocket/bin/utils')
const db = require('./database')
const codeExecutor = require('./codeExecutor')

// Load environment variables
require('dotenv').config()

const app = express()
const server = http.createServer(app)

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// WebSocket Server for Yjs collaboration
const wss = new WebSocket.Server({ 
  server
})

// Store active sessions and connections
const activeSessions = new Map()
const sessionConnections = new Map()

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established')
  
  // Setup Yjs WebSocket connection
  setupWSConnection(ws, req, {
    gc: true
  })
})

// API Routes

// Create a new session
app.post('/api/sessions', async (req, res) => {
  try {
    const sessionId = uuidv4()
    const hostId = uuidv4()
    
    // Store session in database
    await db.createSession(sessionId, hostId)
    
    activeSessions.set(sessionId, {
      id: sessionId,
      hostId,
      createdAt: new Date(),
      participants: []
    })
    
    res.json({ sessionId, hostId })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// Get session details
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    // Check if session exists in database
    const session = await db.getSession(sessionId)
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }
    
    // Get or create active session
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, {
        id: sessionId,
        hostId: session.host_id,
        createdAt: new Date(session.created_at),
        participants: []
      })
    }
    
    res.json(activeSessions.get(sessionId))
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ error: 'Failed to fetch session' })
  }
})

// Execute code
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, sessionId } = req.body
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' })
    }
    
    console.log(`Executing ${language} code for session ${sessionId}`)
    
    // Execute code in Docker container
    const result = await codeExecutor.executeCode(code, language)
    
    res.json(result)
  } catch (error) {
    console.error('Error executing code:', error)
    res.status(500).json({ 
      error: 'Failed to execute code',
      details: error.message 
    })
  }
})

// Get session participants
app.get('/api/sessions/:sessionId/participants', (req, res) => {
  const { sessionId } = req.params
  const session = activeSessions.get(sessionId)
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  res.json(session.participants)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    connections: Array.from(sessionConnections.keys()).reduce((acc, sessionId) => {
      acc[sessionId] = sessionConnections.get(sessionId).size
      return acc
    }, {})
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

const PORT = process.env.PORT || 8000

// Initialize database and start server
async function startServer() {
  try {
    await db.initialize()
    console.log('Database initialized successfully')
    
    server.listen(PORT, () => {
      console.log(`SketchScript server running on port ${PORT}`)
      console.log(`WebSocket server ready for Yjs collaboration`)
      console.log(`Health check available at http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('Server closed')
    db.close()
    process.exit(0)
  })
}) 