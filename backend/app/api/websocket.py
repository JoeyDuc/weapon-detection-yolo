from app.services.work_registry import processing
import asyncio
import base64
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.core.config import config
from app.core.logging import logger
from app.database.session import SessionLocal
from app.models import AnalysisJob, now
from app.services.detector import detect
from app.services.alert_service import AlertTracker
from app.services.evidence_service import persist_events, event_out
from app.services.image_processor import decode_image
from app.services.settings_service import read_settings
router = APIRouter()

@router.websocket('/ws/detect')
async def live(ws: WebSocket):
    origin = ws.headers.get('origin')
    if origin not in config.cors_origins:
        await ws.close(code=1008, reason='Untrusted frontend origin'); return
    await ws.accept()
    guard = processing()
    try:
        guard.__enter__()
    except HTTPException as exc:
        await ws.send_json({'type': 'error', 'message': exc.detail})
        await ws.close(code=1013)
        return
    tracker, session_id, job_id = AlertTracker(), uuid.uuid4().hex, None
    try:
        await ws.send_json({'type': 'connected', 'session_id': session_id})
        while True:
            # Receive only after the preceding inference and database write complete.
            raw = await ws.receive_text()
            if len(raw) > 2_800_000:
                await ws.close(code=1009, reason='Frame too large'); break
            try:
                payload = json.loads(raw)
                if payload.get('type') == 'reset':
                    tracker = AlertTracker()
                    await ws.send_json({'type': 'reset'}); continue
                settings = read_settings()
                confidence = payload.get('confidence')
                if confidence is not None:
                    confidence = float(confidence)
                    if not .05 <= confidence <= 1: raise ValueError('Invalid confidence threshold.')
                    settings.confidence = confidence
                content = base64.b64decode(payload['frame'], validate=True)
                frame = await asyncio.to_thread(decode_image, content)
                if frame.shape[0] * frame.shape[1] > 1280 * 1280: raise ValueError('Resize frames to at most 1280 × 1280.')
                detections, latency = await asyncio.to_thread(detect, frame, settings)
                alerts = tracker.update(detections, settings)
                def record():
                    nonlocal job_id
                    with SessionLocal.begin() as db:
                        if job_id is None:
                            job = AnalysisJob(source_type='live', original_filename=f'Camera session {session_id[:8]}', status='processing', media_metadata={})
                            db.add(job); db.flush(); job_id = job.id
                        job = db.get(AnalysisJob, job_id)
                        events = persist_events(db, alerts, frame, source_type='live', job=job, session_id=session_id, alert=True)
                        return [event_out(event).model_dump(mode='json') for event in events]
                events = await asyncio.to_thread(record)
                await ws.send_json({'type': 'result', 'detections': [d.model_dump() for d in detections], 'alerts': events, 'latency_ms': latency, 'session_id': session_id})
            except Exception as exc:
                logger.warning('Live frame rejected: %s', exc)
                await ws.send_json({'type': 'error', 'message': exc.detail if isinstance(exc, HTTPException) else str(exc)})
    except WebSocketDisconnect:
        pass
    finally:
        if job_id:
            with SessionLocal.begin() as db:
                job = db.get(AnalysisJob, job_id)
                if job:
                    job.status, job.progress, job.completed_at = 'completed', 100, now()

        guard.__exit__(None, None, None)
