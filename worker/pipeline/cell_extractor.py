"""
Crop individual cells from detected bounding boxes.
Map column index to posyandu register field names matching the
ocr_extracted_rows DB schema.

Posyandu Format 3 column mapping (0-indexed):
  0:  nama_anak
  1:  tanggal_lahir
  2:  umur
  3:  jenis_kelamin (L/P)
  4:  nama_ibu
  5:  alamat
  6:  bb_lalu (BB bulan lalu)
  7:  bb_sekarang (BB bulan ini)
  8:  tb (TB/PB)
  9:  status_nt (N/T)
"""
import cv2
import numpy as np
from typing import List, Dict, Any


# Column index → DB field name (matches ocr_extracted_rows columns)
COLUMN_FIELD_MAP: Dict[int, str] = {
    0: "nama_anak",
    1: "tanggal_lahir",
    2: "umur",
    3: "jenis_kelamin",
    4: "nama_ibu",
    5: "alamat",
    6: "bb_lalu",
    7: "bb_sekarang",
    8: "tb",
    9: "status_nt",
}

# Context prompts for Gemini per field (Indonesian)
FIELD_CONTEXT: Dict[str, str] = {
    "nama_anak": "Nama lengkap anak balita, bahasa Indonesia, kemungkinan tulisan tangan",
    "tanggal_lahir": "Tanggal lahir anak, format DD/MM/YYYY atau DD-MM-YYYY",
    "umur": "Umur anak dalam bulan atau tahun-bulan, contoh: 24 bln, 2 th 3 bln",
    "jenis_kelamin": "Jenis kelamin anak, L untuk laki-laki atau P untuk perempuan",
    "nama_ibu": "Nama ibu kandung anak, bahasa Indonesia",
    "alamat": "Alamat rumah, bisa singkatan RT/RW, nama dusun/kampung",
    "bb_lalu": "Berat badan bulan lalu dalam kg, format X.X seperti 8.5 atau 12.0",
    "bb_sekarang": "Berat badan bulan ini dalam kg, format X.X seperti 8.5 atau 12.0",
    "tb": "Tinggi/panjang badan anak dalam cm, format XX.X seperti 75.5 atau 100.0",
    "status_nt": "Status kenaikan berat badan: N berarti Naik, T berarti Tidak Naik",
}


def extract_cells(
    img: np.ndarray, table_cells: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Crop each cell from the image and attach field metadata.
    Skip header rows (row_idx == 0).

    Returns list of dicts with:
      row_idx, col_idx, field_name, field_context, crop, text_hint, bbox
    """
    extracted: List[Dict[str, Any]] = []
    h_img, w_img = img.shape[:2]

    for cell in table_cells:
        row_idx = cell["row_idx"]
        col_idx = cell["col_idx"]

        # Skip header row
        if row_idx == 0:
            continue

        field_name = COLUMN_FIELD_MAP.get(col_idx)
        if field_name is None:
            continue  # Extra columns beyond mapping are ignored

        x1 = max(0, cell["x1"])
        y1 = max(0, cell["y1"])
        x2 = min(w_img, cell["x2"])
        y2 = min(h_img, cell["y2"])

        if x2 <= x1 or y2 <= y1:
            continue

        crop = img[y1:y2, x1:x2]

        extracted.append(
            {
                "row_idx": row_idx,
                "col_idx": col_idx,
                "field_name": field_name,
                "field_context": FIELD_CONTEXT.get(field_name, ""),
                "crop": crop,
                "text_hint": cell.get("text_hint", ""),
                "bbox": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
            }
        )

    return extracted
