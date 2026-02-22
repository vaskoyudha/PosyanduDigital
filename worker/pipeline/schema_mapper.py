"""
Map recognized OCR cell outputs to posyandu register row schema.
Write results to ocr_extracted_rows table in Supabase.

DB columns (from 005_create_ocr_tables.sql):
  nama_anak, nama_anak_confidence,
  tanggal_lahir, tanggal_lahir_confidence,
  umur, umur_confidence,
  jenis_kelamin, jenis_kelamin_confidence,
  nama_ibu, nama_ibu_confidence,
  alamat, alamat_confidence,
  bb_lalu, bb_lalu_confidence,
  bb_sekarang, bb_sekarang_confidence,
  tb, tb_confidence,
  status_nt, status_nt_confidence,
  bbox (jsonb), is_reviewed, is_approved, corrections
"""
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from supabase import Client


def map_to_schema(recognized_cells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Group cells by row_idx, then assemble into row dicts matching
    ocr_extracted_rows schema.
    """
    rows: Dict[int, Dict[str, Any]] = {}

    for cell in recognized_cells:
        row_idx = cell["row_idx"]
        if row_idx not in rows:
            rows[row_idx] = {
                "row_index": row_idx,
                "_confidences": {},
                "_bboxes": {},
            }

        field = cell["field_name"]
        raw_text = cell.get("text", "")
        confidence = cell.get("confidence", 0.0)

        # Store per-field confidence and bbox
        rows[row_idx]["_confidences"][field] = confidence
        rows[row_idx]["_bboxes"][field] = cell.get("bbox", {})

        # Parse field value
        rows[row_idx][field] = _parse_field(field, raw_text)
        rows[row_idx][f"{field}_confidence"] = confidence

    # Calculate average confidence per row
    result: List[Dict[str, Any]] = []
    for row in rows.values():
        conf_values = list(row["_confidences"].values())
        row["_confidence_avg"] = (
            round(sum(conf_values) / len(conf_values), 2) if conf_values else 0.0
        )
        result.append(row)

    return sorted(result, key=lambda r: r["row_index"])


def _parse_field(field: str, raw: str) -> Optional[str]:
    """Parse raw OCR text. All values stored as strings in DB (VARCHAR columns)."""
    raw = raw.strip()
    if not raw:
        return None

    if field in ("bb_lalu", "bb_sekarang", "tb"):
        # Normalize decimal separator
        cleaned = raw.replace(",", ".")
        # Validate it looks like a number
        try:
            float(cleaned)
            return cleaned
        except ValueError:
            # Return raw — reviewer can fix
            return raw

    elif field == "tanggal_lahir":
        return _parse_date(raw) or raw

    elif field == "jenis_kelamin":
        upper = raw.upper()
        if upper in ("L", "LAKI", "LAKI-LAKI", "PRIA"):
            return "L"
        elif upper in ("P", "PEREMPUAN", "WANITA"):
            return "P"
        return raw

    elif field == "status_nt":
        upper = raw.upper()
        if upper in ("N", "NAIK"):
            return "N"
        elif upper in ("T", "TIDAK", "TIDAK NAIK"):
            return "T"
        return raw

    return raw


def _parse_date(raw: str) -> Optional[str]:
    """Parse various date formats to DD/MM/YYYY (stored as string in VARCHAR)."""
    if not raw:
        return None

    # Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    m = re.match(r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})", raw)
    if m:
        day, month, year = m.group(1), m.group(2), m.group(3)
        if len(year) == 2:
            year = "20" + year if int(year) < 50 else "19" + year
        try:
            dt = datetime(int(year), int(month), int(day))
            if 2010 <= dt.year <= 2030:
                return f"{int(day):02d}/{int(month):02d}/{year}"
        except ValueError:
            pass

    return None


def write_extracted_rows(
    supabase: Client, document_id: str, rows: List[Dict[str, Any]]
):
    """Write all extracted rows to ocr_extracted_rows table."""
    if not rows:
        return

    # Fields that map directly to DB columns
    DATA_FIELDS = [
        "nama_anak",
        "tanggal_lahir",
        "umur",
        "jenis_kelamin",
        "nama_ibu",
        "alamat",
        "bb_lalu",
        "bb_sekarang",
        "tb",
        "status_nt",
    ]
    CONFIDENCE_FIELDS = [f"{f}_confidence" for f in DATA_FIELDS]

    records = []
    for row in rows:
        record: Dict[str, Any] = {
            "document_id": document_id,
            "row_index": row.get("row_index", 0),
            "is_reviewed": False,
            "is_approved": False,
        }

        # Data fields
        for field in DATA_FIELDS:
            record[field] = row.get(field)

        # Confidence fields
        for field in CONFIDENCE_FIELDS:
            record[field] = row.get(field)

        # Aggregate bbox from first cell's bbox (row-level)
        bboxes = row.get("_bboxes", {})
        if bboxes:
            # Use the union of all cell bboxes for the row
            all_bboxes = list(bboxes.values())
            if all_bboxes and isinstance(all_bboxes[0], dict):
                min_x = min(b.get("x", 0) for b in all_bboxes)
                min_y = min(b.get("y", 0) for b in all_bboxes)
                max_x = max(
                    b.get("x", 0) + b.get("width", 0) for b in all_bboxes
                )
                max_y = max(
                    b.get("y", 0) + b.get("height", 0) for b in all_bboxes
                )
                record["bbox"] = {
                    "x": min_x,
                    "y": min_y,
                    "width": max_x - min_x,
                    "height": max_y - min_y,
                }

        records.append(record)

    # Batch insert
    supabase.table("ocr_extracted_rows").insert(records).execute()
