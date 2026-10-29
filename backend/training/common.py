import hashlib
from pathlib import Path
import yaml

def checkpoint(value: str) -> str:
    path = Path(value).expanduser().resolve()
    if not path.is_file() or path.suffix != '.pt':
        raise ValueError(f'Trusted local .pt checkpoint required: {path}. Nothing will be downloaded automatically.')
    return str(path)

def inspect_dataset(value: str) -> tuple[str, dict]:
    data_file = Path(value).expanduser().resolve()
    config = yaml.safe_load(data_file.read_text())
    names = config.get('names')
    names = list(names.values()) if isinstance(names, dict) else names
    if names != ['knife', 'gun']:
        raise ValueError('Dataset class IDs must be 0=knife, 1=gun.')
    root = Path(config.get('path', '.'))
    if not root.is_absolute(): root = (data_file.parent / root).resolve()
    counts, seen = {}, {}
    for split in ('train', 'val', 'test'):
        images = root / config.get(split, f'images/{split}')
        if not images.is_dir(): raise ValueError(f'Dataset directory missing: {images}')
        files = sorted(p for p in images.rglob('*') if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'))
        if not files: raise ValueError(f'{split} split is empty. Supply a licensed, annotated dataset.')
        counts[split] = len(files)
        for image in files:
            fingerprint = hashlib.sha256(image.read_bytes()).hexdigest()
            if fingerprint in seen and seen[fingerprint] != split:
                raise ValueError(f'Exact image leakage between {seen[fingerprint]} and {split}: {image}')
            seen[fingerprint] = split
            relative = image.relative_to(root)
            label_parts = list(relative.parts)
            try: label_parts[label_parts.index('images')] = 'labels'
            except ValueError: raise ValueError('Use the documented images/ and labels/ dataset structure.')
            label = (root.joinpath(*label_parts)).with_suffix('.txt')
            if not label.is_file(): raise ValueError(f'Label file missing: {label}. Empty label files are valid for negative images.')
            for line in label.read_text().splitlines():
                values = line.split()
                if len(values) != 5: raise ValueError(f'Invalid YOLO label: {label}')
                cls, x, y, w, h = map(float, values)
                if cls not in (0, 1) or not all(0 <= n <= 1 for n in (x, y, w, h)) or w <= 0 or h <= 0:
                    raise ValueError(f'Out-of-range label: {label}')
    metadata_file = root / 'DATASET.md'
    if not metadata_file.exists(): raise ValueError('Document dataset provenance and licensing in DATASET.md first.')
    return str(data_file), {'path': str(root), 'images': counts, 'classes': names, 'config_sha256': hashlib.sha256(data_file.read_bytes()).hexdigest(), 'provenance': metadata_file.read_text()}
