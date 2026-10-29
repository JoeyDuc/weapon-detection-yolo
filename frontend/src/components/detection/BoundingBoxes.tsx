import { useEffect, useRef } from 'react'
import type { Detection } from '../../types'
export function BoundingBoxes({
  detections,
  labels = true,
  visible = true,
  mirrored = false,
}: {
  detections: Detection[]
  labels?: boolean
  visible?: boolean
  mirrored?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      const dpr = devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)
      if (!visible) return
      for (const d of detections) {
        let [x1, y1, x2, y2] = d.bounding_box
        if (mirrored) [x1, x2] = [1 - x2, 1 - x1]
        const x = x1 * width,
          y = y1 * height,
          w = (x2 - x1) * width,
          h = (y2 - y1) * height
        const color = d.class_name === 'knife' ? '#e6a544' : '#ed8984'
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(x, y, w, h)
        if (labels) {
          const text = `${d.class_name}  ${Math.round(d.confidence * 100)}%`
          ctx.font = '600 12px Inter, sans-serif'
          const tw = ctx.measureText(text).width + 16
          const ty = Math.max(0, y - 27)
          ctx.fillStyle = color
          ctx.fillRect(Math.min(x, width - tw), ty, tw, 24)
          ctx.fillStyle = '#201b27'
          ctx.fillText(text, Math.min(x, width - tw) + 8, ty + 16)
        }
      }
    }
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    draw()
    return () => observer.disconnect()
  }, [detections, labels, visible, mirrored])
  return (
    <canvas
      ref={ref}
      className="bbox-canvas"
      aria-label={`${detections.length} detection bounding boxes`}
    />
  )
}
