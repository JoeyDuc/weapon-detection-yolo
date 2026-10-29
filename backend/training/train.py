"""Run from backend/: python training/train.py --weights ../models/yolo11n.pt ..."""
import argparse
import json
from pathlib import Path
from common import checkpoint, inspect_dataset

def main():
    p=argparse.ArgumentParser(description='Fine-tune a trusted local YOLO checkpoint. No implicit downloads.')
    p.add_argument('--weights',required=True);p.add_argument('--data',default='../datasets/weapon_dataset/data.yaml')
    p.add_argument('--epochs',type=int,default=100);p.add_argument('--batch',type=int,default=8)
    p.add_argument('--imgsz',type=int,default=640);p.add_argument('--lr',type=float,default=.001)
    p.add_argument('--device',default='cpu',choices=['cpu','mps']);p.add_argument('--patience',type=int,default=20)
    p.add_argument('--seed',type=int,default=42);p.add_argument('--project',default='../runs/train');p.add_argument('--name',default='weapon')
    args=p.parse_args();weights=checkpoint(args.weights);data,metadata=inspect_dataset(args.data)
    from ultralytics import YOLO
    model=YOLO(weights)
    result=model.train(data=data,epochs=args.epochs,batch=args.batch,imgsz=args.imgsz,lr0=args.lr,device=args.device,patience=args.patience,seed=args.seed,deterministic=True,workers=0,project=args.project,name=args.name,exist_ok=False,save=True,val=True,amp=False,pretrained=weights)
    Path(result.save_dir,'dataset_manifest.json').write_text(json.dumps(metadata,indent=2))
    print(f'Training complete. Checkpoints: {result.save_dir}/weights/')
if __name__=='__main__':main()
