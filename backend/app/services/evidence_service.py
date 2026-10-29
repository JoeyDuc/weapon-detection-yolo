import uuid
from pathlib import Path
import cv2
import numpy as np
from app.core.config import config
from app.schemas import Detection, EventOut, JobOut
from app.models import DetectionEvent, AnalysisJob

def annotate(frame: np.ndarray, detections: list[Detection], labels: bool = True, boxes: bool = True) -> np.ndarray:
    output = frame.copy()
    h, w = output.shape[:2]
    for detection in detections:
        x1, y1, x2, y2 = [int(v * (w if i % 2 == 0 else h)) for i, v in enumerate(detection.bounding_box)]
        color = (70, 174, 230) if detection.class_name == 'knife' else (110, 105, 240)
        if boxes: cv2.rectangle(output, (x1, y1), (x2, y2), color, max(2, round(w / 500)))
        if labels:
            text = f'{detection.class_name} {detection.confidence:.0%}'
            cv2.putText(output, text, (x1, max(22, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, .6, color, 2, cv2.LINE_AA)
    return output

def save_frame(frame: np.ndarray, folder='evidence') -> str:
    relative = f'{folder}/{uuid.uuid4().hex}.jpg'
    if not cv2.imwrite(str(config.data_dir / relative), frame): raise RuntimeError('Unable to save image to local storage.')
    return relative

def persist_events(db, detections, frame, *, source_type, job=None, session_id=None, alert=False, video_time=None):
    if not detections: return []
    evidence = save_frame(annotate(frame, detections))
    events = []
    for detection in detections:
        event = DetectionEvent(job_id=job.id if job else None, session_id=session_id, source_type=source_type,
            source_filename=job.original_filename if job else session_id, class_name=detection.class_name,
            confidence=detection.confidence, bounding_box=detection.bounding_box, evidence_path=evidence,
            is_alert=alert, video_time=video_time)
        db.add(event)
        events.append(event)
    db.flush()
    return events

def event_out(event: DetectionEvent) -> EventOut:
    out = EventOut.model_validate(event)
    out.evidence_url = f'/api/files/{event.evidence_path}' if event.evidence_path else None
    return out

def job_out(job: AnalysisJob) -> JobOut:
    out = JobOut.model_validate(job)
    out.output_url = f'/api/files/{job.output_path}' if job.output_path else None
    return out

def safe_file(relative: str) -> Path:
    path = (config.data_dir / relative).resolve()
    if not path.is_relative_to(config.data_dir.resolve()) or not path.is_file():
        raise FileNotFoundError('File not found')
    return path
