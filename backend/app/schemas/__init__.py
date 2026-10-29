from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class Settings(BaseModel):
    confidence: float = Field(default=.5, ge=.05, le=1)
    iou: float = Field(default=.45, ge=.05, le=1)
    image_size: int = Field(default=640, ge=320, le=1280, multiple_of=32)
    device: Literal['auto', 'cpu', 'mps'] = 'auto'
    confirmation_frames: int = Field(default=3, ge=1, le=30)
    alert_cooldown: float = Field(default=10, ge=1, le=300)
    show_boxes: bool = True
    show_labels: bool = True

class SettingsPatch(BaseModel):
    model_config = ConfigDict(extra='forbid')
    confidence: float | None = Field(default=None, ge=.05, le=1)
    iou: float | None = Field(default=None, ge=.05, le=1)
    image_size: int | None = Field(default=None, ge=320, le=1280, multiple_of=32)
    device: Literal['auto', 'cpu', 'mps'] | None = None
    confirmation_frames: int | None = Field(default=None, ge=1, le=30)
    alert_cooldown: float | None = Field(default=None, ge=1, le=300)
    show_boxes: bool | None = None
    show_labels: bool | None = None

class Detection(BaseModel):
    class_name: Literal['knife', 'gun']
    confidence: float = Field(ge=0, le=1)
    bounding_box: list[float] = Field(min_length=4, max_length=4)
    @field_validator('bounding_box')
    @classmethod
    def valid_box(cls, box):
        if not all(0 <= n <= 1 for n in box) or box[2] < box[0] or box[3] < box[1]:
            raise ValueError('Expected normalized xyxy coordinates')
        return box

class ModelStatus(BaseModel):
    ready: bool
    checkpoint: str
    supported_classes: list[str]
    device: str
    available_devices: list[str]
    error: str | None
    limitation: str | None

class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_type: str
    original_filename: str
    status: str
    progress: float
    created_at: datetime
    completed_at: datetime | None
    error_message: str | None
    media_metadata: dict
    output_url: str | None = None

class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    job_id: str | None
    session_id: str | None
    source_type: str
    source_filename: str | None
    class_name: str
    confidence: float
    bounding_box: list[float]
    is_alert: bool
    timestamp: datetime
    video_time: float | None
    evidence_url: str | None = None

class ImageResult(BaseModel):
    job_id: str
    detections: list[Detection]
    output_url: str
    latency_ms: float
    width: int
    height: int

class EventPage(BaseModel):
    items: list[EventOut]
    total: int
    page: int
    page_size: int

class DeleteMany(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=100)

class Maintenance(BaseModel):
    action: Literal['history', 'evidence', 'temporary']
    confirm: Literal[True]
