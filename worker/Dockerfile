FROM python:3.11-slim AS base

# System dependencies for OpenCV + PaddleOCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxrender1 libxext6 libgl1 \
    libgomp1 libgcc-s1 wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models (cache in image layer)
RUN python -c "from paddleocr import PPStructure; PPStructure(table=True, ocr=False, show_log=False)" || true

# Copy app code
COPY . .

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
