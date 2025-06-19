import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Code, 
  Paintbrush, 
  Users, 
  Copy, 
  Settings,
  Play,
  Download
} from 'lucide-react'
import { toast } from 'sonner'
import WhiteboardComponent from '@/components/Whiteboard'
import CodeEditorComponent from '@/components/CodeEditor'
import SessionHeader from '@/components/SessionHeader'
import ParticipantsIndicator from '@/components/ParticipantsIndicator'

const Session = () => {
  const { sessionId } = useParams()
  const [activeMode, setActiveMode] = useState('whiteboard') // 'whiteboard' or 'code'
  const [participants, setParticipants] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize session connection
    const initSession = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        if (response.ok) {
          const sessionData = await response.json()
          setIsConnected(true)
          toast.success('Connected to session!')
        } else {
          toast.error('Session not found')
        }
      } catch (error) {
        toast.error('Failed to connect to session')
        console.error('Error connecting to session:', error)
      }
    }

    initSession()
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

      {/* Participants Indicator */}
      <ParticipantsIndicator sessionId={sessionId} />

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
          {activeMode === 'code' && (
            <Button size="sm" variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Run Code
            </Button>
          )}
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" variant="ghost">
            <Settings className="h-4 w-4" />
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
          <Users className="h-4 w-4" />
          <span>{participants.length} participants</span>
        </div>
      </div>
    </div>
  )
}

export default Session 