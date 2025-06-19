import React, { useState, useEffect } from 'react'
import { Users, Wifi, WifiOff } from 'lucide-react'

const ParticipantsIndicator = ({ sessionId }) => {
  const [participants, setParticipants] = useState([])
  const [connectionCount, setConnectionCount] = useState(0)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    // Fetch session info periodically
    const fetchSessionInfo = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        if (response.ok) {
          const sessionData = await response.json()
          setParticipants(sessionData.participants || [])
          setConnectionCount(sessionData.connectionCount || 0)
          setIsOnline(true)
        } else {
          setIsOnline(false)
        }
      } catch (error) {
        console.error('Failed to fetch session info:', error)
        setIsOnline(false)
      }
    }

    // Fetch immediately
    fetchSessionInfo()

    // Then poll every 5 seconds
    const interval = setInterval(fetchSessionInfo, 5000)

    return () => clearInterval(interval)
  }, [sessionId])

  const getConnectionStatus = () => {
    if (!isOnline) return { color: 'text-red-500', icon: WifiOff, text: 'Offline' }
    if (connectionCount === 0) return { color: 'text-yellow-500', icon: Wifi, text: 'No connections' }
    if (connectionCount === 1) return { color: 'text-blue-500', icon: Wifi, text: 'You only' }
    return { color: 'text-green-500', icon: Wifi, text: `${connectionCount} connected` }
  }

  const status = getConnectionStatus()
  const StatusIcon = status.icon

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200">
      {/* Session ID */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Session:</span>
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
          {sessionId?.substring(0, 8)}...
        </code>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`h-4 w-4 ${status.color}`} />
        <span className={`text-sm ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Participants Count */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">
          {connectionCount === 0 
            ? 'Waiting for others...'
            : connectionCount === 1 
            ? 'Just you'
            : `${connectionCount} people online`
          }
        </span>
      </div>

      {/* Online indicator */}
      <div className="ml-auto flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className="text-xs text-gray-500">
          {isOnline ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}

export default ParticipantsIndicator 