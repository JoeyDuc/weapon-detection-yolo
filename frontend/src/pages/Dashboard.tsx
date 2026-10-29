import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleDot,
  Command,
  Image,
  Layers,
  Plus,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react'
import {
  getSummary,
  getTimeline,
  getEvents,
  getModel,
  getHealth,
  getDistribution,
  asset,
} from '../services/api'
import {
  Card,
  SectionHeading,
  EmptyState,
  ErrorState,
  Badge,
  PageIntro,
  ModelNotice,
  TextLink,
} from '../components/shared/Common'
import { Button } from '../components/ui/button'
import { ActivityChart } from '../components/charts/ActivityChart'
import { formatDate, percent, download } from '../lib/utils'
import { Metrics } from '../components/dashboard/Metrics'
function VisionArtwork() {
  return (
    <div className="vision-art" aria-hidden="true">
      <div className="vision-orbit orbit-one" />
      <div className="vision-orbit orbit-two" />
      <div className="vision-orbit orbit-three" />
      <div className="vision-orbit orbit-four" />
      <div className="vision-eye">
        <div className="vision-iris">
          <div className="vision-pupil" />
        </div>
      </div>
      <span className="art-star star-one">✦</span>
      <span className="art-star star-two">✧</span>
      <span className="art-node node-one" />
      <span className="art-node node-two" />
      <span className="art-coordinate">INTELLIGENCE, IN FOCUS</span>
    </div>
  )
}
export default function Dashboard() {
  const [days, setDays] = useState(7)
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => getSummary() })
  const timeline = useQuery({ queryKey: ['timeline', days], queryFn: () => getTimeline(days) })
  const events = useQuery({
    queryKey: ['events', 'recent'],
    queryFn: () => getEvents({ page_size: 4 }),
  })
  const model = useQuery({ queryKey: ['model'], queryFn: getModel })
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth })
  const distribution = useQuery({
    queryKey: ['distribution', 30],
    queryFn: () => getDistribution(30),
  })
  return (
    <>
      <PageIntro
        title="Overview"
        description="Your visual intelligence workspace."
        action={
          <div className="intro-actions">
            <span className="date-label">
              <CalendarDays size={15} />
              {new Date().toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <Button asChild>
              <Link to="/image">
                <Plus size={16} />
                New analysis
              </Link>
            </Button>
          </div>
        }
      />
      <motion.section
        className="welcome-banner"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="welcome-copy">
          <span className="welcome-eyebrow">
            <Sparkles size={13} /> A LITTLE MORE CLARITY
          </span>
          <h2>
            See clearly.
            <br />
            Respond intelligently.
          </h2>
          <p>
            Turn images, video, and live moments into
            <br className="desktop-break" /> meaningful insights. All on your device.
          </p>
          <Button variant="outline" asChild>
            <Link to="/live">
              Explore live detection
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
        <VisionArtwork />
        <div className="banner-privacy">
          <ShieldCheck size={13} /> PRIVATE BY DESIGN
        </div>
      </motion.section>
      {summary.isError && <ErrorState error={summary.error} retry={() => summary.refetch()} />}
      <Metrics summary={summary.data} pending={summary.isPending} />
      <div className="dashboard-middle">
        <Card className="activity-card">
          <SectionHeading
            title="Detection activity"
            description="A little perspective on what your model sees."
            action={
              <select
                aria-label="Activity date range"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            }
          />
          <div className="chart-legend">
            <span>
              <i />
              Detections
            </span>
            <span className="chart-total">
              {timeline.data?.reduce((sum, d) => sum + d.detections, 0) ?? '—'}{' '}
              <small>in this period</small>
            </span>
          </div>
          {timeline.isError ? (
            <ErrorState error={timeline.error} />
          ) : (
            <ActivityChart data={timeline.data || []} />
          )}
          <div className="chart-footnote">
            <CircleDot size={13} />
            {summary.data?.total_detections
              ? 'Every data point comes from a saved detection.'
              : 'Your activity will appear here after your first analysis.'}
          </div>
        </Card>
        <Card className="categories-card">
          <SectionHeading
            title="Detection categories"
            description="A closer look at the last 30 days."
          />
          <div className="category-ring">
            <svg viewBox="0 0 160 160" aria-label="Object category distribution">
              <circle cx="80" cy="80" r="61" fill="none" stroke="var(--border)" strokeWidth="13" />
              {!!distribution.data?.categories.some((c) => c.value > 0) &&
                distribution.data.categories.map((c, i) => {
                  const total = distribution.data.categories.reduce((s, c) => s + c.value, 0)
                  const previous = distribution.data.categories
                    .slice(0, i)
                    .reduce((s, c) => s + c.value, 0)
                  return (
                    <circle
                      key={c.name}
                      cx="80"
                      cy="80"
                      r="61"
                      fill="none"
                      stroke={i === 0 ? '#9991ee' : '#f2b888'}
                      strokeWidth="13"
                      strokeDasharray={`${(c.value / total) * 383.3} 383.3`}
                      strokeDashoffset={(-previous / total) * 383.3}
                      transform="rotate(-90 80 80)"
                    />
                  )
                })}
            </svg>
            <div>
              <strong>
                {distribution.data?.categories.reduce((s, c) => s + c.value, 0) ?? '—'}
              </strong>
              <span>total detections</span>
            </div>
          </div>
          <div className="category-list">
            {['knife', 'gun'].map((name, i) => (
              <div key={name}>
                <span>
                  <i style={{ background: i ? '#edb788' : '#aaa0ed' }} />
                  {name === 'knife' ? 'Knife' : 'Gun'}
                </span>
                <strong>
                  {distribution.data?.categories.find((c) => c.name === name)?.value ?? '—'}
                </strong>
                <small>
                  {model.data?.supported_classes.includes(name) ? 'Supported' : 'Model required'}
                </small>
              </div>
            ))}
          </div>
          {distribution.isError && <p className="small-error">Category data unavailable.</p>}
          <p className="category-note">Frequency is not a measure of model accuracy.</p>
        </Card>
      </div>
      <div className="section-heading quick-heading">
        <div>
          <h2>What would you like to explore?</h2>
          <p>Three ways to bring your visual world into focus.</p>
        </div>
        <span className="local-processing">
          <ShieldCheck size={14} />
          100% local processing
        </span>
      </div>
      <div className="quick-actions">
        {[
          {
            to: '/live',
            icon: Video,
            title: 'Go live',
            subtitle: 'Clarity, in real time.',
            description: 'Connect your camera and see the moment.',
            color: 'purple',
            label: 'Start live detection',
          },
          {
            to: '/video',
            icon: Layers,
            title: 'Analyze a video',
            subtitle: 'Every frame tells a story.',
            description: 'Upload a clip. Discover what’s inside.',
            color: 'blue',
            label: 'Upload video',
          },
          {
            to: '/image',
            icon: Image,
            title: 'Explore an image',
            subtitle: 'A fresh perspective.',
            description: 'Find the details in a single image.',
            color: 'peach',
            label: 'Upload image',
          },
        ].map(({ to, icon: Icon, title, subtitle, description, color, label }) => (
          <Link key={to} to={to} className={`quick-card quick-${color}`}>
            <div className="quick-card-top">
              <span className="quick-icon">
                <Icon size={22} strokeWidth={1.5} />
              </span>
              <ArrowUpRight size={18} />
            </div>
            <h3>{title}</h3>
            <p>
              {subtitle}
              <br />
              <span>{description}</span>
            </p>
            <span className="quick-link">
              {label}
              <ArrowRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      <div className="dashboard-bottom">
        <Card className="recent-card">
          <SectionHeading
            title="Recent events"
            description="The latest moments worth a closer look."
            action={<TextLink to="/history">View history</TextLink>}
          />
          {events.isError ? (
            <ErrorState error={events.error} />
          ) : events.data?.items.length ? (
            <div className="recent-list">
              {events.data.items.map((event) => (
                <Link to={`/history?event=${event.id}`} className="recent-event" key={event.id}>
                  {event.evidence_url ? (
                    <img src={asset(event.evidence_url)} alt={`${event.class_name} evidence`} />
                  ) : (
                    <span className="event-placeholder">
                      <Image size={19} />
                    </span>
                  )}
                  <div>
                    <strong>
                      {event.class_name === 'knife' ? 'Knife' : 'Gun'} detected{' '}
                      <Badge tone={event.is_alert ? 'warning' : 'neutral'}>
                        {event.is_alert ? 'Review' : 'Detection'}
                      </Badge>
                    </strong>
                    <span>
                      {event.source_type} analysis <b>·</b> {formatDate(event.timestamp)}
                    </span>
                  </div>
                  <span className="event-confidence">{percent(event.confidence)}</span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Activity}
              title="A fresh start"
              description="Your recent detections will appear here. Start an analysis to see what’s possible."
              action={
                <Link to="/image" className="text-link">
                  Analyze your first image
                  <ArrowRight size={14} />
                </Link>
              }
            />
          )}
        </Card>
        <Card className="system-card">
          <SectionHeading
            title="Your local system"
            action={
              <span className="system-heading-icon">
                <Command size={16} />
              </span>
            }
          />
          <div className="system-rows">
            <div>
              <span>Backend</span>
              <span>
                <i className={`status-dot ${health.data ? 'green' : 'amber'}`} />
                {health.data ? 'Connected' : health.isPending ? 'Connecting' : 'Offline'}
              </span>
            </div>
            <div>
              <span>Detection model</span>
              <span>
                <i className={`status-dot ${model.data?.ready ? 'green' : 'amber'}`} />
                {model.data?.ready ? 'Ready' : 'Setup needed'}
              </span>
            </div>
            <div>
              <span>Inference device</span>
              <strong>
                {model.data?.ready ? model.data.device.toUpperCase() : 'Not initialized'}
              </strong>
            </div>
            <div>
              <span>Active checkpoint</span>
              <strong title={model.data?.checkpoint}>
                {model.data?.checkpoint.split('/').pop() || 'Not connected'}
              </strong>
            </div>
            <div>
              <span>Supported classes</span>
              <strong>{model.data?.supported_classes.join(', ') || 'None loaded'}</strong>
            </div>
          </div>
          <Link to="/settings" className="system-settings">
            Manage configuration
            <ArrowUpRight size={14} />
          </Link>
          <div className="system-private">
            <Check size={13} />
            Your data never leaves this device.
          </div>
        </Card>
      </div>
      <ModelNotice />
      <button
        className="export-dashboard"
        disabled={!summary.data}
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob(
              [JSON.stringify({ summary: summary.data, timeline: timeline.data }, null, 2)],
              { type: 'application/json' },
            ),
          )
          download(url, 'aegis-workspace.json')
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }}
      >
        <ArrowDownToLine size={13} />
        Export workspace summary
      </button>
    </>
  )
}
