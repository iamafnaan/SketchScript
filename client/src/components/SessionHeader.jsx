import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Copy, 
  Home, 
  Share2,
  Moon,
  Sun
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const SessionHeader = ({ sessionId, participants, isConnected, onCopyLink }) => {
  const { theme, toggleTheme } = useTheme()
  
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
            onClick={toggleTheme}
            className="flex items-center gap-2"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </motion.div>
      </div>
    </header>
  )
}

export default SessionHeader 