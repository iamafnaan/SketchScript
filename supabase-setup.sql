-- SketchScript Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Sessions table
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

-- Session participants table
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

-- Code executions table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_host_id ON sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_active ON session_participants(is_active);
CREATE INDEX IF NOT EXISTS idx_executions_session_id ON code_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_executions_executed_at ON code_executions(executed_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create a cleanup function for old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions(hours_inactive INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE sessions 
    SET is_active = false 
    WHERE updated_at < NOW() - INTERVAL '1 hour' * hours_inactive 
    AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a cleanup function for inactive participants
CREATE OR REPLACE FUNCTION cleanup_inactive_participants(minutes_inactive INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE session_participants 
    SET is_active = false 
    WHERE last_seen < NOW() - INTERVAL '1 minute' * minutes_inactive 
    AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Optional: Enable Row Level Security (RLS) for better security
-- Uncomment these if you plan to add user authentication later

-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE code_executions ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment when adding auth)
-- CREATE POLICY "Users can view sessions they participate in" 
-- ON sessions FOR SELECT 
-- USING (auth.uid() = host_id OR id IN (
--   SELECT session_id FROM session_participants WHERE user_id = auth.uid()::text
-- ));

-- CREATE POLICY "Users can update their own sessions"
-- ON sessions FOR UPDATE
-- USING (auth.uid() = host_id);

-- Grant permissions for anon users (for now, since no auth system)
-- In production, you'd want to restrict these based on authentication
GRANT ALL ON sessions TO anon;
GRANT ALL ON session_participants TO anon;
GRANT ALL ON code_executions TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Insert test data (optional)
-- INSERT INTO sessions (id, host_id, name) VALUES 
-- ('test-session-123', 'host-123', 'Test Session')
-- ON CONFLICT (id) DO NOTHING;

COMMIT; 