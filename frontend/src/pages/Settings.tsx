import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Command,
  HardDrive,
  Loader2,
  Monitor,
  Moon,
  RefreshCw,
  Save,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api, getSettings, patchSettings, getModel, errorMessage } from '../services/api'
import { usePreferences } from '../stores/preferences'
import {
  Card,
  PageIntro,
  SectionHeading,
  ErrorState,
  Loading,
  Badge,
  ConfirmDialog,
} from '../components/shared/Common'
import { Button } from '../components/ui/button'
const schema = z.object({
  confidence: z.number().min(0.05).max(1),
  iou: z.number().min(0.05).max(1),
  image_size: z.number().int().min(320).max(1280).multipleOf(32),
  device: z.enum(['auto', 'cpu', 'mps']),
  confirmation_frames: z.number().int().min(1).max(30),
  alert_cooldown: z.number().min(1).max(300),
  show_boxes: z.boolean(),
  show_labels: z.boolean(),
})
type FormValues = z.infer<typeof schema>
export default function Settings() {
  const client = useQueryClient(),
    settings = useQuery({ queryKey: ['settings'], queryFn: getSettings }),
    model = useQuery({ queryKey: ['model'], queryFn: getModel })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (settings.data) reset(settings.data)
  }, [settings.data, reset])
  const [deleting, setDeleting] = useState<'history' | 'evidence' | 'temporary' | null>(null)
  const { theme, setTheme } = usePreferences()
  const save = useMutation({
    mutationFn: patchSettings,
    onSuccess: (data) => {
      client.setQueryData(['settings'], data)
      reset(data)
      toast.success('Your detection settings are saved.')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const reload = useMutation({
    mutationFn: () => api.post('/api/model/reload'),
    onSuccess: (r) => {
      client.setQueryData(['model'], r.data)
      r.data.ready ? toast.success('Model loaded and ready.') : toast.error(r.data.error)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const maintenance = useMutation({
    mutationFn: () => api.post('/api/settings/maintenance', { action: deleting, confirm: true }),
    onSuccess: () => {
      setDeleting(null)
      client.invalidateQueries()
      toast.success('Local data updated.')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return (
    <>
      <PageIntro
        title="Settings"
        description="Make this workspace feel like yours."
        action={
          <Badge tone="purple">
            <SlidersHorizontal size={13} />
            Your preferences
          </Badge>
        }
      />
      <div className="settings-layout">
        <div className="settings-main">
          <Card>
            <SectionHeading
              title="Detection preferences"
              description="A thoughtful balance of sensitivity and confidence."
              action={<SlidersHorizontal size={18} />}
            />
            {settings.isPending ? (
              <Loading />
            ) : settings.isError ? (
              <ErrorState error={settings.error} retry={() => settings.refetch()} />
            ) : (
              <form
                className="settings-form"
                onSubmit={handleSubmit((values) => save.mutate(values))}
              >
                <div className="form-grid">
                  <label className="form-label">
                    Confidence threshold
                    <input
                      aria-label="Confidence threshold"
                      type="number"
                      min=".05"
                      max="1"
                      step=".01"
                      {...register('confidence', { valueAsNumber: true })}
                    />
                    <small>Minimum confidence, from 0.05 to 1.</small>
                  </label>
                  <label className="form-label">
                    IoU threshold
                    <input
                      type="number"
                      min=".05"
                      max="1"
                      step=".01"
                      {...register('iou', { valueAsNumber: true })}
                    />
                    <small>Controls overlap suppression.</small>
                  </label>
                  <label className="form-label">
                    Input resolution
                    <select {...register('image_size', { valueAsNumber: true })}>
                      {[320, 416, 512, 640, 768, 960, 1280].map((n) => (
                        <option value={n} key={n}>
                          {n} px
                        </option>
                      ))}
                    </select>
                    <small>Higher resolutions need more compute.</small>
                  </label>
                  <label className="form-label">
                    Inference device
                    <select {...register('device')}>
                      <option value="auto">Auto select</option>
                      <option value="cpu">CPU</option>
                      <option value="mps">Apple Silicon · MPS</option>
                    </select>
                    <small>Unavailable MPS falls back to CPU.</small>
                  </label>
                  <label className="form-label">
                    Confirmation frames
                    <input
                      type="number"
                      min="1"
                      max="30"
                      {...register('confirmation_frames', { valueAsNumber: true })}
                    />
                    <small>Consecutive positive frames for an alert.</small>
                  </label>
                  <label className="form-label">
                    Alert cooldown
                    <input
                      type="number"
                      min="1"
                      max="300"
                      {...register('alert_cooldown', { valueAsNumber: true })}
                    />
                    <small>Seconds between alerts for each class.</small>
                  </label>
                </div>
                <div className="settings-divider" />
                <label className="toggle-row">
                  Show bounding boxes by default
                  <input type="checkbox" {...register('show_boxes')} />
                </label>
                <label className="toggle-row">
                  Show confidence labels by default
                  <input type="checkbox" {...register('show_labels')} />
                </label>
                {Object.keys(errors).length > 0 && (
                  <p role="alert" className="inline-error">
                    Check the field ranges. Input size must be a multiple of 32.
                  </p>
                )}
                <div className="form-footer">
                  <span>
                    {isDirty ? 'You have unsaved changes.' : 'Preferences are up to date.'}
                  </span>
                  <Button type="submit" disabled={!isDirty || save.isPending}>
                    {save.isPending ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                    Save changes
                  </Button>
                </div>
              </form>
            )}
          </Card>
          <Card className="appearance-card">
            <SectionHeading title="Appearance" description="The right light for your workspace." />
            <div className="theme-options">
              {(
                [
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ] as const
              ).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  aria-pressed={theme === value}
                  className={theme === value ? 'selected' : ''}
                  onClick={() => setTheme(value)}
                >
                  <div className={`theme-preview theme-preview-${value}`}>
                    <i />
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>
                    <Icon size={15} />
                    {label}
                    {theme === value && <Check size={14} />}
                  </strong>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Local data"
              description="Your workspace, your control."
              action={<HardDrive size={17} />}
            />
            <div className="data-actions">
              {[
                {
                  key: 'temporary',
                  title: 'Remove temporary files',
                  description: 'Clear processing files left after interrupted jobs.',
                },
                {
                  key: 'evidence',
                  title: 'Delete evidence images',
                  description: 'Keep detection records and remove their snapshots.',
                },
                {
                  key: 'history',
                  title: 'Clear all workspace data',
                  description: 'Permanently remove analyses, events, uploads, and outputs.',
                },
              ].map((item) => (
                <div key={item.key}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleting(item.key as typeof deleting)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="settings-aside">
          <Card className="model-settings-card">
            <SectionHeading title="Your detection model" action={<Command size={18} />} />
            {model.isError ? (
              <ErrorState error={model.error} />
            ) : (
              <div className="control-content">
                <Badge tone={model.data?.ready ? 'success' : 'warning'}>
                  <span className={`status-dot ${model.data?.ready ? 'green' : 'amber'}`} />
                  {model.data?.ready ? 'Ready to analyze' : 'Checkpoint needed'}
                </Badge>
                <label className="model-path-label">
                  Checkpoint path<code>{model.data?.checkpoint || 'Connecting…'}</code>
                </label>
                <div className="detail-row">
                  <span>Supported classes</span>
                  <strong>{model.data?.supported_classes.join(', ') || 'None loaded'}</strong>
                </div>
                <div className="detail-row">
                  <span>Active device</span>
                  <strong>{model.data?.device.toUpperCase() || '—'}</strong>
                </div>
                <div className="detail-row">
                  <span>Available devices</span>
                  <strong>{model.data?.available_devices.join(', ') || '—'}</strong>
                </div>
                {model.data?.error && (
                  <p className="model-error">
                    <strong>Loading status</strong>
                    {model.data.error}
                  </p>
                )}
                {model.data?.limitation && (
                  <p className="field-help model-limitation">{model.data.limitation}</p>
                )}
                <Button
                  className="full-width"
                  variant="outline"
                  disabled={reload.isPending || !model.data}
                  onClick={() => reload.mutate()}
                >
                  <RefreshCw size={15} className={reload.isPending ? 'spin' : ''} />
                  {reload.isPending ? 'Loading checkpoint…' : 'Reload model'}
                </Button>
                <p className="field-help">
                  Set AEGIS_CHECKPOINT in backend/.env to use a different trusted local checkpoint.
                  Restart the backend after changing this path.
                </p>
              </div>
            )}
          </Card>
          <div className="soft-note">
            <span>
              <Check size={15} />
              Human judgment comes first
            </span>
            <p>
              Alert defaults are starting points, not validated safety thresholds. Consecutive
              frames confirm a class, without tracking the same object.
            </p>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => maintenance.mutate()}
        busy={maintenance.isPending}
        title={
          deleting === 'history'
            ? 'Clear your workspace?'
            : deleting === 'evidence'
              ? 'Delete evidence images?'
              : 'Remove temporary files?'
        }
        description="This deletion is permanent. Make sure you have exported any files you want to keep."
      />
    </>
  )
}
