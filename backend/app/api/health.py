import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas import ModelStatus
from app.services.model_loader import model_service
from app.services.video_processor import cancellations
router = APIRouter(prefix='/api', tags=['System'])

@router.get('/health')
def health(db: Session = Depends(get_db)):
    db.execute(text('SELECT 1'))
    return {'status': 'ok', 'database': 'connected', 'version': '1.0.0', 'storage': 'local'}

@router.get('/model/status', response_model=ModelStatus)
def status(): return model_service.status()

@router.post('/model/reload', response_model=ModelStatus)
async def reload_model():
    if cancellations: raise HTTPException(409, 'Wait for active video jobs before reloading the model.')
    await asyncio.to_thread(model_service.load)
    return model_service.status()
