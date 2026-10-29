import os
import tempfile
from pathlib import Path
os.environ['AEGIS_DATA_DIR'] = tempfile.mkdtemp(prefix='aegis-test-')
os.environ['AEGIS_CHECKPOINT'] = str(Path(os.environ['AEGIS_DATA_DIR']) / 'missing.pt')
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import Base, engine
from app.services.model_loader import model_service

@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    model_service.model = None
    model_service.classes = {}
    model_service.error = 'Test checkpoint missing'
    yield

@pytest.fixture
def client():
    # Lifespan tested separately: video executor is intentionally not shut down per test.
    return TestClient(app)
