import React, { useEffect, useRef, useState, Suspense } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

// Dynamic import for Excalidraw to avoid SSR issues
const Excalidraw = React.lazy(() => 
  import('@excalidraw/excalidraw').then(module => ({ 
    default: module.Excalidraw 
  }))
)

const WhiteboardComponent = ({ sessionId }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null)
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const isUpdatingFromYjs = useRef(false)
  const lastUpdateTime = useRef(0)

  useEffect(() => {
    // Initialize Yjs document and WebSocket provider
    const ydoc = new Y.Doc()
    
    // Add more robust WebSocket options
    const provider = new WebsocketProvider('ws://localhost:8000', `whiteboard-${sessionId}`, ydoc, {
      connect: true,
      resyncInterval: 5000,
      maxBackoffTime: 5000,
      disableBc: false,
    })
    
    ydocRef.current = ydoc
    providerRef.current = provider

    // Add timeout for initial connection
    const connectionTimeout = setTimeout(() => {
      if (connectionStatus === 'connecting') {
        console.warn('WebSocket connection timeout, retrying...')
        setConnectionStatus('retrying')
        provider.disconnect()
        setTimeout(() => provider.connect(), 1000)
      }
    }, 10000)

    // Handle connection status
    provider.on('status', (event) => {
      console.log('Whiteboard connection status:', event.status)
      clearTimeout(connectionTimeout)
      setConnectionStatus(event.status)
      if (event.status === 'connected') {
        setIsLoading(false)
      } else if (event.status === 'disconnected') {
        setIsLoading(true)
      }
    })

    // Handle connection errors
    provider.on('connection-error', (error) => {
      console.error('Whiteboard connection error:', error)
      setConnectionStatus('error')
    })

    // Handle sync events
    provider.on('sync', (isSynced) => {
      console.log('Whiteboard sync status:', isSynced ? 'synced' : 'syncing')
    })

    return () => {
      clearTimeout(connectionTimeout)
      clearTimeout(window.whiteboardSaveTimeout)
      clearTimeout(window.whiteboardYjsTimeout)
      
      // Save current state immediately before unmounting
      if (excalidrawAPI) {
        try {
          const scene = excalidrawAPI.getSceneElements()
          const appState = excalidrawAPI.getAppState()
          if (scene && scene.length > 0) {
            localStorage.setItem(`whiteboard-${sessionId}`, JSON.stringify({ 
              elements: scene, 
              appState: appState || {}, 
              timestamp: Date.now() 
            }))
            console.log('Saved whiteboard state on unmount:', scene.length, 'elements')
          }
        } catch (error) {
          console.error('Failed to save on unmount:', error)
        }
      }
      
      if (provider) {
        provider.destroy()
      }
      if (ydoc) {
        ydoc.destroy()
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (!excalidrawAPI || !ydocRef.current || connectionStatus !== 'connected') return

    const ydoc = ydocRef.current
    const yElements = ydoc.getArray('elements')
    let hasLoadedData = false

    // Load saved session data (prioritize localStorage)
    const loadSessionData = async () => {
      try {
        // First try localStorage for immediate access
        const localData = localStorage.getItem(`whiteboard-${sessionId}`)
        if (localData) {
          const savedData = JSON.parse(localData)
          if (savedData.elements && savedData.elements.length > 0) {
            console.log('Loading whiteboard data from localStorage:', savedData.elements.length, 'elements')
            hasLoadedData = true
            excalidrawAPI.updateScene({ elements: savedData.elements })
            // Sync loaded data to Yjs after a small delay to ensure Yjs is ready
            setTimeout(() => {
              ydoc.transact(() => {
                yElements.delete(0, yElements.length)
                yElements.insert(0, savedData.elements)
              })
            }, 200)
            return
          }
        }

        // Fallback to server data if no localStorage data
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/data/whiteboard`)
        if (response.ok) {
          const savedData = await response.json()
          if (savedData.elements && savedData.elements.length > 0) {
            console.log('Loading whiteboard data from server:', savedData.elements.length, 'elements')
            hasLoadedData = true
            excalidrawAPI.updateScene({ elements: savedData.elements })
            // Save to localStorage for faster future access
            localStorage.setItem(`whiteboard-${sessionId}`, JSON.stringify({ 
              elements: savedData.elements, 
              appState: savedData.appState || {}, 
              timestamp: Date.now() 
            }))
            // Sync loaded data to Yjs after a small delay
            setTimeout(() => {
              ydoc.transact(() => {
                yElements.delete(0, yElements.length)
                yElements.insert(0, savedData.elements)
              })
            }, 200)
          }
        }
      } catch (error) {
        console.error('Failed to load session data:', error)
      }
    }

    // Observer for remote changes
    const handleElementsChange = (event) => {
      const elements = yElements.toArray()
      console.log('Yjs elements changed:', elements.length, 'origin:', event.origin)
      
      // Prevent infinite loops by using a flag
      if (isUpdatingFromYjs.current) {
        return
      }
      
      // Don't overwrite with empty elements if we just loaded data
      if (!hasLoadedData && elements.length === 0) {
        console.log('Skipping empty elements update - data not loaded yet')
        return
      }
      
      // Only update if this is from a remote source (not local)
      if (event.origin === ydocRef.current) {
        return // Skip if this is a local change
      }
      
      isUpdatingFromYjs.current = true
      setTimeout(() => {
        isUpdatingFromYjs.current = false
      }, 100)
      
      // Update Excalidraw with new elements
      excalidrawAPI.updateScene({ elements })
    }

    yElements.observe(handleElementsChange)
    
    // Wait for Yjs to sync before loading data
    if (providerRef.current && providerRef.current.isSynced) {
      loadSessionData()
    } else {
      // Wait for sync event
      const syncHandler = (isSynced) => {
        if (isSynced && !hasLoadedData) {
          loadSessionData()
        }
      }
      providerRef.current?.on('sync', syncHandler)
      
      // Also try to load after a timeout as fallback
      setTimeout(() => {
        if (!hasLoadedData) {
          loadSessionData()
        }
      }, 500)
    }

    return () => {
      yElements.unobserve(handleElementsChange)
    }
  }, [excalidrawAPI, connectionStatus, sessionId])

  const handleChange = (elements, appState) => {
    if (!ydocRef.current || !elements || connectionStatus !== 'connected') return
    
    // Prevent updates while Yjs is updating from remote changes
    if (isUpdatingFromYjs.current) {
      return
    }

    const ydoc = ydocRef.current
    const yElements = ydoc.getArray('elements')

    // Throttle updates to prevent excessive calls
    const now = Date.now()
    if (now - lastUpdateTime.current < 50) { // 50ms throttle
      return
    }
    lastUpdateTime.current = now

    console.log('Local change detected:', elements.length, 'elements')

    // Save to localStorage immediately for persistence
    localStorage.setItem(`whiteboard-${sessionId}`, JSON.stringify({ elements, appState, timestamp: Date.now() }))

    // Update Yjs with local changes (debounced to prevent rapid updates)
    clearTimeout(window.whiteboardYjsTimeout)
    window.whiteboardYjsTimeout = setTimeout(() => {
      if (!isUpdatingFromYjs.current) {
        ydoc.transact(() => {
          yElements.delete(0, yElements.length)
          yElements.insert(0, elements)
        })
      }
    }, 100)

    // Save to server for cross-session persistence (debounced)
    const saveSessionData = async () => {
      try {
        await fetch(`http://localhost:8000/api/sessions/${sessionId}/data/whiteboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements, appState })
        })
      } catch (error) {
        console.error('Failed to save session data:', error)
      }
    }

    clearTimeout(window.whiteboardSaveTimeout)
    window.whiteboardSaveTimeout = setTimeout(saveSessionData, 1000)
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to whiteboard...</p>
          <p className="text-xs text-gray-500 mt-2">Status: {connectionStatus}</p>
          <p className="text-xs text-gray-400 mt-1">Session: {sessionId}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Suspense fallback={
        <div className="h-full flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading whiteboard...</p>
          </div>
        </div>
      }>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api)}
          onChange={handleChange}
          theme="light"
          initialData={{
            appState: {
              viewBackgroundColor: "#ffffff",
              currentItemStrokeColor: "#1e1e1e",
              currentItemBackgroundColor: "transparent",
              currentItemFillStyle: "hachure",
              currentItemStrokeWidth: 1,
              currentItemStrokeStyle: "solid",
              currentItemRoughness: 1,
              currentItemOpacity: 100,
              currentItemFontFamily: 1, // Virgil
              currentItemFontSize: 20,
              currentItemTextAlign: "left",
              currentItemStartArrowhead: null,
              currentItemEndArrowhead: "arrow",
              gridSize: null,
            },
          }}
        />
      </Suspense>
    </div>
  )
}

export default WhiteboardComponent 