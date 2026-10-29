import time
import numpy as np
from app.schemas import Settings, Detection
from app.services.model_loader import model_service
from app.core.logging import logger

class ModelUnavailable(RuntimeError): pass

def detect(frame: np.ndarray, settings: Settings) -> tuple[list[Detection], float]:
    start = time.perf_counter()
    with model_service.lock:
        if model_service.model is None:
            raise ModelUnavailable(model_service.error or 'Model is not loaded.')
        device = model_service.device if settings.device == 'auto' else settings.device
        if device not in model_service.available_devices:
            device = 'cpu'
        args = dict(source=frame, conf=settings.confidence, iou=settings.iou, imgsz=settings.image_size,
                    classes=list(model_service.classes), verbose=False, device=device)
        try:
            result = model_service.model.predict(**args)[0]
        except Exception:
            if device != 'mps': raise
            logger.warning('MPS inference failed; retrying on CPU', exc_info=True)
            model_service.device = 'cpu'
            result = model_service.model.predict(**{**args, 'device': 'cpu'})[0]
        model_service.device = device if device != 'mps' or model_service.device == 'mps' else 'cpu'
        detections = []
        if result.boxes is not None:
            for box, score, cls in zip(result.boxes.xyxyn.cpu().tolist(), result.boxes.conf.cpu().tolist(), result.boxes.cls.cpu().tolist()):
                name = model_service.classes.get(int(cls))
                if name:
                    detections.append(Detection(class_name=name, confidence=float(score), bounding_box=[min(1., max(0., float(v))) for v in box]))
    return detections, (time.perf_counter() - start) * 1000
