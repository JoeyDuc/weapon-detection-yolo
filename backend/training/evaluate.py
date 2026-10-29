import argparse
import json
import time
from pathlib import Path
import numpy as np
from common import checkpoint, inspect_dataset

def failure_cases(model, data_file, root, output, args):
    import yaml
    config=yaml.safe_load(Path(data_file).read_text())
    images=sorted(p for p in (Path(root)/config['test']).rglob('*') if p.suffix.lower() in ('.jpg','.jpeg','.png','.webp'))
    failures=[]
    for image in images:
        relative=list(image.relative_to(root).parts);relative[relative.index('images')]='labels'
        label=Path(root).joinpath(*relative).with_suffix('.txt')
        truths=[]
        for line in label.read_text().splitlines():
            c,x,y,w,h=map(float,line.split());truths.append((int(c),np.array([x-w/2,y-h/2,x+w/2,y+h/2])))
        result=model.predict(str(image),device=args.device,imgsz=args.imgsz,conf=.25,iou=.45,verbose=False)[0]
        used=set();fp=0
        for cls,box in zip(result.boxes.cls.cpu().tolist(),result.boxes.xyxyn.cpu().numpy()):
            best,best_iou=None,0
            for i,(truth_cls,truth_box) in enumerate(truths):
                if i in used or truth_cls!=int(cls):continue
                intersection=np.prod(np.maximum(0,np.minimum(box[2:],truth_box[2:])-np.maximum(box[:2],truth_box[:2])))
                union=np.prod(box[2:]-box[:2])+np.prod(truth_box[2:]-truth_box[:2])-intersection
                iou=float(intersection/max(union,1e-9))
                if iou>best_iou:best,best_iou=i,iou
            if best is not None and best_iou>=.5:used.add(best)
            else:fp+=1
        fn=len(truths)-len(used)
        if fp or fn:
            evidence=output/f'failure-{len(failures):03d}.jpg'
            result.save(filename=str(evidence))
            failures.append({'image':str(image),'false_positives':fp,'false_negatives':fn,'prediction_preview':str(evidence)})
            if len(failures)>=20:break
    return failures

def main():
    p=argparse.ArgumentParser(description='Compare local checkpoints on the same held-out test split.')
    p.add_argument('--weights',nargs='+',required=True);p.add_argument('--data',default='../datasets/weapon_dataset/data.yaml')
    p.add_argument('--device',choices=['cpu','mps'],default='cpu');p.add_argument('--imgsz',type=int,default=640);p.add_argument('--output',default='../runs/evaluation')
    args=p.parse_args();data,metadata=inspect_dataset(args.data)
    from ultralytics import YOLO
    reports=[];base=Path(args.output);base.mkdir(parents=True,exist_ok=True)
    for index,weights in enumerate(args.weights):
        weights=checkpoint(weights);model=YOLO(weights)
        if list(model.names.values())!=['knife','gun']:raise ValueError('Evaluate checkpoints with class IDs 0=knife, 1=gun.')
        name=f'{index:02d}-{Path(weights).stem}'
        start=time.perf_counter()
        metrics=model.val(data=data,split='test',device=args.device,imgsz=args.imgsz,batch=1,workers=0,plots=True,save_json=True,project=str(base),name=name,exist_ok=False)
        wall=time.perf_counter()-start
        precision,recall=float(metrics.box.mp),float(metrics.box.mr)
        per_class=[]
        for i in metrics.box.ap_class_index:
            pr,re,ap50,ap=map(float,metrics.box.class_result(list(metrics.box.ap_class_index).index(i)))
            per_class.append({'class':model.names[int(i)],'precision':pr,'recall':re,'f1':2*pr*re/(pr+re) if pr+re else 0,'ap50':ap50,'ap50_95':ap})
        latency=float(metrics.speed['inference'])
        output=Path(metrics.save_dir)
        failures=failure_cases(model,data,Path(metadata['path']),output,args)
        report={'checkpoint':weights,'configuration':{'device':args.device,'imgsz':args.imgsz,'batch':1,'split':'test'},'dataset':metadata,'precision':precision,'recall':recall,'f1_from_mean_precision_recall':2*precision*recall/(precision+recall) if precision+recall else 0,'map50':float(metrics.box.map50),'map50_95':float(metrics.box.map),'per_class':per_class,'inference_ms_per_image':latency,'inference_fps_derived':1000/latency if latency else None,'evaluation_wall_seconds':wall,'speed_ms':metrics.speed,'confusion_matrix':str(output/'confusion_matrix.png'),'failure_cases':failures,'limitations':['Metrics apply only to this test split; domain shift can change results.','Derived inference FPS excludes decoding, transport, rendering and database operations.','F1 is derived from the reported precision and recall, not a safety guarantee.','Failure previews use confidence 0.25 and matching IoU 0.5; they include predicted boxes. Inspect labels for missed ground-truth objects.','Exact hashes do not prevent near-duplicate or source-session leakage. Audit the splits manually.']}
        (output/'report.json').write_text(json.dumps(report,indent=2));reports.append(report)
    (base/'comparison.json').write_text(json.dumps(reports,indent=2));print(f'Actual evaluation reports: {base.resolve()}')
if __name__=='__main__':main()
