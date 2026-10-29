import type { ReactNode, ElementType } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronRight,
  Loader2,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { getModel, errorMessage } from '../../services/api'
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}
export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}
export function EmptyState({
  icon: Icon = ScanLine,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ElementType
  title: string
  description: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <div className="empty-icon">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="error-state">
      <AlertCircle size={19} />
      <div>
        <strong>We couldn’t load this</strong>
        <p>{errorMessage(error)}</p>
      </div>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  )
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <Loader2 className="spin" size={22} /> Loading your workspace…
    </div>
  )
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'purple' | 'coral'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
export function ModelNotice() {
  const { data } = useQuery({ queryKey: ['model'], queryFn: getModel })
  if (!data || (data.ready && !data.limitation)) return null
  return (
    <div className="model-notice">
      <div className="notice-symbol">
        <ScanLine size={20} />
      </div>
      <div>
        <strong>
          {data.ready ? 'Know your model’s scope' : 'A little setup. A clearer picture.'}
        </strong>
        <p>
          {data.ready
            ? data.limitation
            : 'Add a YOLO checkpoint to start analyzing. Your workspace is ready when you are.'}
        </p>
      </div>
      <Link to="/settings" className="text-link">
        {data.ready ? 'Model details' : 'Set up model'}
        <ChevronRight size={16} />
      </Link>
    </div>
  )
}
export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <ShieldCheck size={15} />
      <span>Processed locally. Your images stay yours.</span>
    </div>
  )
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  busy = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  busy?: boolean
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && !busy && onClose()}
      title={title}
      description={description}
    >
      <div className="dialog-actions">
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Keep data
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={busy}>
          {busy ? <Loader2 className="spin" size={16} /> : null} Delete
        </Button>
      </div>
    </Dialog>
  )
}
export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  )
}
export function SavedIndicator() {
  return (
    <span className="saved-indicator">
      <Check size={14} /> Saved locally
    </span>
  )
}
