import io
import time
import cv2
import numpy as np
import pytest
from PIL import Image
from pydantic import ValidationError
from app.schemas import Detection, Settings
from app.services.alert_service import AlertTracker
from app.services.model_loader import model_service
from app.database.session import SessionLocal
from app.models import AnalysisJob, DetectionEvent
from app.core.config import config

def image_bytes():
    data=io.BytesIO(); Image.new('RGB',(64,48),'white').save(data,'PNG'); return data.getvalue()

def test_health_and_missing_model(client):
    assert client.get('/api/health').json()['database']=='connected'
    model_service.load()
    status=client.get('/api/model/status').json()
    assert status['ready'] is False
    assert 'No checkpoint' in status['error']
    assert 'custom checkpoint' in status['limitation']

def test_invalid_image_and_model_error(client):
    assert client.post('/api/images/analyze',files={'file':('bad.jpg',b'not an image','image/jpeg')}).status_code==422
    assert client.post('/api/images/analyze',files={'file':('ok.png',image_bytes(),'image/png')}).status_code==503
    assert client.post('/api/images/analyze',data={'confidence':2},files={'file':('ok.png',image_bytes(),'image/png')}).status_code==422

def test_settings_persist_and_validate(client):
    assert client.patch('/api/settings',json={'confidence':.72,'confirmation_frames':4}).status_code==200
    assert client.get('/api/settings').json()['confidence']==.72
    assert client.get('/api/settings').json()['confirmation_frames']==4
    assert client.patch('/api/settings',json={'confidence':4}).status_code==422
    assert client.patch('/api/settings',json={'image_size':333}).status_code==422
    assert client.patch('/api/settings',json={'unknown':True}).status_code==422

def test_normalized_detection_schema():
    with pytest.raises(ValidationError): Detection(class_name='gun',confidence=.9,bounding_box=[0,0,2,1])
    with pytest.raises(ValidationError): Detection(class_name='person',confidence=.9,bounding_box=[0,0,1,1])
    with pytest.raises(ValidationError): Detection(class_name='knife',confidence=.9,bounding_box=[.9,0,.1,1])

def test_image_persistence_history_and_analytics(client,monkeypatch):
    detection=Detection(class_name='knife',confidence=.85,bounding_box=[.1,.1,.8,.9])
    monkeypatch.setattr('app.api.images.detect',lambda f,s:([detection],12.5))
    response=client.post('/api/images/analyze',files={'file':('sample.png',image_bytes(),'image/png')})
    assert response.status_code==200,response.text
    result=response.json()
    assert client.get(result['output_url']).status_code==200
    assert result['detections'][0]['confidence']==.85
    events=client.get('/api/events').json()
    assert events['total']==1
    event=events['items'][0]
    assert event['job_id']==result['job_id'] and event['is_alert'] is False
    assert client.get('/api/events',params={'class_name':'gun'}).json()['total']==0
    assert client.get('/api/analytics/summary').json()=={'total_analyses':1,'total_detections':1,'average_confidence':.85,'alerts_generated':0}
    assert sum(d['detections'] for d in client.get('/api/analytics/timeline').json())==1
    assert client.delete('/api/events/'+event['id']).status_code==204
    assert client.get(event['evidence_url']).status_code==404
    assert client.get('/api/events').json()['total']==0

def test_alert_confirmation_cooldown_and_reset():
    tracker=AlertTracker(); settings=Settings(confirmation_frames=3,alert_cooldown=10)
    knife=Detection(class_name='knife',confidence=.8,bounding_box=[0,0,1,1])
    assert not tracker.update([knife],settings,at=0)
    assert not tracker.update([knife],settings,at=1)
    assert len(tracker.update([knife,knife],settings,at=2))==1
    assert not tracker.update([knife],settings,at=3)
    assert not tracker.update([],settings,at=12)
    assert not tracker.update([knife],settings,at=13)
    assert not tracker.update([knife],settings,at=14)
    assert len(tracker.update([knife],settings,at=15))==1

def test_video_validation_cancellation_and_duplicate_start(client):
    assert client.post('/api/videos/upload',files={'file':('bad.mp4',b'broken')}).status_code==422
    with SessionLocal.begin() as db:
        job=AnalysisJob(source_type='video',original_filename='sample.mp4',status='uploaded',media_metadata={})
        db.add(job);db.flush();job_id=job.id
    assert client.post(f'/api/videos/{job_id}/start').status_code==503
    assert client.post(f'/api/videos/{job_id}/cancel').json()['status']=='cancelled'
    assert client.post(f'/api/videos/{job_id}/cancel').status_code==409
    assert client.get(f'/api/videos/{job_id}/download').status_code==409

def test_ws_origin_schema_and_persistence(client,monkeypatch):
    import base64
    detection=Detection(class_name='gun',confidence=.9,bounding_box=[.1,.1,.9,.9])
    monkeypatch.setattr('app.api.websocket.detect',lambda f,s:([detection],4))
    client.patch('/api/settings',json={'confirmation_frames':2})
    with client.websocket_connect('/ws/detect',headers={'origin':'http://localhost:5173'}) as ws:
        assert ws.receive_json()['type']=='connected'
        for i in range(2):
            ws.send_json({'frame':base64.b64encode(image_bytes()).decode(),'confidence':.5})
            result=ws.receive_json()
            assert result['type']=='result'
            assert len(result['alerts'])==(1 if i==1 else 0)
        ws.send_json({'frame':'bad'})
        assert ws.receive_json()['type']=='error'
    assert client.get('/api/events').json()['total']==1
    assert client.get('/api/analytics/summary').json()['alerts_generated']==1

def test_untrusted_mutations_and_file_safety(client):
    assert client.patch('/api/settings',json={'confidence':.8},headers={'origin':'https://bad.example'}).status_code==403
    assert client.get('/api/files/uploads/private.jpg').status_code==404
    assert client.get('/api/files/outputs/%2e%2e/%2e%2e/aegis.db').status_code==404

def test_video_worker_completes_readable_output(client,monkeypatch):
    from app.services.video_processor import process_video
    import threading
    source=config.data_dir/'uploads/test.avi'
    writer=cv2.VideoWriter(str(source),cv2.VideoWriter_fourcc(*'MJPG'),10,(64,48))
    assert writer.isOpened()
    for i in range(8):writer.write(np.full((48,64,3),i*20,np.uint8))
    writer.release()
    detection=Detection(class_name='knife',confidence=.9,bounding_box=[.1,.1,.9,.9])
    monkeypatch.setattr('app.services.video_processor.detect',lambda f,s:([detection],1))
    response=client.post('/api/videos/upload',files={'file':('sample.avi',source.read_bytes(),'video/x-msvideo')})
    assert response.status_code==201,response.text
    job_id=response.json()['id']
    process_video(job_id,Settings(),threading.Event())
    job=client.get(f'/api/videos/{job_id}/status').json()
    assert job['status']=='completed',job
    assert job['progress']==100
    assert client.get(f'/api/videos/{job_id}/download').status_code==200
    assert client.get('/api/events').json()['total']==1

def test_video_worker_cancellation(client,monkeypatch):
    from app.services.video_processor import process_video
    import threading
    with SessionLocal.begin() as db:
        job=AnalysisJob(source_type='video',original_filename='sample.mp4',status='processing',input_path='uploads/none.mp4',media_metadata={'width':64,'height':48,'fps':10,'frame_count':10})
        db.add(job);db.flush();job_id=job.id
    flag=threading.Event();flag.set()
    process_video(job_id,Settings(),flag)
    assert client.get(f'/api/videos/{job_id}/status').json()['status']=='cancelled'
