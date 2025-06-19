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

  useEffect(() => {
    // Initialize Yjs document and WebSocket provider
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:8000', `whiteboard-${sessionId}`, ydoc)
    
    ydocRef.current = ydoc
    providerRef.current = provider

    provider.on('status', (event) => {
      console.log('Whiteboard connection status:', event.status)
      if (event.status === 'connected') {
        setIsLoading(false)
      }
    })

    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [sessionId])

  useEffect(() => {
    if (!excalidrawAPI || !ydocRef.current) return

    const ydoc = ydocRef.current
    const yElements = ydoc.getArray('elements')
    const yAppState = ydoc.getMap('appState')

    // Observer for remote changes
    const handleElementsChange = () => {
      const elements = yElements.toArray()
      excalidrawAPI.updateScene({ elements })
    }

    const handleAppStateChange = () => {
      const appState = yAppState.toJSON()
      if (Object.keys(appState).length > 0) {
        excalidrawAPI.updateScene({ appState })
      }
    }

    yElements.observe(handleElementsChange)
    yAppState.observe(handleAppStateChange)

    // Load initial state
    handleElementsChange()
    handleAppStateChange()

    return () => {
      yElements.unobserve(handleElementsChange)
      yAppState.unobserve(handleAppStateChange)
    }
  }, [excalidrawAPI])

  const handleChange = (elements, appState) => {
    if (!ydocRef.current) return

    const ydoc = ydocRef.current
    const yElements = ydoc.getArray('elements')
    const yAppState = ydoc.getMap('appState')

    ydoc.transact(() => {
      // Update elements
      yElements.delete(0, yElements.length)
      yElements.insert(0, elements)

      // Update app state (excluding some properties that shouldn't be synced)
      const filteredAppState = {
        viewBackgroundColor: appState.viewBackgroundColor,
        currentItemStrokeColor: appState.currentItemStrokeColor,
        currentItemBackgroundColor: appState.currentItemBackgroundColor,
        currentItemFillStyle: appState.currentItemFillStyle,
        currentItemStrokeWidth: appState.currentItemStrokeWidth,
        currentItemStrokeStyle: appState.currentItemStrokeStyle,
        currentItemRoughness: appState.currentItemRoughness,
        currentItemOpacity: appState.currentItemOpacity,
        currentItemFontFamily: appState.currentItemFontFamily,
        currentItemFontSize: appState.currentItemFontSize,
        currentItemTextAlign: appState.currentItemTextAlign,
        currentItemStartArrowhead: appState.currentItemStartArrowhead,
        currentItemEndArrowhead: appState.currentItemEndArrowhead,
        gridSize: appState.gridSize,
        colorPalette: appState.colorPalette,
      }

      yAppState.clear()
      Object.entries(filteredAppState).forEach(([key, value]) => {
        if (value !== undefined) {
          yAppState.set(key, value)
        }
      })
    })
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to whiteboard...</p>
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
          ref={(api) => setExcalidrawAPI(api)}
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