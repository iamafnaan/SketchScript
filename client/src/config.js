const config = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  WS_URL: (() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    // Remove http/https protocol prefix if it exists and replace with appropriate WebSocket protocol
    if (wsUrl.startsWith('https://')) {
      return wsUrl.replace('https://', 'wss://')
    } else if (wsUrl.startsWith('http://')) {
      return wsUrl.replace('http://', 'ws://')
    }
    return wsUrl
  })(),
  ENV: import.meta.env.MODE || 'development'
}

export default config
