import io
import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException, UploadFile
from app.core.config import config

async def read_upload(file: UploadFile, limit: int) -> bytes:
    content = bytearray()
    while chunk := await file.read(1024 * 1024):
        if len(content) + len(chunk) > limit:
            raise HTTPException(413, f'File exceeds the {limit // (1024 * 1024)} MB limit.')
        content.extend(chunk)
    if not content: raise HTTPException(422, 'The uploaded file is empty.')
    return bytes(content)

def decode_image(content: bytes) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(content)) as image:
            if image.format not in ('JPEG', 'PNG', 'WEBP'):
                raise ValueError('Use a JPG, PNG, or WEBP image.')
            if image.width * image.height > config.max_image_pixels:
                raise ValueError('Image exceeds the 24 megapixel limit. Resize it before uploading.')
            image.load()
            return cv2.cvtColor(np.array(ImageOps.exif_transpose(image).convert('RGB')), cv2.COLOR_RGB2BGR)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(422, f'Invalid image. {exc}') from exc
