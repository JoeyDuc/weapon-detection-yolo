import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, ForeignKey, JSON, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.session import Base

def uid(): return uuid.uuid4().hex
def now(): return datetime.now(timezone.utc)

class AnalysisJob(Base):
    __tablename__ = 'analysis_jobs'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    source_type: Mapped[str] = mapped_column(String, index=True)
    original_filename: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default='uploaded', index=True)
    progress: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    input_path: Mapped[str | None] = mapped_column(String, nullable=True)
    output_path: Mapped[str | None] = mapped_column(String, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    media_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    events: Mapped[list['DetectionEvent']] = relationship(back_populates='job', cascade='all, delete-orphan')

class DetectionEvent(Base):
    __tablename__ = 'detection_events'
    id: Mapped[str] = mapped_column(String, primary_key=True, default=uid)
    job_id: Mapped[str | None] = mapped_column(ForeignKey('analysis_jobs.id', ondelete='CASCADE'), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_type: Mapped[str] = mapped_column(String, index=True)
    source_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    class_name: Mapped[str] = mapped_column(String, index=True)
    confidence: Mapped[float] = mapped_column(Float)
    bounding_box: Mapped[list] = mapped_column(JSON)
    evidence_path: Mapped[str | None] = mapped_column(String, nullable=True)
    is_alert: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    video_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    job: Mapped[AnalysisJob | None] = relationship(back_populates='events')
    __table_args__ = (Index('ix_events_source_timestamp', 'source_type', 'timestamp'),)

class ApplicationSetting(Base):
    __tablename__ = 'application_settings'
    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[dict] = mapped_column(JSON)
