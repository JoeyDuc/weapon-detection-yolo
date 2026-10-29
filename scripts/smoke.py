"""Exercise real YOLO image, WebSocket and video inference against a running backend.
Run with backend/.venv/bin/python scripts/smoke.py. No external image is used.
All verification records are removed from the workspace at the end.
"""
import asyncio
import base64
import io
import json
import tempfile
import time
from pathlib import Path
import cv2
import httpx
import numpy as np
import websockets
from PIL import Image

BASE='http://127.0.0.1:8000'

def main():
    report={}
    with httpx.Client(base_url=BASE,timeout=180) as client:
        before=client.get('/api/analytics/summary').json()
        if before['total_analyses']:
            raise SystemExit('Use a fresh verification database; this script cleans its test workspace at the end.')
        status=client.get('/api/model/status').json()
        assert status['ready'],status
        assert status['supported_classes']==['knife'],status
        report['model']=status
        data=io.BytesIO();Image.new('RGB',(640,480),(232,229,240)).save(data,'PNG')
        start=time.perf_counter()
        image=client.post('/api/images/analyze',files={'file':('smoke.png',data.getvalue(),'image/png')})
        assert image.status_code==200,image.text
        result=image.json()
        assert result['detections']==[],result # A uniform image is a benign negative fixture.
        assert client.get(result['output_url']).status_code==200
        report['image']={'latency_ms':result['latency_ms'],'roundtrip_ms':(time.perf_counter()-start)*1000,'detections':len(result['detections'])}
        async def live():
            async with websockets.connect('ws://127.0.0.1:8000/ws/detect',origin='http://127.0.0.1:5173') as ws:
                hello=json.loads(await ws.recv());assert hello['type']=='connected'
                await ws.send(json.dumps({'frame':base64.b64encode(data.getvalue()).decode(),'confidence':.5}))
                reply=json.loads(await ws.recv());assert reply['type']=='result',reply
                return {'latency_ms':reply['latency_ms'],'detections':len(reply['detections']),'alerts':len(reply['alerts'])}
        report['websocket']=asyncio.run(live())
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'sample.avi'
            writer=cv2.VideoWriter(str(path),cv2.VideoWriter_fourcc(*'MJPG'),8,(320,240));assert writer.isOpened()
            for _ in range(8):writer.write(np.full((240,320,3),220,np.uint8))
            writer.release()
            uploaded=client.post('/api/videos/upload',files={'file':('sample.avi',path.read_bytes(),'video/x-msvideo')})
            assert uploaded.status_code==201,uploaded.text
            job_id=uploaded.json()['id']
            start=client.post(f'/api/videos/{job_id}/start');assert start.status_code==200,start.text
            for _ in range(90):
                job=client.get(f'/api/videos/{job_id}/status').json()
                if job['status'] in ('completed','failed','cancelled'):break
                time.sleep(1)
            assert job['status']=='completed',job
            output=client.get(f'/api/videos/{job_id}/download');assert output.status_code==200
            output_path=Path(directory)/'output.mp4';output_path.write_bytes(output.content)
            cap=cv2.VideoCapture(str(output_path));readable,frame=cap.read();count=cap.get(cv2.CAP_PROP_FRAME_COUNT);cap.release();assert readable
            report['video']={'status':job['status'],'bytes':len(output.content),'readable':readable,'frame_count':int(count),'width':frame.shape[1],'height':frame.shape[0],'playback_url':job['output_url']}
            # Browser playback is checked separately while this file is available.
        report['statistics']=client.get('/api/analytics/summary').json()
        report['notes']=['Actual YOLO inference on benign, uniform fixtures. No positive detection or accuracy claim.','Device latency is observed for these frames only, not a representative FPS benchmark.']
        Path(__file__).resolve().parents[1].joinpath('docs/smoke-results.json').write_text(json.dumps(report,indent=2))
        print(json.dumps(report,indent=2))
if __name__=='__main__':main()
