"""Three-language script segmentation into Sinhala, Tamil, English, and Mixed."""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import unicodedata

from hansard_rag.config import settings
from hansard_rag.language.normalization import clean_hansard_text
from hansard_rag.language.unicode_rules import detect_dominant_script
from hansard_rag.language.validation import validate_secondary_language
from hansard_rag.models import ExtractedPage, HansardDocument, LanguageSegment

logger = logging.getLogger(__name__)

HEADER_TEMPLATE = """============================================================
SRI LANKA PARLIAMENT HANSARD
Date: {sitting_date}
Language: {language_name}
Language code: {language_code}
Official source: {source_url}
Document ID: {document_id}
SHA-256: {sha256}
Extraction status: {status}
Generated at: {generated_at}
============================================================

"""

LANGUAGE_NAMES = {
    "si": "Sinhala",
    "ta": "Tamil",
    "en": "English",
    "mixed": "Mixed Languages",
}


def generate_segment_id(doc_id: str, page_num: int, index: int, text: str) -> str:
    """Generate deterministic hash-based segment identifier."""
    raw = f"{doc_id}:{page_num}:{index}:{text.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


class LanguageSeparator:
    """Separates extracted Hansard pages into discrete language streams and segment records."""

    def split_page_into_blocks(self, raw_text: str) -> List[str]:
        """Group lines into coherent paragraphs or script blocks."""
        paragraphs = raw_text.split("\n\n")
        blocks: List[str] = []
        for p in paragraphs:
            cleaned = p.strip()
            if cleaned:
                blocks.append(cleaned)
        return blocks

    def process_pages(
        self,
        doc: HansardDocument,
        pages: List[ExtractedPage],
    ) -> List[LanguageSegment]:
        """Perform Unicode script separation across all pages of a Hansard document."""
        segments: List[LanguageSegment] = []
        last_dominant = "en"

        for page in pages:
            blocks = self.split_page_into_blocks(page.raw_text)

            for b_idx, block in enumerate(blocks):
                cleaned_block = clean_hansard_text(block)
                if not cleaned_block:
                    continue

                dominant_script, confidence = detect_dominant_script(cleaned_block)

                # Attach common-only blocks (digits, symbols) to preceding context
                if dominant_script == "common":
                    language = last_dominant
                    confidence = 0.8
                elif dominant_script == "mixed":
                    language = "mixed"
                else:
                    language = dominant_script
                    last_dominant = dominant_script

                # Secondary validation check
                language = validate_secondary_language(cleaned_block, language) or language

                col_start = None
                col_end = None
                if page.printed_page_or_column:
                    parts = page.printed_page_or_column.split("-")
                    col_start = parts[0].strip()
                    if len(parts) > 1:
                        col_end = parts[1].strip()

                seg_id = generate_segment_id(doc.document_id, page.pdf_page, b_idx, cleaned_block)

                seg = LanguageSegment(
                    segment_id=seg_id,
                    document_id=doc.document_id,
                    sitting_date=doc.sitting_date,
                    language=language,
                    text=cleaned_block,
                    pdf_page_start=page.pdf_page,
                    pdf_page_end=page.pdf_page,
                    printed_column_start=col_start,
                    printed_column_end=col_end,
                    source_url=doc.official_pdf_url,
                    extraction_method=page.extraction_method,
                    language_confidence=confidence,
                    quality_flags=page.quality_flags,
                )
                segments.append(seg)

        return segments

    def export_language_files(
        self,
        doc: HansardDocument,
        segments: List[LanguageSegment],
    ) -> Dict[str, Path]:
        """Produce si.txt, ta.txt, en.txt, all.txt, and segments.jsonl."""
        year = doc.sitting_date[:4]
        out_dir = settings.languages_dir / year / doc.sitting_date
        out_dir.mkdir(parents=True, exist_ok=True)

        lang_texts: Dict[str, List[str]] = {"si": [], "ta": [], "en": [], "mixed": []}
        all_texts: List[str] = []

        segments_file = out_dir / "segments.jsonl"
        with open(segments_file, "w", encoding="utf-8") as sf:
            for seg in segments:
                sf.write(seg.model_dump_json() + "\n")
                lang_texts.setdefault(seg.language, []).append(seg.text)
                all_texts.append(f"[{seg.language.upper()} | Page {seg.pdf_page_start}]\n{seg.text}\n")

        now_iso = datetime.now(timezone.utc).isoformat()
        status = "complete" if doc.download_status in ("downloaded", "skipped") else "partial"

        created_files: Dict[str, Path] = {"segments": segments_file}

        # Write each language file with official header
        for code in ["si", "ta", "en"]:
            lang_file = out_dir / f"{code}.txt"
            body = "\n\n".join(lang_texts.get(code, []))
            header = HEADER_TEMPLATE.format(
                sitting_date=doc.sitting_date,
                language_name=LANGUAGE_NAMES[code],
                language_code=code,
                source_url=doc.official_pdf_url,
                document_id=doc.document_id,
                sha256=doc.sha256 or "N/A",
                status=status,
                generated_at=now_iso,
            )
            with open(lang_file, "w", encoding="utf-8") as lf:
                lf.write(header + body)
            created_files[code] = lang_file

        # Write unified all.txt
        all_file = out_dir / "all.txt"
        with open(all_file, "w", encoding="utf-8") as af:
            af.write("\n\n".join(all_texts))
        created_files["all"] = all_file

        logger.info(
            "Language separation exported for %s: si=%d, ta=%d, en=%d, mixed=%d segments",
            doc.sitting_date,
            len(lang_texts.get("si", [])),
            len(lang_texts.get("ta", [])),
            len(lang_texts.get("en", [])),
            len(lang_texts.get("mixed", [])),
        )
        return created_files
