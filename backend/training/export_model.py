import argparse
from common import checkpoint

def main():
    p=argparse.ArgumentParser(description='Export trusted local weights.')
    p.add_argument('--weights',required=True);p.add_argument('--format',choices=['onnx','torchscript','coreml'],default='torchscript');p.add_argument('--imgsz',type=int,default=640)
    args=p.parse_args()
    from ultralytics import YOLO
    result=YOLO(checkpoint(args.weights)).export(format=args.format,imgsz=args.imgsz,device='cpu',batch=1)
    print(f'Exported model: {result}')
if __name__=='__main__':main()
