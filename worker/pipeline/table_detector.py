"""
Table structure detection using PP-StructureV3 (paddleocr).
Fallback: OpenCV morphological operations for line detection.

Returns list of cell dicts: { row_idx, col_idx, x1, y1, x2, y2, text_hint? }
"""
import cv2
import numpy as np
from typing import List, Dict, Any


def detect_table(img: np.ndarray) -> List[Dict[str, Any]]:
    """Detect table cells. Try PP-StructureV3 first, fall back to OpenCV."""
    try:
        return _detect_with_paddleocr(img)
    except Exception as e:
        print(f"PP-StructureV3 failed: {e}. Falling back to OpenCV.")
        return _detect_with_opencv(img)


# ---------- PP-StructureV3 ----------


def _detect_with_paddleocr(img: np.ndarray) -> List[Dict[str, Any]]:
    """Import inside function to avoid slow module-level import."""
    from paddleocr import PPStructure

    engine = PPStructure(table=True, ocr=False, show_log=False)
    result = engine(img)

    cells: List[Dict[str, Any]] = []
    for region in result:
        if region.get("type") == "table":
            html = region.get("res", {}).get("html", "")
            bbox = region.get("bbox", [0, 0, img.shape[1], img.shape[0]])
            cells = _parse_table_html(html, bbox)
            break

    if not cells:
        raise ValueError("No table detected by PP-StructureV3")
    return cells


def _parse_table_html(html: str, table_bbox: list) -> List[Dict[str, Any]]:
    """
    Parse PP-StructureV3 HTML table output to row/col indices + estimated bboxes.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    rows = soup.find_all("tr")
    cells: List[Dict[str, Any]] = []
    tx1, ty1, tx2, ty2 = table_bbox
    row_h = (ty2 - ty1) / max(len(rows), 1)

    for row_idx, tr in enumerate(rows):
        tds = tr.find_all(["td", "th"])
        col_count = len(tds)
        col_w = (tx2 - tx1) / max(col_count, 1)
        for col_idx, td in enumerate(tds):
            x1 = int(tx1 + col_idx * col_w)
            y1 = int(ty1 + row_idx * row_h)
            x2 = int(x1 + col_w)
            y2 = int(y1 + row_h)
            cells.append(
                {
                    "row_idx": row_idx,
                    "col_idx": col_idx,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "text_hint": td.get_text(strip=True),
                }
            )
    return cells


# ---------- OpenCV fallback ----------


def _detect_with_opencv(img: np.ndarray) -> List[Dict[str, Any]]:
    """Detect table grid lines using morphological operations."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(
        gray, 127, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
    )

    # Horizontal lines
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    h_lines = cv2.dilate(
        cv2.erode(thresh, h_kernel, iterations=3), h_kernel, iterations=3
    )

    # Vertical lines
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    v_lines = cv2.dilate(
        cv2.erode(thresh, v_kernel, iterations=3), v_kernel, iterations=3
    )

    # Combine and find cell contours
    grid = cv2.bitwise_or(h_lines, v_lines)
    contours, _ = cv2.findContours(grid, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    rects = []
    img_area = img.shape[0] * img.shape[1]
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        area = w * h
        # Filter: cell must be reasonable size (not full image, not tiny)
        if w > 30 and h > 15 and area < img_area * 0.8:
            rects.append((x, y, x + w, y + h))

    return _assign_row_col(rects)


def _assign_row_col(rects: List[tuple]) -> List[Dict[str, Any]]:
    """Assign row/col indices by clustering y-coordinates."""
    if not rects:
        return []

    rects_sorted = sorted(rects, key=lambda r: (r[1], r[0]))
    rows: List[List[tuple]] = []
    current_row: List[tuple] = [rects_sorted[0]]
    row_y = rects_sorted[0][1]

    for rect in rects_sorted[1:]:
        if abs(rect[1] - row_y) < 15:
            current_row.append(rect)
        else:
            rows.append(sorted(current_row, key=lambda r: r[0]))
            current_row = [rect]
            row_y = rect[1]
    rows.append(sorted(current_row, key=lambda r: r[0]))

    cells: List[Dict[str, Any]] = []
    for row_idx, row in enumerate(rows):
        for col_idx, (x1, y1, x2, y2) in enumerate(row):
            cells.append(
                {
                    "row_idx": row_idx,
                    "col_idx": col_idx,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                }
            )
    return cells
