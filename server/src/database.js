const { Pool } = require('pg')

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sketchscript',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

const pool = new Pool(dbConfig)

// Database initialization
async function initialize() {
  try {
    // Test connection
    const client = await pool.connect()
    console.log('Connected to PostgreSQL database')
    client.release()
    
    // Create tables if they don't exist
    await createTables()
    
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    throw error
  }
}

// Create necessary tables
async function createTables() {
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      host_id VARCHAR(36) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      whiteboard_data JSONB,
      code_data JSONB,
      settings JSONB DEFAULT '{}'::jsonb
    );
  `

  const createParticipantsTable = `
    CREATE TABLE IF NOT EXISTS session_participants (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE CASCADE,
      user_id VARCHAR(36),
      name VARCHAR(255),
      color VARCHAR(7),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      UNIQUE(session_id, user_id)
    );
  `

  const createExecutionsTable = `
    CREATE TABLE IF NOT EXISTS code_executions (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(36) REFERENCES sessions(id) ON DELETE CASCADE,
      user_id VARCHAR(36),
      language VARCHAR(50) NOT NULL,
      code TEXT NOT NULL,
      output TEXT,
      error TEXT,
      execution_time INTEGER,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON sessions(host_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
    CREATE INDEX IF NOT EXISTS idx_participants_session_id ON session_participants(session_id);
    CREATE INDEX IF NOT EXISTS idx_participants_user_id ON session_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_executions_session_id ON code_executions(session_id);
    CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON code_executions(executed_at);
  `

  try {
    await pool.query(createSessionsTable)
    await pool.query(createParticipantsTable)
    await pool.query(createExecutionsTable)
    await pool.query(createIndexes)
    console.log('Database tables created successfully')
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

// Session operations
async function createSession(sessionId, hostId, name = null) {
  const query = `
    INSERT INTO sessions (id, host_id, name)
    VALUES ($1, $2, $3)
    RETURNING *;
  `
  
  try {
    const result = await pool.query(query, [sessionId, hostId, name])
    return result.rows[0]
  } catch (error) {
    console.error('Error creating session:', error)
    throw error
  }
}

async function getSession(sessionId) {
  const query = `
    SELECT * FROM sessions
    WHERE id = $1 AND is_active = true;
  `
  
  try {
    const result = await pool.query(query, [sessionId])
    return result.rows[0]
  } catch (error) {
    console.error('Error fetching session:', error)
    throw error
  }
}

async function updateSession(sessionId, updates) {
  const setClause = Object.keys(updates)
    .map((key, index) => `${key} = $${index + 2}`)
    .join(', ')
  
  const query = `
    UPDATE sessions
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `
  
  try {
    const values = [sessionId, ...Object.values(updates)]
    const result = await pool.query(query, values)
    return result.rows[0]
  } catch (error) {
    console.error('Error updating session:', error)
    throw error
  }
}

async function deleteSession(sessionId) {
  const query = `
    UPDATE sessions
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `
  
  try {
    await pool.query(query, [sessionId])
    return true
  } catch (error) {
    console.error('Error deleting session:', error)
    throw error
  }
}

// Participant operations
async function addParticipant(sessionId, userId, name, color) {
  const query = `
    INSERT INTO session_participants (session_id, user_id, name, color)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (session_id, user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      last_seen = CURRENT_TIMESTAMP,
      is_active = true
    RETURNING *;
  `
  
  try {
    const result = await pool.query(query, [sessionId, userId, name, color])
    return result.rows[0]
  } catch (error) {
    console.error('Error adding participant:', error)
    throw error
  }
}

async function getSessionParticipants(sessionId) {
  const query = `
    SELECT * FROM session_participants
    WHERE session_id = $1 AND is_active = true
    ORDER BY joined_at;
  `
  
  try {
    const result = await pool.query(query, [sessionId])
    return result.rows
  } catch (error) {
    console.error('Error fetching participants:', error)
    throw error
  }
}

async function updateParticipantActivity(sessionId, userId) {
  const query = `
    UPDATE session_participants
    SET last_seen = CURRENT_TIMESTAMP
    WHERE session_id = $1 AND user_id = $2;
  `
  
  try {
    await pool.query(query, [sessionId, userId])
    return true
  } catch (error) {
    console.error('Error updating participant activity:', error)
    throw error
  }
}

// Code execution tracking
async function logCodeExecution(sessionId, userId, language, code, output, error, executionTime) {
  const query = `
    INSERT INTO code_executions (session_id, user_id, language, code, output, error, execution_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `
  
  try {
    const result = await pool.query(query, [sessionId, userId, language, code, output, error, executionTime])
    return result.rows[0]
  } catch (error) {
    console.error('Error logging code execution:', error)
    throw error
  }
}

async function getSessionExecutions(sessionId, limit = 50) {
  const query = `
    SELECT * FROM code_executions
    WHERE session_id = $1
    ORDER BY executed_at DESC
    LIMIT $2;
  `
  
  try {
    const result = await pool.query(query, [sessionId, limit])
    return result.rows
  } catch (error) {
    console.error('Error fetching executions:', error)
    throw error
  }
}

// Cleanup inactive sessions and participants
async function cleanupInactiveSessions(hoursInactive = 24) {
  const query = `
    UPDATE sessions
    SET is_active = false
    WHERE updated_at < NOW() - INTERVAL '${hoursInactive} hours'
    AND is_active = true;
  `
  
  try {
    const result = await pool.query(query)
    console.log(`Cleaned up ${result.rowCount} inactive sessions`)
    return result.rowCount
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    throw error
  }
}

async function cleanupInactiveParticipants(minutesInactive = 30) {
  const query = `
    UPDATE session_participants
    SET is_active = false
    WHERE last_seen < NOW() - INTERVAL '${minutesInactive} minutes'
    AND is_active = true;
  `
  
  try {
    const result = await pool.query(query)
    console.log(`Cleaned up ${result.rowCount} inactive participants`)
    return result.rowCount
  } catch (error) {
    console.error('Error cleaning up participants:', error)
    throw error
  }
}

// Close database connection
async function close() {
  try {
    await pool.end()
    console.log('Database connection pool closed')
  } catch (error) {
    console.error('Error closing database connection:', error)
    throw error
  }
}

module.exports = {
  initialize,
  createSession,
  getSession,
  updateSession,
  deleteSession,
  addParticipant,
  getSessionParticipants,
  updateParticipantActivity,
  logCodeExecution,
  getSessionExecutions,
  cleanupInactiveSessions,
  cleanupInactiveParticipants,
  close,
  pool // Export pool for direct queries if needed
} 