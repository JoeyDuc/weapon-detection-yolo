# Local model checkpoints

The working environment includes `yolo11n.pt` downloaded explicitly from the official Ultralytics release:
https://github.com/ultralytics/assets/releases/download/v8.3.0/yolo11n.pt

SHA-256: `0ebbc80d4a7680d14987a577cd21342b65ecfd94632bd9a8da63ae6417644ee1`

This is the unmodified COCO reference model. Aegis filters its outputs to **knife only**. There is no gun class. The app never invents or relabels other classes as guns.

Weights are ignored by Git. To reproduce the reference setup, use the explicit download command in README.md. Review Ultralytics model/software licensing for your use: https://www.ultralytics.com/license

For both target classes, supply trusted custom-trained weights at `models/weapon.pt` and change `AEGIS_CHECKPOINT` in `backend/.env`. Supported aliases are knife/knives and gun/handgun/pistol/firearm (case insensitive). Checkpoints with no recognized classes are rejected. Only load trusted `.pt` files: PyTorch checkpoints can contain executable content.
