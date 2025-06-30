// Load environment variables FIRST - before any other imports
require('dotenv').config()

const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const cors = require('cors')
const helmet = require('helmet')
const { v4: uuidv4 } = require('uuid')
const { setupWSConnection } = require('y-websocket/bin/utils')
const db = require('./supabase')
const codeExecutor = require('./codeExecutor')
const sessionManager = require('./sessionManager')

const app = express()
const server = http.createServer(app)

// Configure CORS for production
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']

console.log('CORS origins configured:', corsOrigins)

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false
}))
app.use(cors({
  origin: corsOrigins,
  credentials: true
}))
app.use(express.json())

// WebSocket Server for Yjs collaboration
const wss = new WebSocket.Server({ 
  server
})

// Use centralized session manager
// const activeSessions = new Map() - replaced by sessionManager
// const sessionConnections = new Map() - replaced by sessionManager

// Handle WebSocket connections with session validation
wss.on('connection', (ws, req) => {
  const url = req.url
  console.log('New Yjs WebSocket connection established:', url)
  
  // Extract session ID from URL path
  const pathMatch = url.match(/\/(whiteboard|code)-(.+)/)
  if (!pathMatch) {
    console.error('Invalid WebSocket path:', url)
    ws.close(1008, 'Invalid path')
    return
  }
  
  const [, mode, sessionId] = pathMatch
  
  // Validate session exists
  if (!sessionManager.isValidSession(sessionId)) {
    console.error('Session not found:', sessionId)
    ws.close(1008, 'Session not found')
    return
  }
  
  console.log(`Valid ${mode} connection for session:`, sessionId)
  
  // Generate participant ID and add to session
  const participantId = require('uuid').v4()
  sessionManager.addParticipant(sessionId, participantId, ws)
  
  // Setup Yjs WebSocket connection with proper persistence
  setupWSConnection(ws, req, {
    gc: true,
    gcFilter: () => false, // Keep all documents in memory
  })
  
  ws.on('close', () => {
    console.log('Yjs WebSocket connection closed for session:', sessionId)
    sessionManager.removeParticipant(sessionId, participantId)
  })
  
  ws.on('error', (error) => {
    console.error('WebSocket error for session', sessionId, ':', error)
    sessionManager.removeParticipant(sessionId, participantId)
  })
})

// API Routes

// Create a new session
app.post('/api/sessions', async (req, res) => {
  try {
    // Create session using session manager
    const { sessionId, hostId } = sessionManager.createSession()
    
    // Store session in database
    await db.createSession(sessionId, hostId)
    
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
    
    // Check if session exists in memory first
    let session = sessionManager.getSession(sessionId)
    
    if (!session) {
      // Check database and recreate session if exists
      const dbSession = await db.getSession(sessionId)
      if (!dbSession) {
        return res.status(404).json({ error: 'Session not found' })
      }
      
      // Recreate session from database
      sessionManager.createSession(dbSession.host_id)
      // Update with correct session ID (since createSession generates new ID)
      sessionManager.activeSessions.delete(sessionManager.activeSessions.keys().next().value)
      sessionManager.activeSessions.set(sessionId, {
        id: sessionId,
        hostId: dbSession.host_id,
        createdAt: new Date(dbSession.created_at),
        participants: new Set(),
        lastActivity: new Date()
      })
      session = sessionManager.getSession(sessionId)
    }
    
    res.json({
      ...session,
      participants: sessionManager.getParticipants(sessionId),
      connectionCount: sessionManager.getConnectionCount(sessionId)
    })
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
      return res.status(400).json({ 
        success: false,
        error: 'Code and language are required',
        output: null,
        executionTime: 0
      })
    }
    
    console.log(`Executing ${language} code for session ${sessionId}:`, code.substring(0, 100) + '...')
    
    // Execute code in Docker container
    const result = await codeExecutor.executeCode(code, language)
    console.log('Execution result:', result)
    
    res.json(result)
  } catch (error) {
    console.error('Error executing code:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to execute code: ' + error.message,
      output: null,
      executionTime: 0,
      language
    })
  }
})

// Get session participants
app.get('/api/sessions/:sessionId/participants', (req, res) => {
  const { sessionId } = req.params
  
  if (!sessionManager.isValidSession(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  res.json(sessionManager.getParticipants(sessionId))
})

// Get session data (whiteboard/code)
app.get('/api/sessions/:sessionId/data/:type', (req, res) => {
  const { sessionId, type } = req.params
  
  if (!sessionManager.isValidSession(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  const data = sessionManager.getSessionData(sessionId, type)
  res.json(data || {})
})

// Save session data (whiteboard/code)
app.post('/api/sessions/:sessionId/data/:type', (req, res) => {
  const { sessionId, type } = req.params
  const data = req.body
  
  if (!sessionManager.isValidSession(sessionId)) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  sessionManager.setSessionData(sessionId, type, data)
  res.json({ success: true })
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    activeSessions: sessionManager.activeSessions.size,
    database: 'Supabase Connected'
  })
})

// Production: Serve static files from client build
if (process.env.NODE_ENV === 'production') {
  const path = require('path')
  const clientPath = path.join(__dirname, '../../client/dist')
  
  // Serve static files
  app.use(express.static(clientPath))
  
  // Handle React Router (return index.html for all non-API routes)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(clientPath, 'index.html'))
    } else {
      res.status(404).json({ error: 'API endpoint not found' })
    }
  })
}

// Start server
async function startServer() {
  try {
    // Initialize database
    await db.initialize()
    console.log('Supabase database initialized successfully')
    
    const PORT = process.env.PORT || 8000
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 SketchScript server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`)
      console.log(`🔄 CORS Origins: ${corsOrigins.join(', ')}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
