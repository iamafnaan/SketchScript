import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Session from './pages/Session'
import { Toaster } from 'sonner'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/:sessionId" element={<Session />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App 