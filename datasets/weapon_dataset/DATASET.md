# Dataset provenance — complete before training

No dataset is bundled or downloaded by Aegis Vision.

Record the following for each source you add:

| Field | Required information |
| --- | --- |
| Source | Dataset title, publisher, URL and release |
| License | Exact license, usage restrictions and attribution |
| Consent/provenance | Collection method and privacy considerations |
| Size | Actual number of images and labels |
| Splits | Actual train/validation/test counts and selection method |
| Annotations | YOLO detection: class x_center y_center width height (normalized) |

Classes: `0 = knife` (a visible knife), `1 = gun` (a visible handheld firearm).
Define how replicas, toys, partially visible objects, background images and ambiguous labels are treated. Add representative hard negatives.

Separate subjects, capture sessions, scenes and near-duplicate frames across splits. Reserve the test split before training and never tune thresholds on it. `training/common.py` rejects exact cross-split duplicate hashes, but cannot detect near duplicates or session leakage.

Each image needs a matching `.txt` under `labels/<split>/`. An empty label file represents a negative image. Directories are intentionally empty; no accuracy is claimed.
