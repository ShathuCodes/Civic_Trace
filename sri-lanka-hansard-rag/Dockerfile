FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies: Tesseract OCR + Sinhala & Tamil language packs + Poppler
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    tesseract-ocr \
    tesseract-ocr-sin \
    tesseract-ocr-tam \
    tesseract-ocr-eng \
    poppler-utils \
    libmupdf-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency specifications and install
COPY pyproject.toml .
RUN pip install --upgrade pip && \
    pip install ".[dev]"

# Copy source code and scripts
COPY src/ /app/src/
COPY data/ /app/data/
COPY tests/ /app/tests/
COPY .env.example /app/.env.example

# Install project in editable mode
RUN pip install -e .

EXPOSE 8000

CMD ["uvicorn", "hansard_rag.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
