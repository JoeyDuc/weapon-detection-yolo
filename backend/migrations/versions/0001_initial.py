"""Initial local analysis schema."""
from alembic import op
import sqlalchemy as sa
revision='0001'
down_revision=None
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('analysis_jobs',sa.Column('id',sa.String(),primary_key=True),sa.Column('source_type',sa.String(),nullable=False),sa.Column('original_filename',sa.String(),nullable=False),sa.Column('status',sa.String(),nullable=False),sa.Column('progress',sa.Float(),nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False),sa.Column('completed_at',sa.DateTime(timezone=True)),sa.Column('input_path',sa.String()),sa.Column('output_path',sa.String()),sa.Column('error_message',sa.String()),sa.Column('media_metadata',sa.JSON(),nullable=False))
    for name in ('source_type','status','created_at'):op.create_index(f'ix_analysis_jobs_{name}','analysis_jobs',[name])
    op.create_table('application_settings',sa.Column('key',sa.String(),primary_key=True),sa.Column('value',sa.JSON(),nullable=False))
    op.create_table('detection_events',sa.Column('id',sa.String(),primary_key=True),sa.Column('job_id',sa.String(),sa.ForeignKey('analysis_jobs.id',ondelete='CASCADE')),sa.Column('session_id',sa.String()),sa.Column('source_type',sa.String(),nullable=False),sa.Column('source_filename',sa.String()),sa.Column('class_name',sa.String(),nullable=False),sa.Column('confidence',sa.Float(),nullable=False),sa.Column('bounding_box',sa.JSON(),nullable=False),sa.Column('evidence_path',sa.String()),sa.Column('is_alert',sa.Boolean(),nullable=False),sa.Column('timestamp',sa.DateTime(timezone=True),nullable=False),sa.Column('video_time',sa.Float()))
    for name in ('job_id','source_type','class_name','timestamp'):op.create_index(f'ix_detection_events_{name}','detection_events',[name])
    op.create_index('ix_events_source_timestamp','detection_events',['source_type','timestamp'])

def downgrade():
    op.drop_table('detection_events');op.drop_table('application_settings');op.drop_table('analysis_jobs')
