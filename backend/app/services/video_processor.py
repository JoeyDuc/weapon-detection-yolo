import asyncio
import shutil
import subprocess
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import cv2
from fastapi import HTTPException, UploadFile
from app.core.config import config
from app.core.logging import logger
from app.database.session import SessionLocal
from app.models import AnalysisJob, now
from app.schemas import Settings
from app.services.detector import detect
from app.services.alert_service import AlertTracker
from app.services.evidence_service import annotate, persist_events

executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='aegis-video')
cancellations: dict[str, threading.Event] = {}
job_lock = threading.Lock()

def probe(path: Path):
    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened(): raise ValueError('No compatible decoder could open this video.')
        fps = float(cap.get(cv2.CAP_PROP_FPS))
        count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width, height = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        valid, _ = cap.read()
        if not valid or not (0 < fps <= 240) or count <= 0 or width <= 0 or height <= 0:
            raise ValueError('Video is invalid or has no readable frames.')
        if count / fps > config.max_video_seconds: raise ValueError('Videos must be one hour or shorter.')
        if width * height > 3840 * 2160: raise ValueError('Video resolution must not exceed 4K.')
        return dict(fps=fps, frame_count=count, width=width, height=height, duration=count / fps)
    finally:
        cap.release()

async def save_video(file: UploadFile):
    extension = Path(file.filename or '').suffix.lower()
    if extension not in ('.mp4', '.mov', '.avi'):
        raise HTTPException(422, 'Upload an MP4, MOV, or AVI video.')
    relative = f'uploads/{uuid.uuid4().hex}{extension}'
    path = config.data_dir / relative
    try:
        size = 0
        with path.open('wb') as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > config.max_video_mb * 1024 * 1024: raise HTTPException(413, 'Video exceeds the 500 MB limit.')
                output.write(chunk)
        metadata = await asyncio.to_thread(probe, path)
        return relative, metadata
    except Exception as exc:
        path.unlink(missing_ok=True)
        if isinstance(exc, HTTPException): raise
        raise HTTPException(422, f'Invalid video. {exc}') from exc

def start_job(job_id: str, settings: Settings):
    with job_lock:
        if job_id in cancellations: raise HTTPException(409, 'This video is already processing.')
        with SessionLocal.begin() as db:
            job = db.get(AnalysisJob, job_id)
            if job is None or job.source_type != 'video': raise HTTPException(404, 'Video job not found.')
            if job.status != 'uploaded': raise HTTPException(409, 'Only an uploaded job can be started. Upload the file again to retry.')
            job.status = 'processing'
        flag = threading.Event()
        cancellations[job_id] = flag
        executor.submit(process_video, job_id, settings, flag)

class Cancelled(Exception): pass

def process_video(job_id: str, settings: Settings, cancelled: threading.Event):
    cap = None
    writer = None
    temp_path = config.data_dir / f'temporary/{job_id}.mp4'
    final_path = config.data_dir / f'outputs/{job_id}.mp4'
    try:
        with SessionLocal() as db:
            job = db.get(AnalysisJob, job_id)
            path, meta = config.data_dir / job.input_path, job.media_metadata
        cap = cv2.VideoCapture(str(path))
        # Keep local memory bounded and ensure even dimensions for H.264.
        scale = min(1, 1920 / max(meta['width'], meta['height']))
        w, h = (max(2, int(meta[key] * scale) // 2 * 2) for key in ('width', 'height'))
        native_h264 = False
        writer = cv2.VideoWriter(str(temp_path), cv2.VideoWriter_fourcc(*'avc1'), meta['fps'], (w, h))
        if writer.isOpened():
            native_h264 = True
        else:
            writer.release()
            writer = cv2.VideoWriter(str(temp_path), cv2.VideoWriter_fourcc(*'mp4v'), meta['fps'], (w, h))
        if not writer.isOpened(): raise RuntimeError('No video encoder is available. Install FFmpeg and a compatible OpenCV build.')
        tracker, frame_index, event_count = AlertTracker(), 0, 0
        while True:
            if cancelled.is_set(): raise Cancelled()
            ok, frame = cap.read()
            if not ok: break
            if frame.shape[1] != w or frame.shape[0] != h: frame = cv2.resize(frame, (w, h))
            detections, _ = detect(frame, settings)
            at = frame_index / meta['fps']
            alerts = tracker.update(detections, settings, at=at)
            if alerts:
                with SessionLocal.begin() as db:
                    job = db.get(AnalysisJob, job_id)
                    persist_events(db, alerts, frame, source_type='video', job=job, alert=True, video_time=at)
                    event_count += len(alerts)
            writer.write(annotate(frame, detections, settings.show_labels, settings.show_boxes))
            frame_index += 1
            if frame_index % 10 == 0:
                with SessionLocal.begin() as db:
                    db.get(AnalysisJob, job_id).progress = min(95, frame_index / meta['frame_count'] * 95)
        cap.release(); cap = None
        writer.release(); writer = None
        if frame_index == 0 or frame_index < meta['frame_count'] * .95:
            raise RuntimeError('The video could not be fully decoded. Convert it to H.264 MP4 and retry.')
        ffmpeg = shutil.which('ffmpeg')
        if ffmpeg:
            args = [ffmpeg, '-y', '-v', 'error', '-i', str(temp_path), '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(final_path)]
            proc = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            try:
                while proc.poll() is None:
                    if cancelled.wait(.2):
                        proc.terminate()
                        proc.wait(timeout=10)
                        raise Cancelled()
                _, stderr = proc.communicate()
                if proc.returncode: raise RuntimeError(f'FFmpeg conversion failed: {stderr.decode()[-600:]}')
            finally:
                if proc.poll() is None: proc.kill(); proc.wait()
        elif native_h264:
            temp_path.replace(final_path)
        else:
            raise RuntimeError('H.264 encoder unavailable. Install FFmpeg, restart the backend, and upload again. A temporary MPEG-4 video is not marked complete.')
        if cancelled.is_set(): raise Cancelled()
        probe(final_path)
        if not final_path.is_file() or final_path.stat().st_size == 0: raise RuntimeError('Output file was not created.')
        with SessionLocal.begin() as db:
            job = db.get(AnalysisJob, job_id)
            job.status, job.progress, job.output_path, job.completed_at = 'completed', 100, f'outputs/{job_id}.mp4', now()
            job.media_metadata = {**meta, 'frames_processed': frame_index, 'events': event_count, 'audio': 'removed'}
    except Exception as exc:
        final_path.unlink(missing_ok=True)
        with SessionLocal.begin() as db:
            job = db.get(AnalysisJob, job_id)
            job.status = 'cancelled' if isinstance(exc, Cancelled) else 'failed'
            job.error_message = None if isinstance(exc, Cancelled) else str(exc)
            job.completed_at = now()
        if not isinstance(exc, Cancelled): logger.exception('Video processing failed: %s', job_id)
    finally:
        if cap is not None: cap.release()
        if writer is not None: writer.release()
        temp_path.unlink(missing_ok=True)
        with job_lock: cancellations.pop(job_id, None)

def shutdown_jobs():
    for flag in list(cancellations.values()): flag.set()
    executor.shutdown(wait=True, cancel_futures=True)
