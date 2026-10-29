from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.core.config import config

class Base(DeclarativeBase):
    pass

engine = create_engine(f"sqlite:///{config.data_dir / 'aegis.db'}", connect_args={"check_same_thread": False, "timeout": 30})
@event.listens_for(engine, 'connect')
def configure_sqlite(connection, _):
    connection.execute('PRAGMA foreign_keys=ON')
    connection.execute('PRAGMA journal_mode=WAL')

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
def get_db():
    with SessionLocal() as session:
        yield session
