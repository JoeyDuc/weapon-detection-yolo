from app.services.work_registry import maintenance_window
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas import Settings, SettingsPatch, Maintenance
from app.services.settings_service import read_settings, save_settings
from app.services.video_processor import cancellations
from app.models import DetectionEvent, AnalysisJob
from app.core.config import config
router = APIRouter(prefix='/api/settings', tags=['Settings'])

@router.get('', response_model=Settings)
def settings(): return read_settings()

@router.patch('', response_model=Settings)
def update(body: SettingsPatch):
    data = {**read_settings().model_dump(), **body.model_dump(exclude_none=True)}
    return save_settings(Settings.model_validate(data))

@router.post('/maintenance')
def maintenance(body: Maintenance, db: Session = Depends(get_db)):
    with maintenance_window():
        if cancellations: raise HTTPException(409, 'Wait for active video jobs to finish before deleting data.')
        if body.action == 'history':
            db.query(DetectionEvent).delete()
            db.query(AnalysisJob).delete()
            db.commit()
            folders = ('evidence', 'uploads', 'outputs', 'temporary')
        elif body.action == 'evidence':
            db.query(DetectionEvent).update({'evidence_path': None})
            db.commit()
            folders = ('evidence',)
        else: folders = ('temporary',)
        removed = 0
        for folder in folders:
            for path in (config.data_dir / folder).iterdir():
                if path.is_file(): path.unlink(); removed += 1
        return {'removed_files': removed, 'action': body.action}
