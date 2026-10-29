import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Check, Film, Loader2, Play, ScanLine, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  api,
  uploadVideo,
  getVideo,
  getEvents,
  getModel,
  errorMessage,
  asset,
} from '../services/api'
import { Button } from '../components/ui/button'
import {
  Card,
  PageIntro,
  ModelNotice,
  SectionHeading,
  Badge,
  PrivacyNote,
} from '../components/shared/Common'
import { UploadZone } from '../components/detection/UploadZone'
import type { VideoJob } from '../types'
import { percent } from '../lib/utils'
export default function VideoAnalysis() {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [job, setJob] = useState<VideoJob | null>(null),
    [uploading, setUploading] = useState(false),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState<string | null>(null),
    [savedId, setSavedId] = useState<string | null>(() => localStorage.getItem('aegis-video-job'))
  const controller = useRef<AbortController | null>(null),
    player = useRef<HTMLVideoElement>(null)
  const client = useQueryClient()
  const model = useQuery({ queryKey: ['model'], queryFn: getModel })
  const polling = useQuery({
    queryKey: ['video', job?.id || savedId],
    queryFn: () => getVideo((job?.id || savedId)!),
    enabled: !!(job?.id || savedId),
    refetchInterval: (q) =>
      ['processing', 'cancelling'].includes(q.state.data?.status || job?.status || '')
        ? 1000
        : false,
  })
  const current = polling.data || job
  const events = useQuery({
    queryKey: ['events', 'video', current?.id, current?.status],
    queryFn: () => getEvents({ job_id: current!.id, page_size: 100, sort: 'asc' }),
    enabled: !!current?.id,
  })
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    if (current?.status === 'completed') {
      for (const key of ['events', 'summary', 'timeline', 'distribution'])
        client.invalidateQueries({ queryKey: [key] })
    }
  }, [current?.status, client])
  const clearJob = () => {
    setJob(null)
    setSavedId(null)
    localStorage.removeItem('aegis-video-job')
  }
  const choose = (f: File) => {
    setFile(f)
    clearJob()
    setError(null)
    setProgress(0)
  }
  const start = async () => {
    if (!file && !current) return
    setError(null)
    setBusy(true)
    try {
      let uploaded = current
      if (!uploaded) {
        setUploading(true)
        controller.current = new AbortController()
        uploaded = await uploadVideo(file!, setProgress, controller.current.signal)
        setJob(uploaded)
        setSavedId(uploaded.id)
        localStorage.setItem('aegis-video-job', uploaded.id)
        setUploading(false)
      }
      const result = (await api.post<VideoJob>(`/api/videos/${uploaded.id}/start`)).data
      setJob(result)
      client.setQueryData(['video', result.id], result)
    } catch (e) {
      if (!controller.current?.signal.aborted) {
        setError(errorMessage(e))
        toast.error(errorMessage(e))
      }
    } finally {
      setUploading(false)
      setBusy(false)
    }
  }
  const cancel = async () => {
    if (uploading) {
      controller.current?.abort()
      return
    }
    if (!current) return
    setBusy(true)
    try {
      const result = (await api.post<VideoJob>(`/api/videos/${current.id}/cancel`)).data
      setJob(result)
      client.setQueryData(['video', result.id], result)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const processing = current?.status === 'processing' || current?.status === 'cancelling'
  return (
    <>
      <PageIntro
        title="Video Analysis"
        description="Every frame tells a story. Take a closer look."
        action={
          <Badge tone="purple">
            <Film size={13} />
            Video workspace
          </Badge>
        }
      />
      <ModelNotice />
      <div className="analysis-layout">
        <div>
          <Card className="preview-card">
            <SectionHeading
              title={file?.name || current?.original_filename || 'Your video workspace'}
              description={
                file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${current?.status === 'completed' ? 'Annotated output' : 'Source video'}`
                  : 'From a passing moment to a useful insight.'
              }
              action={
                (file || current) &&
                !busy &&
                !processing && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove video"
                    onClick={() => {
                      setFile(null)
                      clearJob()
                    }}
                  >
                    <X size={17} />
                  </Button>
                )
              }
            />
            {file || current ? (
              <div className="video-stage">
                {preview || current?.output_url ? (
                  <video
                    ref={player}
                    key={current?.output_url || preview}
                    src={current?.output_url ? asset(current.output_url) : preview}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() =>
                      setError(
                        'Your browser could not play this codec. Convert the source to H.264 MP4 and retry.',
                      )
                    }
                  />
                ) : (
                  <div className="restored-video">
                    <Film size={28} />
                    <p>
                      {current?.status === 'completed'
                        ? 'Your video is ready.'
                        : 'Your saved video job is ready below.'}
                    </p>
                    <Badge>{current?.status}</Badge>
                  </div>
                )}
              </div>
            ) : (
              <UploadZone kind="video" onFile={choose} />
            )}
            <PrivacyNote />
          </Card>
          {current && (
            <Card className="video-timeline">
              <SectionHeading
                title="Detection timeline"
                description="Confirmed events at their moment in the video."
                action={<Badge>{events.data?.total || 0} events</Badge>}
              />
              {events.data?.items.length ? (
                <div className="timeline-items">
                  {events.data.items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => {
                        if (player.current) {
                          player.current.currentTime = e.video_time || 0
                          player.current.play().catch(() => {})
                        }
                      }}
                    >
                      <span className="timeline-time">
                        {Math.floor((e.video_time || 0) / 60)}:
                        {String(Math.floor((e.video_time || 0) % 60)).padStart(2, '0')}
                      </span>
                      <span>{e.class_name}</span>
                      <Badge>{percent(e.confidence)}</Badge>
                      <Play size={13} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="panel-empty-copy">
                  {processing
                    ? 'Confirmed detections appear here as processing continues.'
                    : 'No confirmed detection events in this video.'}
                </p>
              )}
            </Card>
          )}
        </div>
        <div className="analysis-side">
          <Card>
            <SectionHeading title="Analysis controls" action={<ScanLine size={17} />} />
            <div className="control-content">
              <div className="detail-row">
                <span>Input</span>
                <strong>{file ? 'Video file' : 'No file selected'}</strong>
              </div>
              <div className="detail-row">
                <span>Processing</span>
                <strong>Local, frame by frame</strong>
              </div>
              <div className="detail-row">
                <span>Output</span>
                <strong>H.264 MP4 · no audio</strong>
              </div>
              <div className="settings-divider" />
              {current && (
                <>
                  <div className="detail-row">
                    <span>Duration</span>
                    <strong>{current.media_metadata.duration.toFixed(1)} seconds</strong>
                  </div>
                  <div className="detail-row">
                    <span>Resolution</span>
                    <strong>
                      {current.media_metadata.width} × {current.media_metadata.height}
                    </strong>
                  </div>
                  <div className="detail-row">
                    <span>Job status</span>
                    <Badge
                      tone={
                        current.status === 'completed'
                          ? 'success'
                          : current.status === 'failed'
                            ? 'warning'
                            : 'purple'
                      }
                    >
                      {current.status}
                    </Badge>
                  </div>
                </>
              )}
              {(uploading || processing) && (
                <div className="progress-section">
                  <div>
                    <span>
                      {uploading
                        ? 'Uploading'
                        : current?.status === 'cancelling'
                          ? 'Cancelling…'
                          : 'Analyzing frames'}
                    </span>
                    <strong>{Math.round(uploading ? progress : current?.progress || 0)}%</strong>
                  </div>
                  <progress max="100" value={uploading ? progress : current?.progress || 0} />
                </div>
              )}
              {!processing &&
                !uploading &&
                current?.status !== 'completed' &&
                !['cancelled', 'failed'].includes(current?.status || '') && (
                  <Button
                    className="full-width"
                    onClick={start}
                    disabled={(!file && !current) || busy || !model.data?.ready}
                  >
                    {busy ? <Loader2 className="spin" size={16} /> : <Play size={16} />}Start
                    analysis
                  </Button>
                )}
              {(processing || uploading) && (
                <Button
                  variant="outline"
                  className="full-width"
                  disabled={current?.status === 'cancelling'}
                  onClick={cancel}
                >
                  <Square size={14} />
                  Cancel analysis
                </Button>
              )}
              {current?.status === 'completed' && (
                <Button className="full-width" asChild>
                  <a href={asset(`/api/videos/${current.id}/download`)} download>
                    <ArrowDownToLine size={16} />
                    Download video
                  </a>
                </Button>
              )}
              {(current?.status === 'failed' || current?.status === 'cancelled') && (
                <Button
                  variant="outline"
                  className="full-width"
                  onClick={() => {
                    clearJob()
                    setFile(null)
                    setError(null)
                  }}
                >
                  Prepare a new analysis
                </Button>
              )}
              {(error || current?.error_message) && (
                <p className="inline-error" role="alert">
                  {error || current?.error_message}
                </p>
              )}
              {polling.isError && (
                <p role="alert" className="inline-error">
                  {errorMessage(polling.error)}
                  <button onClick={() => polling.refetch()}>Retry status</button>
                </p>
              )}
            </div>
          </Card>
          <div className="soft-note">
            <span>
              <Check size={15} />
              Good things take a moment
            </span>
            <p>
              Videos are processed in the background, one frame at a time. Keep the backend running
              until your video is ready.
            </p>
          </div>
          <div className="soft-note plain">
            <span>About your output</span>
            <p>
              Output is capped at 1920 px and has no audio. Browser playback needs H.264 encoding
              through OpenCV or FFmpeg.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
