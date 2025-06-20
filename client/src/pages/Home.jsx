import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, Users, Code, Paintbrush, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from '@/contexts/ThemeContext'

const Home = () => {
  const [sessionId, setSessionId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  const createSession = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success('Session created successfully!')
        navigate(`/session/${data.sessionId}`)
      } else {
        throw new Error('Failed to create session')
      }
    } catch (error) {
      toast.error('Failed to create session')
      console.error('Error creating session:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const joinSession = async () => {
    const trimmedSessionId = sessionId.trim()
    if (!trimmedSessionId) {
      toast.error('Please enter a valid session ID')
      return
    }

    try {
      // Validate session exists before navigating
      const response = await fetch(`http://localhost:8000/api/sessions/${trimmedSessionId}`)
      if (response.ok) {
        navigate(`/session/${trimmedSessionId}`)
      } else if (response.status === 404) {
        toast.error('Session ID doesn\'t exist. Please check and try again.')
      } else {
        toast.error('Failed to validate session. Please try again.')
      }
    } catch (error) {
      console.error('Error validating session:', error)
      toast.error('Failed to connect to server. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4 transition-colors">
      {/* Theme toggle button */}
      <div className="absolute top-6 right-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-6xl font-bold text-gray-900 dark:text-white mb-4"
          >
            SketchScript
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 dark:text-gray-300 mb-8"
          >
            Collaborative whiteboard and code editor in real-time
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center gap-8 mb-12"
          >
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Paintbrush className="h-5 w-5" />
              <span>Whiteboard</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Code className="h-5 w-5" />
              <span>Code Editor</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <Users className="h-5 w-5" />
              <span>Real-time</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Create Session</h2>
              <p className="text-gray-600 dark:text-gray-300">Start a new collaborative session</p>
              <Button
                onClick={createSession}
                disabled={isCreating}
                className="w-full h-12 text-lg animate-pulse-soft"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                {isCreating ? 'Creating...' : 'Create New Session'}
              </Button>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Join Session</h2>
              <p className="text-gray-600 dark:text-gray-300">Enter session ID to join</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter session ID"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                  className="w-full h-12 px-4 text-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
                <Button
                  onClick={joinSession}
                  variant="outline"
                  className="w-full h-12 text-lg"
                  size="lg"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Join Session
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-8 text-gray-500 dark:text-gray-400"
        >
          <p>Built with React, Express, Yjs, and WebSockets</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Home 