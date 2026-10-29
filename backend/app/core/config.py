import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]

class Config(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AEGIS_", env_file=str(ROOT / "backend/.env"), extra="ignore")
    data_dir: Path = ROOT / "backend/data"
    checkpoint: str = str(ROOT / "models/weapon.pt")
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    max_image_mb: int = 20
    max_video_mb: int = 500
    max_image_pixels: int = 24_000_000
    max_video_seconds: int = 3600

config = Config()
for name in ("uploads", "outputs", "evidence", "temporary"):
    (config.data_dir / name).mkdir(parents=True, exist_ok=True)

os.environ.setdefault('YOLO_CONFIG_DIR', str(config.data_dir / 'ultralytics'))
os.environ.setdefault('MPLCONFIGDIR', str(config.data_dir / 'matplotlib'))
