import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownToLine,
  Check,
  Image,
  Loader2,
  RefreshCw,
  ScanLine,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { analyzeImage, getModel, getSettings, errorMessage, asset } from '../services/api'
import {
  Card,
  PageIntro,
  ModelNotice,
  SectionHeading,
  Badge,
  PrivacyNote,
  SavedIndicator,
} from '../components/shared/Common'
import { Button } from '../components/ui/button'
import { UploadZone } from '../components/detection/UploadZone'
import { BoundingBoxes } from '../components/detection/BoundingBoxes'
import { DetectionList } from '../components/detection/DetectionList'
import { percent } from '../lib/utils'
export default function ImageAnalysis() {
  const [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(''),
    [confidence, setConfidence] = useState(0.5),
    [progress, setProgress] = useState(0),
    [boxes, setBoxes] = useState(true),
    [labels, setLabels] = useState(true)
  const client = useQueryClient()
  const model = useQuery({ queryKey: ['model'], queryFn: getModel })
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  useEffect(() => {
    if (settings.data) {
      setConfidence(settings.data.confidence)
      setBoxes(settings.data.show_boxes)
      setLabels(settings.data.show_labels)
    }
  }, [settings.data])
  useEffect(() => {
    if (!file) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const mutation = useMutation({
    mutationFn: () => analyzeImage(file!, confidence, setProgress),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['summary'] })
      client.invalidateQueries({ queryKey: ['events'] })
      client.invalidateQueries({ queryKey: ['timeline'] })
      client.invalidateQueries({ queryKey: ['distribution'] })
      toast.success('Analysis saved to your local workspace.')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const choose = (f: File) => {
    setFile(f)
    mutation.reset()
    setProgress(0)
  }
  const result = mutation.data
  return (
    <>
      <PageIntro
        title="Image Analysis"
        description="One image. A little more understanding."
        action={
          <Badge tone="purple">
            <Image size={13} />
            Image workspace
          </Badge>
        }
      />
      <ModelNotice />
      <div className="analysis-layout">
        <Card className="preview-card">
          <SectionHeading
            title={file ? file.name : 'Your canvas'}
            description={
              file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Original image`
                : 'Bring a single moment into focus.'
            }
            action={
              file && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={mutation.isPending}
                  aria-label="Remove image"
                  onClick={() => {
                    setFile(null)
                    mutation.reset()
                  }}
                >
                  <X size={17} />
                </Button>
              )
            }
          />
          {file ? (
            <>
              <div className="media-stage image-stage">
                <div className="image-overlay-wrap">
                  <img src={preview} alt="Image selected for analysis" />
                  <BoundingBoxes
                    detections={result?.detections || []}
                    visible={boxes}
                    labels={labels}
                  />
                </div>
                {mutation.isPending && (
                  <div className="processing-overlay">
                    <Loader2 className="spin" />
                    <strong>
                      {progress < 100 ? `Uploading ${progress}%` : 'Looking a little closer…'}
                    </strong>
                    <span>Running your local model</span>
                  </div>
                )}
              </div>
              <div className="media-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={boxes}
                    onChange={(e) => setBoxes(e.target.checked)}
                  />
                  Bounding boxes
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={labels}
                    onChange={(e) => setLabels(e.target.checked)}
                  />
                  Confidence labels
                </label>
                {result && <span className="latency">{result.latency_ms.toFixed(0)} ms</span>}
              </div>
            </>
          ) : (
            <UploadZone kind="image" onFile={choose} />
          )}
          <PrivacyNote />
        </Card>
        <div className="analysis-side">
          <Card>
            <SectionHeading title="Analysis controls" action={<SlidersHorizontal size={17} />} />
            <div className="control-content">
              <label className="range-label" htmlFor="image-confidence">
                Confidence threshold<strong>{percent(confidence)}</strong>
              </label>
              <input
                id="image-confidence"
                type="range"
                min=".05"
                max="1"
                step=".01"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
              <p className="field-help">Only show objects at or above this confidence level.</p>
              <div className="settings-divider" />
              <div className="detail-row">
                <span>Active model</span>
                <strong>
                  {model.data?.ready ? model.data.checkpoint.split('/').pop() : 'Not connected'}
                </strong>
              </div>
              <div className="detail-row">
                <span>Classes</span>
                <strong>{model.data?.supported_classes.join(', ') || '—'}</strong>
              </div>
              <Button
                className="full-width"
                disabled={!file || mutation.isPending || !model.data?.ready}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <Loader2 className="spin" size={17} />
                ) : result ? (
                  <RefreshCw size={17} />
                ) : (
                  <ScanLine size={17} />
                )}{' '}
                {mutation.isPending ? 'Analyzing…' : result ? 'Analyze again' : 'Analyze image'}
              </Button>
              {mutation.isError && (
                <p role="alert" className="inline-error">
                  {errorMessage(mutation.error)}
                </p>
              )}
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Detected objects"
              action={<Badge>{result?.detections.length || 0}</Badge>}
            />
            <DetectionList detections={result?.detections || []} />
            {result && (
              <div className="result-footer">
                <SavedIndicator />
                <Button asChild variant="outline" size="sm">
                  <a href={asset(result.output_url) + '?download=true'} download>
                    <ArrowDownToLine size={14} />
                    Export image
                  </a>
                </Button>
              </div>
            )}
          </Card>
          <div className="soft-note">
            <span>
              <Check size={15} />A little context
            </span>
            <p>Confidence describes a model prediction. Every indication needs human review.</p>
          </div>
          {file && (
            <Button
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                setFile(null)
                mutation.reset()
              }}
            >
              <Upload size={15} />
              Choose another image
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
