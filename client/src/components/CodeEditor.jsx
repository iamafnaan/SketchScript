import React, { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { Button } from '@/components/ui/button'
import { Play, Square, FileText, Settings } from 'lucide-react'
import { toast } from 'sonner'
import config from '@/config'

const CodeEditorComponent = ({ sessionId }) => {
  const editorRef = useRef(null)
  const ydocRef = useRef(null)
  const providerRef = useRef(null)
  const bindingRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState('javascript')
  const [isRunning, setIsRunning] = useState(false)
  const [output, setOutput] = useState('')

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
  ]

  useEffect(() => {
    // Initialize Yjs document and WebSocket provider
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider(config.WS_URL, `code-${sessionId}`, ydoc, {
      connect: true,
      resyncInterval: 5000,
    })
    
    ydocRef.current = ydoc
    providerRef.current = provider

    // Set up output syncing
    const yOutput = ydoc.getMap('output')
    const handleOutputChange = () => {
      const outputData = yOutput.toJSON()
      if (outputData.success !== undefined) {
        if (outputData.success) {
          setOutput(outputData.result || '')
        } else {
          setOutput(outputData.error || '')
        }
      }
    }

    yOutput.observe(handleOutputChange)

    provider.on('status', (event) => {
      console.log('Code editor connection status:', event.status)
      if (event.status === 'connected') {
        setIsLoading(false)
      }
    })

    // Handle connection errors
    provider.on('connection-error', (error) => {
      console.error('Code editor connection error:', error)
    })

    // Handle sync events
    provider.on('sync', (isSynced) => {
      console.log('Code editor sync status:', isSynced)
    })

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy()
      }
      yOutput.unobserve(handleOutputChange)
      if (provider) {
        provider.destroy()
      }
      if (ydoc) {
        ydoc.destroy()
      }
    }
  }, [sessionId])

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor
    
    if (ydocRef.current) {
      const ydoc = ydocRef.current
      const ytext = ydoc.getText('monaco')
      
      // Load saved session data (prioritize localStorage)
      const loadSessionData = async () => {
        try {
          // First try localStorage for immediate access
          const localData = localStorage.getItem(`code-${sessionId}`)
          if (localData) {
            const savedData = JSON.parse(localData)
            if (savedData.content) {
              console.log('Loading code data from localStorage')
              editor.setValue(savedData.content)
              if (savedData.language) {
                setLanguage(savedData.language)
              }
              return
            }
          }

          // Fallback to server data if no localStorage data
          const response = await fetch(`${config.API_URL}/api/sessions/${sessionId}/data/code`)
          if (response.ok) {
            const savedData = await response.json()
            if (savedData.content) {
              console.log('Loading code data from server')
              editor.setValue(savedData.content)
              if (savedData.language) {
                setLanguage(savedData.language)
              }
              // Save to localStorage for faster future access
              localStorage.setItem(`code-${sessionId}`, JSON.stringify({ 
                content: savedData.content, 
                language: savedData.language,
                timestamp: Date.now() 
              }))
            }
          }
        } catch (error) {
          console.error('Failed to load session code data:', error)
        }
      }
      
      // Create Monaco binding for collaborative editing
      bindingRef.current = new MonacoBinding(
        ytext,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      )

      // Auto-save code changes
      editor.onDidChangeModelContent(() => {
        const content = editor.getValue()
        
        // Save to localStorage immediately for persistence
        localStorage.setItem(`code-${sessionId}`, JSON.stringify({ 
          content, 
          language,
          timestamp: Date.now() 
        }))

        const saveCodeData = async () => {
          try {
            await fetch(`${config.API_URL}/api/sessions/${sessionId}/data/code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content, language })
            })
          } catch (error) {
            console.error('Failed to save code data:', error)
          }
        }

        // Debounce server saves
        clearTimeout(window.codeSaveTimeout)
        window.codeSaveTimeout = setTimeout(saveCodeData, 2000)
      })

      loadSessionData()
    }

    // Configure editor options
    editor.updateOptions({
      fontFamily: 'JetBrains Mono, SF Mono, Monaco, Inconsolata, Roboto Mono, Consolas, Courier New, monospace',
      fontSize: 14,
      lineHeight: 1.6,
      fontLigatures: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      smoothScrolling: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'gutter',
      selectOnLineNumbers: true,
      automaticLayout: true,
    })
  }

  const runCode = async () => {
    if (!editorRef.current) return

    const code = editorRef.current.getValue()
    if (!code.trim()) {
      toast.error('Please write some code first')
      return
    }

    setIsRunning(true)
    setOutput('Running...')

    try {
      const response = await fetch(`${config.API_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          sessionId,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        const outputText = result.output || 'Code executed successfully (no output)'
        setOutput(outputText)
        toast.success('Code executed successfully')
        
        // Sync output to all participants via Yjs
        if (ydocRef.current) {
          const yOutput = ydocRef.current.getMap('output')
          yOutput.set('result', outputText)
          yOutput.set('timestamp', Date.now())
          yOutput.set('language', language)
          yOutput.set('success', true)
        }
      } else {
        const errorText = result.error || 'An error occurred'
        setOutput(errorText)
        toast.error('Execution failed')
        
        // Sync error to all participants via Yjs
        if (ydocRef.current) {
          const yOutput = ydocRef.current.getMap('output')
          yOutput.set('error', errorText)
          yOutput.set('timestamp', Date.now())
          yOutput.set('language', language)
          yOutput.set('success', false)
        }
      }
    } catch (error) {
      const errorText = 'Failed to execute code: ' + error.message
      setOutput(errorText)
      toast.error('Failed to execute code')
      
      // Sync error to all participants via Yjs
      if (ydocRef.current) {
        const yOutput = ydocRef.current.getMap('output')
        yOutput.set('error', errorText)
        yOutput.set('timestamp', Date.now())
        yOutput.set('language', language)
        yOutput.set('success', false)
      }
    } finally {
      setIsRunning(false)
    }
  }

  const stopExecution = () => {
    // This would typically send a stop signal to the backend
    setIsRunning(false)
    setOutput('Execution stopped')
    toast.info('Execution stopped')
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to code editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => {
              const newLanguage = e.target.value
              setLanguage(newLanguage)
              
              // Save language change to localStorage immediately
              const currentCode = editorRef.current?.getValue() || ''
              localStorage.setItem(`code-${sessionId}`, JSON.stringify({ 
                content: currentCode, 
                language: newLanguage,
                timestamp: Date.now() 
              }))
            }}
            className="px-3 py-1 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={isRunning ? stopExecution : runCode}
              disabled={!editorRef.current}
              variant={isRunning ? "destructive" : "default"}
            >
              {isRunning ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost">
            <FileText className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button size="sm" variant="ghost">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor and Output */}
      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 border-r border-border">
          <Editor
            height="100%"
            language={language}
            theme="vs-light"
            onMount={handleEditorDidMount}
            options={{
              fontFamily: 'JetBrains Mono, SF Mono, Monaco, Inconsolata, Roboto Mono, Consolas, Courier New, monospace',
              fontSize: 14,
              lineHeight: 1.6,
              fontLigatures: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: true,
              smoothScrolling: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'gutter',
              selectOnLineNumbers: true,
              automaticLayout: true,
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>

        {/* Output Panel */}
        <div className="w-80 flex flex-col bg-muted/30">
          <div className="px-4 py-2 border-b border-border bg-card">
            <h3 className="text-sm font-medium">Output</h3>
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto">
            <pre className="whitespace-pre-wrap text-foreground">
              {output || 'Run your code to see output here...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CodeEditorComponent
