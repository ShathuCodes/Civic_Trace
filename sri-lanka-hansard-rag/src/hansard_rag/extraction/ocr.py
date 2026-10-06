"""Multilingual OCR fallback module for Sinhala, Tamil, and English."""

import io
import logging
from typing import Optional, Tuple
from PIL import Image
import pymupdf

from hansard_rag.config import settings

logger = logging.getLogger(__name__)


def is_tesseract_available() -> bool:
    """Check if tesseract binary and python bindings are available."""
    try:
        import pytesseract
        if settings.tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd
        _ = pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def ocr_page(
    page: pymupdf.Page,
    lang: str = "sin+tam+eng",
    dpi: int = 300,
) -> Tuple[str, float, Optional[str]]:
    """Render page as high-DPI image and perform OCR using Tesseract."""
    if not is_tesseract_available():
        return "", 0.0, "Tesseract binary or language packs not found on system"

    import pytesseract

    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    try:
        # Render page pixmap
        zoom = dpi / 72.0
        mat = pymupdf.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_bytes = pix.tobytes("png")
        image = Image.open(io.BytesIO(img_bytes))

        # Run OCR with Sinhala, Tamil, and English
        # If specific packs are missing, fallback gracefully to eng
        try:
            text = pytesseract.image_to_string(image, lang=lang)
        except pytesseract.TesseractError as te:
            logger.warning("OCR failed with full lang %s: %s. Falling back to eng.", lang, te)
            text = pytesseract.image_to_string(image, lang="eng")

        return text.strip(), 0.75, None

    except Exception as e:
        logger.error("OCR execution error on page: %s", e)
        return "", 0.0, str(e)
