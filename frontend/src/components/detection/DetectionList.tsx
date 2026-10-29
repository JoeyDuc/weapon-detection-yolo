import { ScanLine } from 'lucide-react'
import type { Detection } from '../../types'
import { percent } from '../../lib/utils'
export function DetectionList({ detections }: { detections: Detection[] }) {
  return (
    <div className="detection-list">
      {detections.length ? (
        detections.map((d, i) => (
          <div className="detection-item" key={`${d.class_name}-${i}`}>
            <span className={`class-icon ${d.class_name}`}>
              <ScanLine size={18} />
            </span>
            <div>
              <strong>{d.class_name === 'knife' ? 'Knife' : 'Gun'}</strong>
              <div className="confidence-track">
                <span style={{ width: percent(d.confidence) }} />
              </div>
            </div>
            <span>{percent(d.confidence)}</span>
          </div>
        ))
      ) : (
        <div className="no-detections">
          <ScanLine size={23} strokeWidth={1.3} />
          <p>No objects to display</p>
          <small>Results will appear after analysis.</small>
        </div>
      )}
    </div>
  )
}
