import React, { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const WebSocketTest = ({ sessionId }) => {
  const [status, setStatus] = useState('connecting')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')

  useEffect(() => {
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:8000', `test-${sessionId}`, ydoc)
    const yarray = ydoc.getArray('messages')

    provider.on('status', (event) => {
      console.log('Test connection status:', event.status)
      setStatus(event.status)
    })

    // Listen for new messages
    yarray.observe(() => {
      setMessages(yarray.toArray())
    })

    // Load existing messages
    setMessages(yarray.toArray())

    return () => {
      provider.destroy()
      ydoc.destroy()
    }
  }, [sessionId])

  const sendMessage = () => {
    if (!input.trim()) return
    
    const ydoc = new Y.Doc()
    const provider = new WebsocketProvider('ws://localhost:8000', `test-${sessionId}`, ydoc)
    const yarray = ydoc.getArray('messages')
    
    provider.on('status', (event) => {
      if (event.status === 'connected') {
        yarray.push([{
          text: input,
          timestamp: Date.now(),
          id: Math.random().toString(36).substr(2, 9)
        }])
        setInput('')
      }
    })
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">WebSocket Test</h3>
      <p className="mb-2">Status: <span className={`font-medium ${status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>{status}</span></p>
      
      <div className="mb-4">
        <div className="border rounded p-2 h-32 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="text-sm mb-1">
                <span className="text-gray-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>: {msg.text}
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={sendMessage}
          disabled={status !== 'connected'}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default WebSocketTest 