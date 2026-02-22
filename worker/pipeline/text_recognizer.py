"""
Handwriting recognition using Gemini 2.5 Flash API.
Each cell crop is sent as a base64 image with a field-specific prompt.
Returns recognized text + calculated confidence score.
"""
import asyncio
import base64
import re
import cv2
import numpy as np
from typing import List, Dict, Any
import google.generativeai as genai
from config import GEMINI_API_KEY, GEMINI_MODEL

genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """Kamu adalah sistem OCR untuk buku register posyandu Indonesia.
Tugasmu adalah membaca tulisan tangan dalam sel tabel dan mengembalikan nilai yang akurat.
Kembalikan HANYA nilai teks murni, tanpa penjelasan.
Jika sel kosong atau tidak terbaca, kembalikan string kosong "".
"""


async def recognize_cells(cell_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Send all cells to Gemini in parallel with concurrency limit."""
    semaphore = asyncio.Semaphore(5)  # Max 5 concurrent Gemini calls

    async def recognize_one(cell: Dict[str, Any]) -> Dict[str, Any]:
        async with semaphore:
            return await _recognize_cell(cell)

    tasks = [recognize_one(cell) for cell in cell_data]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output: List[Dict[str, Any]] = []
    for cell, result in zip(cell_data, results):
        if isinstance(result, BaseException):
            output.append({**cell, "text": "", "confidence": 0.0, "error": str(result)})
        else:
            output.append(result)  # type: ignore[arg-type]

    return output


async def _recognize_cell(cell: Dict[str, Any]) -> Dict[str, Any]:
    """Recognize text in a single cell crop via Gemini vision."""
    crop = cell["crop"]
    if crop.size == 0:
        return {**cell, "text": "", "confidence": 0.0}

    # Encode crop as base64 JPEG
    _, img_encoded = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 90])
    b64 = base64.b64encode(img_encoded.tobytes()).decode()

    prompt = f"""{SYSTEM_PROMPT}

Konteks field: {cell['field_context']}

Baca teks dari gambar sel ini dan kembalikan nilai:"""

    model = genai.GenerativeModel(GEMINI_MODEL)

    response = await asyncio.to_thread(
        model.generate_content,
        [
            {"mime_type": "image/jpeg", "data": b64},
            prompt,
        ],
    )

    raw_text = response.text.strip() if response.text else ""
    confidence = _calculate_confidence(
        raw_text, cell["field_name"], cell.get("text_hint", "")
    )

    return {
        **cell,
        "text": raw_text,
        "confidence": confidence,
    }


def _calculate_confidence(text: str, field_name: str, hint: str) -> float:
    """
    Estimate confidence from:
    - Type validation for the field
    - Agreement with PP-StructureV3 text hint (if available)
    - Non-empty response
    """
    if not text:
        return 0.3 if not hint else 0.5  # Empty might be correct if cell was blank

    base = 0.75  # Default for non-empty response

    # Type validation bonuses
    if field_name in ("bb_lalu", "bb_sekarang"):
        # Valid weight: 1-30 kg
        cleaned = text.replace(",", ".")
        try:
            val = float(cleaned)
            if 1.0 <= val <= 30.0:
                base = 0.90
        except ValueError:
            base = 0.40

    elif field_name == "tb":
        cleaned = text.replace(",", ".")
        try:
            val = float(cleaned)
            if 30.0 <= val <= 130.0:
                base = 0.90
        except ValueError:
            base = 0.40

    elif field_name == "jenis_kelamin":
        if text.upper() in ("L", "P", "LAKI-LAKI", "PEREMPUAN"):
            base = 0.95
        else:
            base = 0.30

    elif field_name == "tanggal_lahir":
        if re.match(r"\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}", text):
            base = 0.88
        else:
            base = 0.45

    elif field_name == "status_nt":
        if text.upper() in ("N", "T", "NAIK", "TIDAK", "TIDAK NAIK"):
            base = 0.95
        else:
            base = 0.35

    elif field_name == "umur":
        # Should contain digits (months or year-month)
        if re.search(r"\d+", text):
            base = 0.85
        else:
            base = 0.45

    elif field_name == "nama_anak":
        # Names should be mostly alphabetic
        alpha_ratio = sum(1 for c in text if c.isalpha()) / max(len(text), 1)
        if alpha_ratio > 0.7:
            base = 0.85

    # Agreement with PP-StructureV3 hint boosts confidence
    if hint and hint.lower().strip() == text.lower().strip():
        base = min(base + 0.10, 1.0)

    return round(base, 2)
