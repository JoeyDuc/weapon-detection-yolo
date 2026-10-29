from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models import DetectionEvent
from app.schemas import EventOut, EventPage, DeleteMany
from app.services.evidence_service import event_out
from app.core.config import config
router = APIRouter(prefix='/api/events', tags=['History'])

@router.get('', response_model=EventPage)
def events(q: str = Query('', max_length=200), class_name: str | None = None, source_type: str | None = None,
           since: datetime | None = None, until: datetime | None = None, job_id: str | None = None,
           sort: str = Query('desc', pattern='^(asc|desc)$'), page: int = Query(1, ge=1), page_size: int = Query(12, ge=1, le=100), db: Session = Depends(get_db)):
    stmt = select(DetectionEvent)
    if q: stmt = stmt.where(or_(DetectionEvent.source_filename.ilike(f'%{q}%'), DetectionEvent.id.ilike(f'%{q}%'), DetectionEvent.class_name.ilike(f'%{q}%')))
    if class_name: stmt = stmt.where(DetectionEvent.class_name == class_name)
    if source_type: stmt = stmt.where(DetectionEvent.source_type == source_type)
    if since: stmt = stmt.where(DetectionEvent.timestamp >= since)
    if until: stmt = stmt.where(DetectionEvent.timestamp <= until)
    if job_id: stmt = stmt.where(DetectionEvent.job_id == job_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(DetectionEvent.timestamp.desc() if sort == 'desc' else DetectionEvent.timestamp.asc()).offset((page-1)*page_size).limit(page_size)).all()
    return EventPage(items=[event_out(e) for e in rows], total=total, page=page, page_size=page_size)

@router.get('/{event_id}', response_model=EventOut)
def detail(event_id: str, db: Session = Depends(get_db)):
    event = db.get(DetectionEvent, event_id)
    if not event: raise HTTPException(404, 'Event not found.')
    return event_out(event)

def remove_events(db, rows):
    paths = {e.evidence_path for e in rows if e.evidence_path}
    for row in rows: db.delete(row)
    db.commit()
    for path in paths:
        if not db.scalar(select(DetectionEvent.id).where(DetectionEvent.evidence_path == path).limit(1)):
            candidate = (config.data_dir / path).resolve()
            if candidate.is_relative_to((config.data_dir / 'evidence').resolve()): candidate.unlink(missing_ok=True)

@router.delete('/{event_id}', status_code=204)
def delete(event_id: str, db: Session = Depends(get_db)):
    row = db.get(DetectionEvent, event_id)
    if not row: raise HTTPException(404, 'Event not found.')
    remove_events(db, [row])

@router.post('/delete-many', status_code=204)
def delete_many(body: DeleteMany, db: Session = Depends(get_db)):
    remove_events(db, db.scalars(select(DetectionEvent).where(DetectionEvent.id.in_(body.ids))).all())
