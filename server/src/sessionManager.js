const { v4: uuidv4 } = require('uuid')

class SessionManager {
  constructor() {
    this.activeSessions = new Map()
    this.sessionConnections = new Map()
    this.sessionData = new Map() // Store persistent data for sessions
  }

  // Create a new session
  createSession(hostId = null) {
    const sessionId = uuidv4()
    const actualHostId = hostId || uuidv4()
    
    const session = {
      id: sessionId,
      hostId: actualHostId,
      createdAt: new Date(),
      participants: new Set(),
      whiteboardData: null,
      codeData: null,
      lastActivity: new Date()
    }
    
    this.activeSessions.set(sessionId, session)
    this.sessionData.set(sessionId, {
      whiteboard: { elements: [], appState: {} },
      code: { content: '', language: 'javascript' },
      output: { result: '', error: null, success: true }
    })
    
    console.log(`Created session: ${sessionId} with host: ${actualHostId}`)
    return { sessionId, hostId: actualHostId }
  }

  // Get session details
  getSession(sessionId) {
    return this.activeSessions.get(sessionId)
  }

  // Validate if session exists
  isValidSession(sessionId) {
    return this.activeSessions.has(sessionId)
  }

  // Add participant to session
  addParticipant(sessionId, participantId, ws = null) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.participants.add(participantId)
    session.lastActivity = new Date()

    if (ws) {
      if (!this.sessionConnections.has(sessionId)) {
        this.sessionConnections.set(sessionId, new Map())
      }
      this.sessionConnections.get(sessionId).set(participantId, ws)
    }

    console.log(`Participant ${participantId} joined session ${sessionId}`)
    return true
  }

  // Remove participant from session
  removeParticipant(sessionId, participantId) {
    const session = this.activeSessions.get(sessionId)
    if (!session) return false

    session.participants.delete(participantId)
    
    if (this.sessionConnections.has(sessionId)) {
      this.sessionConnections.get(sessionId).delete(participantId)
      if (this.sessionConnections.get(sessionId).size === 0) {
        this.sessionConnections.delete(sessionId)
      }
    }

    console.log(`Participant ${participantId} left session ${sessionId}`)
    return true
  }

  // Get session participants
  getParticipants(sessionId) {
    const session = this.activeSessions.get(sessionId)
    return session ? Array.from(session.participants) : []
  }

  // Store session data (whiteboard/code)
  setSessionData(sessionId, type, data) {
    if (!this.sessionData.has(sessionId)) {
      this.sessionData.set(sessionId, {
        whiteboard: { elements: [], appState: {} },
        code: { content: '', language: 'javascript' },
        output: { result: '', error: null, success: true }
      })
    }

    this.sessionData.get(sessionId)[type] = data
    
    // Update last activity
    const session = this.activeSessions.get(sessionId)
    if (session) {
      session.lastActivity = new Date()
    }
  }

  // Get session data
  getSessionData(sessionId, type = null) {
    const data = this.sessionData.get(sessionId)
    if (!data) return null
    
    return type ? data[type] : data
  }

  // Get connection count for session
  getConnectionCount(sessionId) {
    const connections = this.sessionConnections.get(sessionId)
    return connections ? connections.size : 0
  }

  // Cleanup old sessions (called periodically)
  cleanupSessions(maxAgeHours = 24) {
    const now = new Date()
    const maxAge = maxAgeHours * 60 * 60 * 1000

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        console.log(`Cleaning up inactive session: ${sessionId}`)
        this.activeSessions.delete(sessionId)
        this.sessionData.delete(sessionId)
        this.sessionConnections.delete(sessionId)
      }
    }
  }

  // Get all active sessions (for debugging)
  getAllSessions() {
    const sessions = {}
    for (const [sessionId, session] of this.activeSessions.entries()) {
      sessions[sessionId] = {
        ...session,
        participants: Array.from(session.participants),
        connectionCount: this.getConnectionCount(sessionId)
      }
    }
    return sessions
  }
}

module.exports = new SessionManager() 