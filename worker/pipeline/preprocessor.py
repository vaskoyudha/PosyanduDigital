"""
Image preprocessing pipeline for posyandu register scans.

Steps:
1. EXIF auto-rotation (Pillow)
2. Upscale if width < 1500px (INTER_CUBIC)
3. Deskew via Hough line detection
4. Bilateral filter (noise reduction, preserve edges)
5. CLAHE contrast enhancement on L channel
6. Border padding (20px white)
7. Upload preprocessed image back to Supabase Storage

Returns: (processed_np_array, storage_path_preprocessed)
"""
import cv2
import numpy as np
from PIL import Image, ExifTags
import io
from supabase import Client


def preprocess_image(
    image_bytes: bytes, original_path: str, supabase: Client
) -> tuple[np.ndarray, str]:
    # EXIF rotation
    img_pil = Image.open(io.BytesIO(image_bytes))
    img_pil = _apply_exif_rotation(img_pil)
    img = np.array(img_pil.convert("RGB"))
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Upscale if needed
    h, w = img.shape[:2]
    if w < 1500:
        scale = 1500 / w
        img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    # Deskew
    img = _deskew(img)

    # Bilateral filter
    img = cv2.bilateralFilter(img, 9, 75, 75)

    # CLAHE on L channel
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_ch = clahe.apply(l_ch)
    img = cv2.cvtColor(cv2.merge([l_ch, a_ch, b_ch]), cv2.COLOR_LAB2BGR)

    # Border padding
    img = cv2.copyMakeBorder(
        img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(255, 255, 255)
    )

    # Save preprocessed to Supabase Storage
    preprocessed_path = _make_preprocessed_path(original_path)
    _, img_encoded = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    supabase.storage.from_("ocr-documents").upload(
        preprocessed_path,
        img_encoded.tobytes(),
        file_options={"content-type": "image/jpeg", "upsert": "true"},
    )

    return img, preprocessed_path


# ---------- helpers ----------


def _make_preprocessed_path(original_path: str) -> str:
    """Convert 'uploads/abc/file.jpg' → 'preprocessed/abc/file.jpg'."""
    parts = original_path.split("/", 1)
    if len(parts) == 2:
        return f"preprocessed/{parts[1]}"
    return f"preprocessed/{original_path}"


def _apply_exif_rotation(img: Image.Image) -> Image.Image:
    """Auto-rotate based on EXIF orientation tag."""
    try:
        exif = img._getexif()
        if exif:
            for tag, val in exif.items():
                if ExifTags.TAGS.get(tag) == "Orientation":
                    if val == 3:
                        img = img.rotate(180, expand=True)
                    elif val == 6:
                        img = img.rotate(270, expand=True)
                    elif val == 8:
                        img = img.rotate(90, expand=True)
    except Exception:
        pass
    return img


def _deskew(img: np.ndarray) -> np.ndarray:
    """Straighten the image using Hough line angle detection."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180, threshold=100, minLineLength=100, maxLineGap=10
    )
    if lines is None:
        return img

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x2 != x1:
            angles.append(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
    if not angles:
        return img

    # Filter to near-horizontal lines only (within +/-30 deg)
    horizontal = [a for a in angles if -30 < a < 30]
    if not horizontal:
        return img

    angle = float(np.median(horizontal))
    if abs(angle) < 0.5:
        return img  # Skip trivial rotation

    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(
        img, M, (w, h), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255)
    )
