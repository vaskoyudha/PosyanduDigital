"""
Environment configuration for the PosyanduDigital OCR Worker.
All secrets are read from environment variables (set in Railway dashboard).
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Supabase
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
STORAGE_BUCKET = "ocr-documents"

# Gemini API (handwriting recognition)
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
GEMINI_MODEL = "gemini-2.5-flash-preview-04-17"

# Worker authentication (optional shared secret with Next.js app)
WORKER_SECRET = os.getenv("WORKER_SECRET", "")

# Confidence thresholds
HIGH_CONFIDENCE = 0.90
LOW_CONFIDENCE = 0.65
