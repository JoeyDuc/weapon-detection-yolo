import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import config
from app.core.logging import logger
from app.database.init_db import init_db
from app.services.model_loader import model_service
from app.services.detector import ModelUnavailable
from app.services.evidence_service import safe_file
from app.services.video_processor import shutdown_jobs
from app.api import health, images, videos, events, analytics, settings, websocket

@asynccontextmanager
async def lifespan(app):
    init_db()
    await asyncio.to_thread(model_service.load)
    yield
    await asyncio.to_thread(shutdown_jobs)

app = FastAPI(title='Aegis Vision', version='1.0.0', description='Local visual analysis. Model-generated indications require human review.', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.cors_origins, allow_methods=['GET','POST','PATCH','DELETE'], allow_headers=['Content-Type'])

@app.middleware('http')
async def local_mutation_guard(request: Request, call_next):
    if request.method in ('POST', 'PATCH', 'DELETE'):
        origin = request.headers.get('origin')
        if origin and origin not in config.cors_origins:
            return JSONResponse(status_code=403, content={'detail': 'This frontend origin is not trusted.'})
    try:
        return await call_next(request)
    except Exception:
        logger.exception('Unhandled request failure')
        return JSONResponse(status_code=500, content={'detail': 'The local service encountered an error. Check backend logs and retry.'})

@app.exception_handler(ModelUnavailable)
async def unavailable(request, exc): return JSONResponse(status_code=503, content={'detail': str(exc)})

@app.exception_handler(SQLAlchemyError)
async def db_error(request, exc):
    logger.error('Database failure', exc_info=exc)
    return JSONResponse(status_code=503, content={'detail': 'Local database is unavailable. Check disk space and file permissions.'})

for router in (health.router, images.router, videos.router, events.router, analytics.router, settings.router, websocket.router): app.include_router(router)

@app.get('/api/files/{relative:path}', tags=['Files'])
def files(relative: str, download: bool = False):
    if relative.split('/')[0] not in ('evidence', 'outputs'): raise HTTPException(404, 'File not found.')
    try: path = safe_file(relative)
    except FileNotFoundError: raise HTTPException(404, 'File not found.')
    return FileResponse(path, filename=path.name if download else None, headers={'X-Content-Type-Options': 'nosniff'})
