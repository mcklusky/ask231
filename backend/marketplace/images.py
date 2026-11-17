"""Listing photo processing: smaller files for mobile data, correct orientation, no hidden metadata.

Every uploaded photo is turned into two WebP files:
  * a display image, at most DISPLAY_MAX px on its longest side (used on the ad page)
  * a thumbnail, at most THUMB_MAX px (used on cards, inboxes and galleries)
EXIF orientation is applied, then all metadata (including GPS location) is dropped by not copying it.
"""
from dataclasses import dataclass
from io import BytesIO
import uuid

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

DISPLAY_MAX = 1600
THUMB_MAX = 480
DISPLAY_QUALITY = 80
THUMB_QUALITY = 72
# Reject absurd dimensions before decoding (a 5 MB file can still claim to be gigapixels).
MAX_SOURCE_PIXELS = 50_000_000


@dataclass
class ProcessedImage:
    display: ContentFile
    thumbnail: ContentFile
    width: int
    height: int


def _flatten(image: Image.Image) -> Image.Image:
    """RGB without transparency: transparent areas become white (WebP lossy + consistent cards)."""
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return image.convert("RGB")


def _encode(image: Image.Image, max_side: int, quality: int) -> tuple[bytes, tuple[int, int]]:
    copy = image.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)  # never upscales
    buffer = BytesIO()
    copy.save(buffer, format="WEBP", quality=quality, method=4)  # no exif= argument: metadata is not written
    return buffer.getvalue(), copy.size


def process_listing_photo(uploaded) -> ProcessedImage:
    """Validate and convert an uploaded photo. Raises ValidationError for unreadable or oversized images."""
    try:
        uploaded.seek(0)
        with Image.open(uploaded) as probe:
            width, height = probe.size
            if width * height > MAX_SOURCE_PIXELS:
                raise ValidationError("This photo's dimensions are too large. Please upload a smaller photo.")
            probe.load()
            image = _flatten(ImageOps.exif_transpose(probe))
    except ValidationError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValidationError("This file could not be read as a photo. Use a JPG, PNG or WebP image.") from error
    finally:
        try:
            uploaded.seek(0)
        except (AttributeError, ValueError):
            pass

    stem = uuid.uuid4().hex
    display_bytes, size = _encode(image, DISPLAY_MAX, DISPLAY_QUALITY)
    thumb_bytes, _ = _encode(image, THUMB_MAX, THUMB_QUALITY)
    return ProcessedImage(
        display=ContentFile(display_bytes, name=f"{stem}.webp"),
        thumbnail=ContentFile(thumb_bytes, name=f"{stem}.webp"),
        width=size[0],
        height=size[1],
    )
