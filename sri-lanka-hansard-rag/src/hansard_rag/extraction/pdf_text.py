"""Layered PDF text extraction pipeline: PyMuPDF -> pdfplumber -> Tesseract OCR."""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pdfplumber
import pymupdf

from hansard_rag.config import settings
from hansard_rag.extraction.layout import clean_running_headers_and_footers, extract_column_numbers
from hansard_rag.extraction.ocr import ocr_page
from hansard_rag.extraction.quality import calculate_page_quality, count_script_characters
from hansard_rag.models import ExtractedPage, HansardDocument

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extracts text from Hansard PDFs preserving page structure, quality scores, and columns."""

    def __init__(self, ocr_enabled: bool = settings.ocr_enabled):
        self.ocr_enabled = ocr_enabled

    def extract_page_with_pdfplumber(self, pdf_path: Path, page_num_0_based: int) -> str:
        """Fallback extraction using pdfplumber for a specific page."""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                if 0 <= page_num_0_based < len(pdf.pages):
                    text = pdf.pages[page_num_0_based].extract_text() or ""
                    return text.strip()
        except Exception as e:
            logger.warning("pdfplumber extraction failed for page %d of %s: %s", page_num_0_based + 1, pdf_path.name, e)
        return ""

    def process_document(self, doc: HansardDocument) -> Tuple[List[ExtractedPage], Dict[str, any]]:
        """Process an entire PDF file and generate page records and summary report."""
        if not doc.local_pdf_path or not Path(doc.local_pdf_path).exists():
            raise FileNotFoundError(f"PDF file for document {doc.document_id} not found: {doc.local_pdf_path}")

        pdf_path = Path(doc.local_pdf_path)
        extracted_pages: List[ExtractedPage] = []
        doc_fitz = pymupdf.open(pdf_path)
        total_pages = len(doc_fitz)

        logger.info("Extracting %d pages from %s (%s)", total_pages, pdf_path.name, doc.sitting_date)

        method_counts: Dict[str, int] = {"pymupdf": 0, "pdfplumber": 0, "ocr": 0, "hybrid": 0, "empty": 0}
        total_chars = 0
        total_sin = 0
        total_tam = 0
        total_lat = 0

        year = doc.sitting_date[:4]
        out_dir = settings.extracted_dir / year / doc.sitting_date
        out_dir.mkdir(parents=True, exist_ok=True)
        pages_file = out_dir / "pages.jsonl"
        all_text_file = out_dir / "all.txt"
        report_file = out_dir / "extraction_report.json"

        all_text_lines: List[str] = []

        with open(pages_file, "w", encoding="utf-8") as pf:
            for page_idx in range(total_pages):
                pdf_page_num = page_idx + 1
                page = doc_fitz[page_idx]

                # Step 1: PyMuPDF extraction
                text = page.get_text() or ""
                method = "pymupdf"
                quality_score, flags = calculate_page_quality(text, settings.ocr_min_text_characters)

                # Step 2: pdfplumber comparison if quality is poor or short
                if ("low_quality_score" in flags or "high_replacement_chars" in flags) and quality_score < 0.6:
                    plumber_text = self.extract_page_with_pdfplumber(pdf_path, page_idx)
                    if plumber_text:
                        p_score, p_flags = calculate_page_quality(plumber_text, settings.ocr_min_text_characters)
                        if p_score > quality_score:
                            text = plumber_text
                            quality_score = p_score
                            flags = p_flags
                            method = "pdfplumber"

                # Step 3: OCR fallback if still sub-threshold or empty (and enabled)
                if self.ocr_enabled and quality_score < 0.35 and len(text.strip()) < settings.ocr_min_text_characters:
                    # Skip obvious intentional blank pages (e.g. blank back covers)
                    if not (page_idx in [1, 3] and len(text.strip()) == 0 and page.rect.width > 0):
                        ocr_text, ocr_conf, ocr_err = ocr_page(page)
                        if ocr_text:
                            o_score, o_flags = calculate_page_quality(ocr_text, settings.ocr_min_text_characters)
                            if o_score > quality_score:
                                text = ocr_text
                                quality_score = o_score
                                flags = o_flags
                                method = "ocr"
                        elif ocr_err:
                            flags.append("ocr_unavailable_or_failed")

                if len(text.strip()) == 0:
                    method_counts["empty"] += 1
                else:
                    method_counts[method] += 1

                # Layout: detect columns and clean extreme running headers
                columns = extract_column_numbers(text)
                cleaned_lines = clean_running_headers_and_footers(text.splitlines())
                cleaned_text = "\n".join(cleaned_lines)

                script_counts = count_script_characters(cleaned_text)
                total_chars += script_counts["total"]
                total_sin += script_counts["sinhala"]
                total_tam += script_counts["tamil"]
                total_lat += script_counts["latin"]

                page_record = ExtractedPage(
                    document_id=doc.document_id,
                    sitting_date=doc.sitting_date,
                    pdf_page=pdf_page_num,
                    printed_page_or_column=columns,
                    extraction_method=method,
                    quality_score=quality_score,
                    raw_text=cleaned_text,
                    source_url=doc.official_pdf_url,
                    character_count=script_counts["total"],
                    sinhala_characters=script_counts["sinhala"],
                    tamil_characters=script_counts["tamil"],
                    latin_characters=script_counts["latin"],
                    replacement_characters=script_counts["replacement"],
                    quality_flags=flags,
                )
                extracted_pages.append(page_record)
                pf.write(page_record.model_dump_json() + "\n")

                if cleaned_text.strip():
                    all_text_lines.append(f"--- [Page {pdf_page_num}] [Columns: {columns or 'N/A'}] ---")
                    all_text_lines.append(cleaned_text)
                    all_text_lines.append("")

        doc_fitz.close()

        # Write unified all.txt
        with open(all_text_file, "w", encoding="utf-8") as af:
            af.write("\n".join(all_text_lines))

        # Build extraction report
        report = {
            "document_id": doc.document_id,
            "sitting_date": doc.sitting_date,
            "total_pdf_pages": total_pages,
            "extraction_methods": method_counts,
            "total_characters": total_chars,
            "sinhala_characters": total_sin,
            "tamil_characters": total_tam,
            "latin_characters": total_lat,
            "has_sinhala": total_sin > 50,
            "has_tamil": total_tam > 50,
            "has_english": total_lat > 50,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
        }

        with open(report_file, "w", encoding="utf-8") as rf:
            json.dump(report, rf, indent=2, ensure_ascii=False)

        logger.info(
            "Extraction completed for %s: %d chars (Sinhala=%d, Tamil=%d, Latin=%d)",
            doc.sitting_date,
            total_chars,
            total_sin,
            total_tam,
            total_lat,
        )
        return extracted_pages, report
