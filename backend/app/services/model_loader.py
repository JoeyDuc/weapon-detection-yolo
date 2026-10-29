from pathlib import Path
from threading import RLock
from app.core.config import config
from app.core.logging import logger
from app.schemas import ModelStatus

CLASS_MAP = {'knife': 'knife', 'knives': 'knife', 'gun': 'gun', 'handgun': 'gun', 'pistol': 'gun', 'firearm': 'gun'}

class ModelService:
    def __init__(self):
        self.model = None
        self.lock = RLock()
        self.error: str | None = None
        self.classes: dict[int, str] = {}
        self.device = 'cpu'
        self.available_devices = ['cpu']

    def load(self):
        with self.lock:
            self.model = None
            self.classes = {}
            try:
                if not Path(config.checkpoint).is_file():
                    raise FileNotFoundError('No checkpoint found. Place trusted YOLO weights at the configured path, then reload the model.')
                import torch
                from ultralytics import YOLO, settings as yolo_settings
                yolo_settings.update({'sync': False})
                self.available_devices = ['cpu'] + (['mps'] if torch.backends.mps.is_available() else [])
                model = YOLO(str(Path(config.checkpoint).resolve()), task='detect')
                if model.task != 'detect':
                    raise ValueError('This checkpoint is not an object detection model.')
                self.classes = {int(i): CLASS_MAP[str(name).strip().lower()] for i, name in model.names.items() if str(name).strip().lower() in CLASS_MAP}
                if not self.classes:
                    raise ValueError('Checkpoint has no supported knife or gun class labels.')
                self.model = model
                self.device = 'mps' if 'mps' in self.available_devices else 'cpu'
                self.error = None
                logger.info('Model ready: %s; classes=%s', config.checkpoint, self.classes)
            except Exception as exc:
                self.error = str(exc)
                logger.warning('Model unavailable: %s', exc)

    def status(self) -> ModelStatus:
        classes = sorted(set(self.classes.values()))
        return ModelStatus(ready=self.model is not None, checkpoint=config.checkpoint, supported_classes=classes,
            device=self.device, available_devices=self.available_devices, error=self.error,
            limitation=None if 'gun' in classes else 'Gun detection requires a custom checkpoint trained with a gun class. Standard COCO weights support knife only.')

model_service = ModelService()
