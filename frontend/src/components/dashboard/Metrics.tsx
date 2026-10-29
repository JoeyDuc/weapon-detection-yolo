import { motion } from 'motion/react'
import { Activity, Bell, Layers, ScanLine, Target } from 'lucide-react'
import { Card } from '../shared/Common'
import type { Summary } from '../../types'
import { percent } from '../../lib/utils'
const metrics = [
  {
    key: 'total_analyses',
    label: 'Total analyses',
    icon: Layers,
    description: 'Across all input sources',
    color: 'purple',
  },
  {
    key: 'total_detections',
    label: 'Objects detected',
    icon: ScanLine,
    description: 'Model-generated indications',
    color: 'blue',
  },
  {
    key: 'alerts_generated',
    label: 'Alerts generated',
    icon: Bell,
    description: 'Confirmed for your review',
    color: 'amber',
  },
  {
    key: 'average_confidence',
    label: 'Average confidence',
    icon: Target,
    description: 'Across saved detections',
    color: 'green',
  },
] as const
export function Metrics({ summary, pending = false }: { summary?: Summary; pending?: boolean }) {
  return (
    <div className="metrics-grid">
      {metrics.map(({ key, label, icon: Icon, description, color }, i) => (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.045 }}
          key={key}
        >
          <Card className="metric-card">
            <div className="metric-top">
              <span>{label}</span>
              <span className={`metric-icon ${color}`}>
                <Icon size={17} strokeWidth={1.7} />
              </span>
            </div>
            <div className="metric-value">
              {summary
                ? key === 'average_confidence'
                  ? summary.total_detections
                    ? percent(summary[key])
                    : '—'
                  : summary[key].toLocaleString()
                : pending
                  ? '…'
                  : '—'}
              <span className="metric-spark">
                <Activity size={30} strokeWidth={1} />
              </span>
            </div>
            <p>{description}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
