from datetime import datetime, timedelta, timezone
from collections import Counter
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import AnalysisJob, DetectionEvent
router = APIRouter(prefix='/api/analytics', tags=['Analytics'])

def cutoff(days): return datetime.now(timezone.utc) - timedelta(days=days - 1)

@router.get('/summary')
def summary(days: int | None = Query(None, ge=1, le=365), db: Session = Depends(get_db)):
    events, jobs = select(DetectionEvent), select(AnalysisJob)
    if days:
        since = cutoff(days).replace(hour=0, minute=0, second=0, microsecond=0)
        events = events.where(DetectionEvent.timestamp >= since)
        jobs = jobs.where(AnalysisJob.created_at >= since)
    e = events.subquery()
    row = db.execute(select(func.count(e.c.id), func.avg(e.c.confidence), func.sum(e.c.is_alert.cast(__import__('sqlalchemy').Integer)))).one()
    return {'total_analyses': db.scalar(select(func.count()).select_from(jobs.subquery())), 'total_detections': row[0], 'average_confidence': row[1] or 0, 'alerts_generated': row[2] or 0}

@router.get('/timeline')
def timeline(days: int = Query(7, ge=1, le=365), db: Session = Depends(get_db)):
    start = cutoff(days).replace(hour=0, minute=0, second=0, microsecond=0)
    events = db.execute(select(func.date(DetectionEvent.timestamp), func.count(), func.sum(DetectionEvent.is_alert.cast(__import__('sqlalchemy').Integer))).where(DetectionEvent.timestamp >= start).group_by(func.date(DetectionEvent.timestamp))).all()
    jobs = dict(db.execute(select(func.date(AnalysisJob.created_at), func.count()).where(AnalysisJob.created_at >= start).group_by(func.date(AnalysisJob.created_at))).all())
    counts = {row[0]: (row[1], row[2]) for row in events}
    return [{'date': (start + timedelta(days=i)).date().isoformat(), 'detections': counts.get((start + timedelta(days=i)).date().isoformat(), (0, 0))[0], 'alerts': counts.get((start + timedelta(days=i)).date().isoformat(), (0, 0))[1], 'analyses': jobs.get((start + timedelta(days=i)).date().isoformat(), 0)} for i in range(days)]

@router.get('/distribution')
def distribution(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    since = cutoff(days).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = db.execute(select(DetectionEvent.class_name, DetectionEvent.confidence).where(DetectionEvent.timestamp >= since)).all()
    sources = db.execute(select(AnalysisJob.source_type, func.count()).where(AnalysisJob.created_at >= since).group_by(AnalysisJob.source_type)).all()
    categories = Counter(row[0] for row in rows)
    bins = [0] * 5
    for _, confidence in rows: bins[min(4, int(confidence * 5))] += 1
    return {'categories': [{'name': name, 'value': categories.get(name, 0)} for name in ('knife', 'gun')], 'confidence': [{'name': f'{i*20}–{(i+1)*20}%', 'value': value} for i, value in enumerate(bins)], 'sources': [{'name': name, 'value': count} for name, count in sources]}
