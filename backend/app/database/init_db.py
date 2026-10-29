from app.database.session import Base, engine, SessionLocal
from app.models import AnalysisJob

def init_db():
    Base.metadata.create_all(engine)
    # Single-process local jobs cannot survive an application restart.
    with SessionLocal.begin() as db:
        for job in db.query(AnalysisJob).filter(AnalysisJob.status.in_(['processing', 'cancelling'])):
            job.status = 'failed'
            job.error_message = 'Processing was interrupted by a server restart. Upload the video again.'
