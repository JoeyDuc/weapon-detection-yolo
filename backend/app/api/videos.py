from app.services.work_registry import processing
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import AnalysisJob, now
from app.schemas import JobOut
from app.services.model_loader import model_service
from app.services.video_processor import save_video, start_job, cancellations
from app.services.settings_service import read_settings
from app.services.evidence_service import job_out, safe_file
router = APIRouter(prefix='/api/videos', tags=['Videos'])

def get_job(db, job_id):
    job = db.get(AnalysisJob, job_id)
    if not job or job.source_type != 'video': raise HTTPException(404, 'Video job not found.')
    return job

@router.post('/upload', response_model=JobOut, status_code=201)
async def upload(file: UploadFile = File(...), db: Session = Depends(get_db)):
    with processing():
        path, meta = await save_video(file)
        job = AnalysisJob(source_type='video', original_filename=Path(file.filename or 'video').name[:255], input_path=path, media_metadata=meta)
        db.add(job); db.commit(); db.refresh(job)
        return job_out(job)

@router.post('/{job_id}/start', response_model=JobOut)
def start(job_id: str, db: Session = Depends(get_db)):
    get_job(db, job_id)
    if not model_service.status().ready: raise HTTPException(503, model_service.error or 'Load a model first.')
    with processing():
        start_job(job_id, read_settings())
    db.expire_all()
    return job_out(get_job(db, job_id))

@router.get('/{job_id}/status', response_model=JobOut)
def status(job_id: str, db: Session = Depends(get_db)): return job_out(get_job(db, job_id))

@router.get('/{job_id}/download')
def download(job_id: str, db: Session = Depends(get_db)):
    job = get_job(db, job_id)
    if job.status != 'completed' or not job.output_path: raise HTTPException(409, 'The output video is not ready.')
    return FileResponse(safe_file(job.output_path), media_type='video/mp4', filename=f'aegis-{job.id[:8]}.mp4')

@router.post('/{job_id}/cancel', response_model=JobOut)
def cancel(job_id: str, db: Session = Depends(get_db)):
    job = get_job(db, job_id)
    if job.status in ('completed', 'failed', 'cancelled'): raise HTTPException(409, 'This job has already finished.')
    flag = cancellations.get(job_id)
    if flag:
        flag.set(); job.status = 'cancelling'
    else: job.status, job.completed_at = 'cancelled', now()
    db.commit(); db.refresh(job)
    return job_out(job)
