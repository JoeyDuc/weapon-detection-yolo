import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useWebSocket } from './useWebSocket'
import type { Detection, DetectionEvent } from '../types'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
export function useDetection(video: RefObject<HTMLVideoElement | null>, confidence: number) {
  const [running, setRunning] = useState(false),
    [detections, setDetections] = useState<Detection[]>([]),
    [alerts, setAlerts] = useState<DetectionEvent[]>([]),
    [latency, setLatency] = useState(0),
    [error, setError] = useState<string | null>(null)
  const busy = useRef(false),
    sentAt = useRef(0),
    active = useRef(false),
    capture = useRef(document.createElement('canvas'))
  const client = useQueryClient()
  const message = useCallback(
    (data: Record<string, unknown>) => {
      if (data.type === 'result') {
        busy.current = false
        if (!active.current) return
        setDetections(data.detections as Detection[])
        setLatency(data.latency_ms as number)
        const newAlerts = data.alerts as DetectionEvent[]
        if (newAlerts.length) {
          setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20))
          newAlerts.forEach((a) =>
            toast.info(
              `${a.class_name} indication · ${Math.round(a.confidence * 100)}% confidence`,
              { description: 'A confirmed model indication is ready for human review.' },
            ),
          )
          for (const key of ['events', 'summary', 'timeline', 'distribution'])
            client.invalidateQueries({ queryKey: [key] })
        }
      }
      if (data.type === 'error') {
        busy.current = false
        setError(String(data.message))
        setRunning(false)
        active.current = false
      }
    },
    [client],
  )
  const ws = useWebSocket(message)
  const pause = useCallback(() => {
    active.current = false
    setRunning(false)
    setDetections([])
  }, [])
  const stop = useCallback(() => {
    pause()
    ws.disconnect()
    busy.current = false
  }, [pause, ws.disconnect])
  const start = () => {
    setError(null)
    setRunning(true)
    active.current = true
    if (ws.status !== 'open') {
      busy.current = false
      ws.connect()
    } else ws.send({ type: 'reset' })
  }
  useEffect(() => {
    if (ws.status === 'closed' && running) {
      setRunning(false)
      active.current = false
      busy.current = false
    }
  }, [ws.status, running])
  useEffect(() => {
    if (!running || ws.status !== 'open') return
    const timer = setInterval(() => {
      if (busy.current) {
        if (Date.now() - sentAt.current > 20000) {
          setError('Inference timed out. Restart detection to reconnect.')
          stop()
        }
        return
      }
      const element = video.current
      if (!element || element.readyState < 2 || !element.videoWidth) return
      const scale = Math.min(1, 960 / element.videoWidth)
      const canvas = capture.current
      canvas.width = Math.round(element.videoWidth * scale)
      canvas.height = Math.round(element.videoHeight * scale)
      canvas.getContext('2d')?.drawImage(element, 0, 0, canvas.width, canvas.height)
      busy.current = ws.send({
        type: 'frame',
        frame: canvas.toDataURL('image/jpeg', 0.75).split(',')[1],
        confidence,
      })
      sentAt.current = Date.now()
    }, 250)
    return () => clearInterval(timer)
  }, [running, ws.status, ws.send, confidence, video, stop])
  useEffect(() => {
    if (!running && ws.status === 'open') ws.send({ type: 'reset' })
  }, [running, ws.status, ws.send])
  return {
    running,
    detections,
    alerts,
    latency,
    error: error || ws.error,
    status: ws.status,
    start,
    pause,
    stop,
  }
}
