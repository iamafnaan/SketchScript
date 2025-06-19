import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Plus, Users, Code, Paintbrush } from 'lucide-react'
import { toast } from 'sonner'

const Home = () => {
  const [sessionId, setSessionId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

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

  const joinSession = () => {
    if (sessionId.trim()) {
      navigate(`/session/${sessionId.trim()}`)
    } else {
      toast.error('Please enter a valid session ID')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
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
            className="text-6xl font-bold text-gray-900 mb-4"
          >
            SketchScript
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8"
          >
            Collaborative whiteboard and code editor in real-time
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex justify-center gap-8 mb-12"
          >
            <div className="flex items-center gap-2 text-gray-600">
              <Paintbrush className="h-5 w-5" />
              <span>Whiteboard</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Code className="h-5 w-5" />
              <span>Code Editor</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-5 w-5" />
              <span>Real-time</span>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900">Create Session</h2>
              <p className="text-gray-600">Start a new collaborative session</p>
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
              <h2 className="text-2xl font-semibold text-gray-900">Join Session</h2>
              <p className="text-gray-600">Enter session ID to join</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter session ID"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                  className="w-full h-12 px-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
          className="text-center mt-8 text-gray-500"
        >
          <p>Built with React, Express, Yjs, and WebSockets</p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Home 