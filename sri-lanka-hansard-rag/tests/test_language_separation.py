"""Tests for Unicode script separation and text normalization."""

import pytest
from hansard_rag.extraction.layout import clean_running_headers_and_footers, extract_column_numbers
from hansard_rag.language.normalization import clean_hansard_text, join_line_wrapped_words, normalize_unicode
from hansard_rag.language.separator import LanguageSeparator
from hansard_rag.language.unicode_rules import classify_char_script, detect_dominant_script
from hansard_rag.models import ExtractedPage, HansardDocument
from tests.fixtures.synthetic_hansard import SYNTHETIC_ENGLISH_TEXT, SYNTHETIC_MIXED_PAGE, SYNTHETIC_SINHALA_TEXT, SYNTHETIC_TAMIL_TEXT


def test_classify_char_script():
    assert classify_char_script("ග") == "si"
    assert classify_char_script("க") == "ta"
    assert classify_char_script("E") == "en"
    assert classify_char_script("5") == "common"
    assert classify_char_script(".") == "common"


def test_detect_dominant_script():
    script_si, conf_si = detect_dominant_script(SYNTHETIC_SINHALA_TEXT)
    assert script_si == "si"
    assert conf_si > 0.8

    script_ta, conf_ta = detect_dominant_script(SYNTHETIC_TAMIL_TEXT)
    assert script_ta == "ta"
    assert conf_ta > 0.8

    script_en, conf_en = detect_dominant_script(SYNTHETIC_ENGLISH_TEXT)
    assert script_en == "en"
    assert conf_en > 0.8


def test_normalization():
    # Wrap break
    broken = "Parlia-\nmentary debate"
    assert join_line_wrapped_words(broken) == "Parliamentary debate"

    # NFC and whitespace
    raw = "  වචනය    පරීක්ෂාව \n\n\n\n  දෙවන පේළිය  "
    cleaned = clean_hansard_text(raw)
    assert cleaned == "වචනය පරීක්ෂාව\n\nදෙවන පේළිය"


def test_header_and_column_detection():
    cols = extract_column_numbers("[Cols. 1815-1816]")
    assert cols == "1815-1816"

    lines = [
        "PARLIAMENTARY DEBATES",
        "Hon. Minister of Fisheries:",
        "Statement regarding ports.",
        "1816",
    ]
    cleaned = clean_running_headers_and_footers(lines)
    # The header and solitary page number should be cleaned, but Hon. Minister MUST be preserved
    assert "PARLIAMENTARY DEBATES" not in cleaned
    assert "1816" not in cleaned
    assert any("Hon. Minister of Fisheries:" in l for l in cleaned)


def test_language_separator_pipeline(tmp_path, monkeypatch):
    from hansard_rag.config import settings
    monkeypatch.setattr(settings, "languages_dir", tmp_path / "languages")

    doc = HansardDocument(
        document_id="hansard_2026-09-23_sample",
        sitting_date="2026-09-23",
        title="Hansard of 2026-09-23",
        source_listing_url="https://parliament.lk/hansards",
        official_pdf_url="https://parliament.lk/sample.pdf",
        discovered_at="2026-09-23T00:00:00Z",
        last_checked_at="2026-09-23T00:00:00Z",
        download_status="downloaded",
        sha256="abc123456",
    )

    page = ExtractedPage(
        document_id=doc.document_id,
        sitting_date=doc.sitting_date,
        pdf_page=5,
        printed_page_or_column="1815-1816",
        extraction_method="pymupdf",
        quality_score=0.95,
        raw_text=SYNTHETIC_MIXED_PAGE,
        source_url=doc.official_pdf_url,
    )

    separator = LanguageSeparator()
    segments = separator.process_pages(doc, [page])

    assert len(segments) >= 3
    langs = {s.language for s in segments}
    assert "si" in langs
    assert "ta" in langs
    assert "en" in langs

    exported = separator.export_language_files(doc, segments)
    assert exported["si"].exists()
    assert exported["ta"].exists()
    assert exported["en"].exists()

    # Check header content
    si_content = exported["si"].read_text(encoding="utf-8")
    assert "SRI LANKA PARLIAMENT HANSARD" in si_content
    assert "Language: Sinhala" in si_content
    assert "Official source: https://parliament.lk/sample.pdf" in si_content
