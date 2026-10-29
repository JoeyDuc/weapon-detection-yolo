import { useCallback, useEffect, useRef, useState } from 'react'
import { websocketUrl } from '../services/api'
export function useWebSocket(onMessage: (data: Record<string, unknown>) => void) {
  const socket = useRef<WebSocket | null>(null),
    callback = useRef(onMessage),
    connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  callback.current = onMessage
  const [status, setStatus] = useState<'closed' | 'connecting' | 'open'>('closed'),
    [error, setError] = useState<string | null>(null)
  const disconnect = useCallback(() => {
    if (connectionTimer.current) clearTimeout(connectionTimer.current)
    connectionTimer.current = null
    if (socket.current) {
      socket.current.onopen = null
      socket.current.onclose = null
      socket.current.onmessage = null
      socket.current.onerror = null
      socket.current.close()
      socket.current = null
    }
    setStatus('closed')
  }, [])
  const connect = useCallback(() => {
    disconnect()
    setError(null)
    setStatus('connecting')
    const ws = new WebSocket(websocketUrl())
    socket.current = ws
    const timeout = setTimeout(() => {
      if (socket.current === ws && ws.readyState !== WebSocket.OPEN) {
        setError('The detection connection timed out. Check your backend.')
        disconnect()
      }
    }, 10000)
    connectionTimer.current = timeout
    ws.onopen = () => {
      if (socket.current !== ws) return
      clearTimeout(timeout)
      setStatus('open')
    }
    ws.onmessage = (e) => {
      try {
        callback.current(JSON.parse(e.data))
      } catch {
        setError('The backend returned an invalid response.')
      }
    }
    ws.onerror = () =>
      setError('Could not connect to live detection. Make sure the backend is running.')
    ws.onclose = () => {
      clearTimeout(timeout)
      if (socket.current === ws) {
        socket.current = null
        setStatus('closed')
        setError('Live detection disconnected. Start detection to reconnect.')
      }
    }
  }, [disconnect])
  const send = useCallback((data: unknown) => {
    if (socket.current?.readyState !== WebSocket.OPEN || socket.current.bufferedAmount > 0)
      return false
    socket.current.send(JSON.stringify(data))
    return true
  }, [])
  useEffect(() => disconnect, [disconnect])
  return { status, error, connect, disconnect, send }
}
