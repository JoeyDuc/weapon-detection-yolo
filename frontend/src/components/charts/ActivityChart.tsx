import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import type { Timeline } from '../../types'
export function ActivityChart({
  data,
  metric = 'detections',
  height = 235,
}: {
  data: Timeline
  metric?: 'detections' | 'alerts' | 'analyses'
  height?: number
}) {
  return (
    <div className="chart-wrap" style={{ height }} aria-label={`${metric} over time`} role="img">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 12, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7874ee" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#7874ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickMargin={13}
            tickFormatter={(v) =>
              new Date(v + 'T12:00:00').toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })
            }
            minTickGap={25}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (max: number) => Math.max(4, max)]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface)',
              fontSize: 12,
            }}
            labelFormatter={(v) => String(v)}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke="#7771e9"
            strokeWidth={2.5}
            fill={`url(#area-${metric})`}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
export function DistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="chart-wrap" style={{ height: 210 }} role="img" aria-label="Distribution chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -25, right: 8, bottom: 5 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              borderRadius: 10,
              border: '1px solid var(--border)',
            }}
          />
          <Bar dataKey="value" fill="#8b85ec" radius={[5, 5, 0, 0]} maxBarSize={45} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
