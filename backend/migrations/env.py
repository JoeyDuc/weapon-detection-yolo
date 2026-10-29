from alembic import context
from app.database.session import Base, engine
from app import models

def offline():
    context.configure(url=str(engine.url),target_metadata=Base.metadata,literal_binds=True,render_as_batch=True)
    with context.begin_transaction():context.run_migrations()

def online():
    with engine.connect() as connection:
        context.configure(connection=connection,target_metadata=Base.metadata,render_as_batch=True)
        with context.begin_transaction():context.run_migrations()
if context.is_offline_mode():offline()
else:online()
