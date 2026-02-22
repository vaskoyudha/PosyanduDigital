"""
PosyanduDigital OCR Worker — FastAPI HTTP service.

Endpoints:
  POST /process  — Accept OCR job, run pipeline in background
  GET  /health   — Health check for Railway
"""
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import asyncio
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY, STORAGE_BUCKET, WORKER_SECRET
from pipeline.preprocessor import preprocess_image
from pipeline.table_detector import detect_table
from pipeline.cell_extractor import extract_cells
from pipeline.text_recognizer import recognize_cells
from pipeline.schema_mapper import map_to_schema, write_extracted_rows

app = FastAPI(title="PosyanduDigital OCR Worker")


class ProcessRequest(BaseModel):
    document_id: str
    storage_path: str


def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def update_status(
    supabase: Client,
    document_id: str,
    status: str,
    **kwargs,
):
    """Update ocr_documents status in Supabase."""
    update_data = {"status": status, **kwargs}
    supabase.table("ocr_documents").update(update_data).eq("id", document_id).execute()


# ---------- endpoints ----------


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/process")
async def process(request_body: ProcessRequest, request: Request):
    # Optional: validate shared secret
    if WORKER_SECRET:
        auth_header = request.headers.get("X-Worker-Secret", "")
        if auth_header != WORKER_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized")

    # Run pipeline in background (don't block the HTTP response)
    asyncio.create_task(
        run_pipeline(request_body.document_id, request_body.storage_path)
    )
    return {"status": "accepted", "document_id": request_body.document_id}


# ---------- pipeline orchestrator ----------


async def run_pipeline(document_id: str, storage_path: str):
    """
    Full OCR pipeline. Runs as a background asyncio task so POST /process
    returns immediately.

    Status progression (matches ocr_status enum):
      uploaded → preprocessing → detecting_table → extracting_cells
      → recognizing_text → awaiting_review
    On error: → failed
    """
    supabase = get_supabase()
    try:
        # Download image from Supabase Storage
        response = supabase.storage.from_(STORAGE_BUCKET).download(storage_path)
        image_bytes: bytes = response

        # Step 1: Preprocess
        update_status(supabase, document_id, "preprocessing")
        processed_image, preprocessed_path = await asyncio.to_thread(
            preprocess_image, image_bytes, storage_path, supabase
        )
        update_status(supabase, document_id, "preprocessing", preprocessed_path=preprocessed_path)

        # Step 2: Detect table structure
        update_status(supabase, document_id, "detecting_table")
        table_cells = await asyncio.to_thread(detect_table, processed_image)
        update_status(
            supabase,
            document_id,
            "detecting_table",
            table_detection_result={"cell_count": len(table_cells)},
        )

        # Step 3: Extract cells
        update_status(supabase, document_id, "extracting_cells")
        cell_crops = await asyncio.to_thread(extract_cells, processed_image, table_cells)
        update_status(
            supabase,
            document_id,
            "extracting_cells",
            cell_extraction_result={"crop_count": len(cell_crops)},
        )

        # Step 4: Recognize text (Gemini 2.5 Flash)
        update_status(supabase, document_id, "recognizing_text")
        recognized = await recognize_cells(cell_crops)

        # Step 5: Map schema + write rows
        rows = map_to_schema(recognized)
        write_extracted_rows(supabase, document_id, rows)

        # Calculate overall confidence
        if rows:
            avg_conf = sum(r.get("_confidence_avg", 0.0) for r in rows) / len(rows)
        else:
            avg_conf = 0.0

        # Done
        update_status(
            supabase,
            document_id,
            "awaiting_review",
            overall_confidence=round(avg_conf, 2),
            ocr_structured_result={
                "row_count": len(rows),
                "avg_confidence": round(avg_conf, 2),
            },
        )

    except Exception as e:
        update_status(
            supabase,
            document_id,
            "failed",
            error_message=str(e)[:1000],
        )
