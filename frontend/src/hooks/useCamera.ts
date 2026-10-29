import { useCallback, useEffect, useRef, useState } from 'react'
export function cameraError(error: unknown) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : ''
  return name === 'NotAllowedError'
    ? 'Camera access was denied. Allow camera access in your browser settings and try again.'
    : name === 'NotFoundError'
      ? 'No camera was found. Connect a camera and try again.'
      : name === 'NotReadableError'
        ? 'Your camera is in use by another app. Close that app and try again.'
        : 'The camera could not start. Check the connection and browser permissions.'
}
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const [active, setActive] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [devices, setDevices] = useState<MediaDeviceInfo[]>([]),
    [device, setDevice] = useState(''),
    [dimensions, setDimensions] = useState({ width: 16, height: 9 })
  const stop = useCallback(() => {
    generation.current++
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setActive(false)
    setPending(false)
  }, [])
  const start = useCallback(
    async (id?: string) => {
      stop()
      setError(null)
      setPending(true)
      const attempt = generation.current
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable')
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(id ? { deviceId: { exact: id } } : { facingMode: 'environment' }),
          },
        })
        if (attempt !== generation.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const track = stream.getVideoTracks()[0]
        track.addEventListener(
          'ended',
          () => {
            stop()
            setError('The camera disconnected. Reconnect it and start again.')
          },
          { once: true },
        )
        setDevice(track.getSettings().deviceId || '')
        setDevices(
          (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'),
        )
        setActive(true)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setDimensions({
            width: videoRef.current.videoWidth || 1280,
            height: videoRef.current.videoHeight || 720,
          })
        }
      } catch (e) {
        if (attempt === generation.current) {
          stop()
          setError(cameraError(e))
        }
      } finally {
        if (attempt === generation.current) setPending(false)
      }
    },
    [stop],
  )
  useEffect(
    () => () => {
      generation.current++
      streamRef.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )
  return { videoRef, active, pending, error, devices, device, dimensions, start, stop }
}
