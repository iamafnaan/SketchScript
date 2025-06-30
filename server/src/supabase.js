const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY environment variable')
}

console.log('Initializing Supabase client with URL:', supabaseUrl)

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

// Database initialization
async function initialize() {
  try {
    // Test connection by checking if we can query system information
    const { data, error } = await supabase
      .from('sessions')
      .select('count')
      .limit(1)

    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist (which is fine)
      throw error
    }

    console.log('Connected to Supabase PostgreSQL database')
    
    // Create tables if they don't exist
    await createTables()
    
    return true
  } catch (error) {
    console.error('Supabase initialization failed:', error)
    console.error('Make sure your Supabase URL and keys are correct')
    throw error
  }
}

// Create necessary tables using raw SQL through Supabase
async function createTables() {
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(36) PRIMARY KEY,
      host_id VARCHAR(36) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      whiteboard_data JSONB DEFAULT '{}'::jsonb,
      code_data JSONB DEFAULT '{}'::jsonb,
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
    // Execute table creation using Supabase client
    const tables = [createSessionsTable, createParticipantsTable, createExecutionsTable, createIndexes]
    
    for (const sql of tables) {
      const { error } = await supabase.rpc('exec_sql', { sql })
      if (error) {
        // Try alternative method - using direct query
        const { error: queryError } = await supabase.from('sessions').select('id').limit(1)
        if (queryError && queryError.code === '42P01') {
          // Tables don't exist, try creating them one by one with a simpler approach
          console.log('Creating tables using alternative method...')
          await createTablesAlternative()
          return
        }
      }
    }
    
    console.log('Database tables created successfully via Supabase')
  } catch (error) {
    console.error('Error creating tables:', error)
    // Fallback to alternative method
    await createTablesAlternative()
  }
}

// Alternative table creation method
async function createTablesAlternative() {
  console.log('Note: Tables should be created in Supabase dashboard if not already present')
  console.log('Required tables: sessions, session_participants, code_executions')
  
  // We'll let the application try to use the tables and fail gracefully if they don't exist
  // The user should create these tables in the Supabase dashboard
}

// Session operations using Supabase client
async function createSession(sessionId, hostId, name = null) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        { 
          id: sessionId, 
          host_id: hostId, 
          name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error creating session:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error creating session:', error)
    throw error
  }
}

async function getSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching session:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching session:', error)
    throw error
  }
}

async function updateSession(sessionId, updates) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error updating session:', error)
    throw error
  }
}

async function deleteSession(sessionId) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error deleting session:', error)
    throw error
  }
}

// Participant operations
async function addParticipant(sessionId, userId, name, color) {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          name: name,
          color: color,
          last_seen: new Date().toISOString(),
          is_active: true
        },
        { 
          onConflict: 'session_id,user_id',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error adding participant:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error adding participant:', error)
    throw error
  }
}

async function getSessionParticipants(sessionId) {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('joined_at')

    if (error) {
      console.error('Error fetching participants:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching participants:', error)
    throw error
  }
}

async function updateParticipantActivity(sessionId, userId) {
  try {
    const { error } = await supabase
      .from('session_participants')
      .update({ last_seen: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating participant activity:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error updating participant activity:', error)
    throw error
  }
}

// Code execution logging
async function logCodeExecution(sessionId, userId, language, code, output, error, executionTime) {
  try {
    const { data, error: insertError } = await supabase
      .from('code_executions')
      .insert([
        {
          session_id: sessionId,
          user_id: userId,
          language: language,
          code: code,
          output: output,
          error: error,
          execution_time: executionTime,
          executed_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error logging code execution:', insertError)
      throw insertError
    }

    return data
  } catch (error) {
    console.error('Error logging code execution:', error)
    throw error
  }
}

async function getSessionExecutions(sessionId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('code_executions')
      .select('*')
      .eq('session_id', sessionId)
      .order('executed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching executions:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching executions:', error)
    throw error
  }
}

// Cleanup functions
async function cleanupInactiveSessions(hoursInactive = 24) {
  try {
    const cutoffTime = new Date(Date.now() - hoursInactive * 60 * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('sessions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .lt('updated_at', cutoffTime)
      .eq('is_active', true)
      .select('id')

    if (error) {
      console.error('Error cleaning up sessions:', error)
      throw error
    }

    return data?.length || 0
  } catch (error) {
    console.error('Error cleaning up sessions:', error)
    throw error
  }
}

async function cleanupInactiveParticipants(minutesInactive = 30) {
  try {
    const cutoffTime = new Date(Date.now() - minutesInactive * 60 * 1000).toISOString()
    
    const { data, error } = await supabase
      .from('session_participants')
      .update({ 
        is_active: false,
        last_seen: new Date().toISOString()
      })
      .lt('last_seen', cutoffTime)
      .eq('is_active', true)
      .select('id')

    if (error) {
      console.error('Error cleaning up participants:', error)
      throw error
    }

    return data?.length || 0
  } catch (error) {
    console.error('Error cleaning up participants:', error)
    throw error
  }
}

// Close connection (not needed for Supabase client)
async function close() {
  console.log('Supabase client - no explicit connection to close')
  return true
}

// NEW: Real-time subscriptions (Supabase feature)
function subscribeToSession(sessionId, callback) {
  const subscription = supabase
    .channel(`session_${sessionId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sessions',
      filter: `id=eq.${sessionId}`
    }, (payload) => {
      console.log('Session real-time update:', payload)
      callback(payload)
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'session_participants',
      filter: `session_id=eq.${sessionId}`
    }, (payload) => {
      console.log('Participants real-time update:', payload)
      callback(payload)
    })
    .subscribe()

  return subscription
}

function unsubscribeFromSession(subscription) {
  if (subscription) {
    supabase.removeChannel(subscription)
  }
}

// Export the same interface as database.js for compatibility
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
  
  // New Supabase-specific features
  subscribeToSession,
  unsubscribeFromSession,
  
  // Export client for direct access if needed
  supabase
} 