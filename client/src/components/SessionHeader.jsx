import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Copy, 
  Home, 
  Settings, 
  Share2,
  Circle
} from 'lucide-react'

const SessionHeader = ({ sessionId, participants, isConnected, onCopyLink }) => {
  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={goHome}
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <h1 className="text-xl font-semibold text-foreground">
            SketchScript
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg"
        >
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-mono text-muted-foreground">
            {sessionId}
          </span>
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        {/* Participants */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div className="flex items-center gap-1">
            {participants.slice(0, 3).map((participant, index) => (
              <div
                key={participant.id || index}
                className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium"
                style={{ backgroundColor: participant.color || '#3b82f6' }}
                title={participant.name || `User ${index + 1}`}
              >
                {(participant.name || `U${index + 1}`).charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-sm font-medium text-muted-foreground">
                +{participants.length - 3}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participants.length}</span>
          </div>
        </motion.div>

        <div className="h-6 w-px bg-border" />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyLink}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </header>
  )
}

export default SessionHeader 