from app.database.session import SessionLocal
from app.models import ApplicationSetting
from app.schemas import Settings

def read_settings() -> Settings:
    with SessionLocal() as db:
        row = db.get(ApplicationSetting, 'detection')
        return Settings.model_validate(row.value) if row else Settings()

def save_settings(settings: Settings) -> Settings:
    with SessionLocal.begin() as db:
        db.merge(ApplicationSetting(key='detection', value=settings.model_dump()))
    return settings
