from app.services.work_registry import processing
from pathlib import Path
import asyncio
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.config import config
from app.database.session import SessionLocal
from app.models import AnalysisJob, now
from app.schemas import ImageResult
from app.services.settings_service import read_settings
from app.services.image_processor import read_upload, decode_image
from app.services.detector import detect
from app.services.evidence_service import annotate, save_frame, persist_events
router = APIRouter(prefix='/api/images', tags=['Images'])

@router.post('/analyze', response_model=ImageResult)
async def analyze(file: UploadFile = File(...), confidence: float | None = Form(None)):
    if confidence is not None and not .05 <= confidence <= 1: raise HTTPException(422, 'Confidence must be between .05 and 1.')
    content = await read_upload(file, config.max_image_mb * 1024 * 1024)
    frame = await asyncio.to_thread(decode_image, content)
    settings = read_settings()
    if confidence is not None: settings.confidence = confidence
    def run():
        input_path = save_frame(frame, 'uploads')
        with SessionLocal.begin() as db:
            job = AnalysisJob(source_type='image', original_filename=Path(file.filename or 'image').name[:255], input_path=input_path, status='processing', media_metadata={'width': frame.shape[1], 'height': frame.shape[0]})
            db.add(job); db.flush()
            job_id = job.id
        try:
            detections, latency = detect(frame, settings)
            output_path = save_frame(annotate(frame, detections, settings.show_labels, settings.show_boxes), 'outputs')
            with SessionLocal.begin() as db:
                job = db.get(AnalysisJob, job_id)
                persist_events(db, detections, frame, source_type='image', job=job)
                job.status, job.progress, job.output_path, job.completed_at = 'completed', 100, output_path, now()
            return ImageResult(job_id=job_id, detections=detections, output_url=f'/api/files/{output_path}', latency_ms=latency, width=frame.shape[1], height=frame.shape[0])
        except Exception as exc:
            with SessionLocal.begin() as db:
                job = db.get(AnalysisJob, job_id)
                job.status, job.error_message, job.completed_at = 'failed', str(exc), now()
            raise
    with processing():
        return await asyncio.to_thread(run)
