import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Code, 
  Paintbrush, 
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import WhiteboardComponent from '@/components/Whiteboard'
import CodeEditorComponent from '@/components/CodeEditor'
import SessionHeader from '@/components/SessionHeader'
import config from '@/config'

const Session = () => {
  const { sessionId } = useParams()
  const [activeMode, setActiveMode] = useState('whiteboard') // 'whiteboard' or 'code'
  const [participants, setParticipants] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionCount, setConnectionCount] = useState(0)

  useEffect(() => {
    // Initialize session connection
    const initSession = async () => {
      try {
        const response = await fetch(`${config.API_URL}/api/sessions/${sessionId}`)
        if (response.ok) {
          const sessionData = await response.json()
          setIsConnected(true)
          setConnectionCount(sessionData.connectionCount || 0)
          toast.success('Connected to session!')
        } else {
          toast.error('Session not found')
          setIsConnected(false)
        }
      } catch (error) {
        toast.error('Failed to connect to session')
        console.error('Error connecting to session:', error)
        setIsConnected(false)
      }
    }

    initSession()

    // Poll for connection count updates every 5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${config.API_URL}/api/sessions/${sessionId}`)
        if (response.ok) {
          const sessionData = await response.json()
          setConnectionCount(sessionData.connectionCount || 0)
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Error polling session status:', error)
        setIsConnected(false)
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [sessionId])

  const copySessionLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('Session link copied to clipboard!')
  }

  const toggleMode = (mode) => {
    if (mode !== activeMode) {
      setActiveMode(mode)
      toast.info(`Switched to ${mode === 'whiteboard' ? 'Whiteboard' : 'Code Editor'}`)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <SessionHeader
        sessionId={sessionId}
        participants={participants}
        isConnected={isConnected}
        onCopyLink={copySessionLink}
      />

      {/* Mode Toggle Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant={activeMode === 'whiteboard' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => toggleMode('whiteboard')}
            className="transition-all duration-200"
          >
            <Paintbrush className="h-4 w-4 mr-2" />
            Whiteboard
          </Button>
          <Button
            variant={activeMode === 'code' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => toggleMode('code')}
            className="transition-all duration-200"
          >
            <Code className="h-4 w-4 mr-2" />
            Code Editor
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeMode === 'whiteboard' ? (
            <motion.div
              key="whiteboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <WhiteboardComponent sessionId={sessionId} />
            </motion.div>
          ) : (
            <motion.div
              key="code-editor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <CodeEditorComponent sessionId={sessionId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="px-6 py-2 bg-muted text-sm text-muted-foreground border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span>Session: {sessionId}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connectionCount > 0 ? 'bg-blue-500' : 'bg-gray-400'}`} />
          <span>
            {connectionCount === 0 ? 'No connections' : 
             connectionCount === 1 ? '1 person connected' : 
             `${connectionCount} people connected`}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Session
