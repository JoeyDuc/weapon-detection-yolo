import time
from app.schemas import Detection, Settings

class AlertTracker:
    """Class-level frame confirmation; not identity tracking or an intent assessment."""
    def __init__(self):
        self.counts: dict[str, int] = {}
        self.last: dict[str, float] = {}
        self.signature = None

    def update(self, detections: list[Detection], settings: Settings, at: float | None = None) -> list[Detection]:
        signature = (settings.confidence, settings.confirmation_frames)
        if self.signature != signature:
            self.counts.clear()
            self.signature = signature
        at = time.monotonic() if at is None else at
        best: dict[str, Detection] = {}
        for detection in detections:
            if detection.confidence >= settings.confidence:
                previous = best.get(detection.class_name)
                if previous is None or detection.confidence > previous.confidence:
                    best[detection.class_name] = detection
        alerts = []
        for name in ('knife', 'gun'):
            self.counts[name] = self.counts.get(name, 0) + 1 if name in best else 0
            if self.counts[name] >= settings.confirmation_frames and at - self.last.get(name, float('-inf')) >= settings.alert_cooldown:
                alerts.append(best[name])
                self.last[name] = at
        return alerts
