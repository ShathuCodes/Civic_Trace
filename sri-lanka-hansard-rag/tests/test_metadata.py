"""Tests for document metadata, SHA-256 verification, and serialization."""

import hashlib
import json
import pytest
from hansard_rag.crawler.downloader import HansardDownloader, PDF_MAGIC
from hansard_rag.models import Citation, ExtractedPage, HansardChunk, HansardDocument


def test_pdf_magic_bytes(tmp_path):
    downloader = HansardDownloader()

    # Valid dummy PDF
    valid_pdf = tmp_path / "valid.pdf"
    valid_pdf.write_bytes(PDF_MAGIC + b"0123456789" * 200)
    assert downloader.is_valid_pdf(valid_pdf) is True

    # Invalid HTML page masquerading as PDF
    invalid_pdf = tmp_path / "error.pdf"
    invalid_pdf.write_text("<html><body>Error 404</body></html>" * 50)
    assert downloader.is_valid_pdf(invalid_pdf) is False


def test_chunk_serialization():
    chunk = HansardChunk(
        chunk_id="chk_abc123",
        document_id="doc_xyz",
        sitting_date="2026-09-23",
        year=2026,
        language="si",
        title="Hansard of 2026-09-23",
        section="Oral Answers",
        speaker="ගරු අමාත්‍යතුමා",
        speaker_role="Minister",
        pdf_page_start=5,
        pdf_page_end=6,
        printed_column_start="1815",
        printed_column_end="1816",
        source_url="https://parliament.lk/doc.pdf",
        text="නියැදි පාඨය",
        text_sha256=hashlib.sha256("නියැදි පාඨය".encode("utf-8")).hexdigest(),
        token_count=15,
        extraction_methods=["pymupdf"],
        quality_flags=[],
    )

    data = chunk.model_dump_json()
    loaded = HansardChunk.model_validate_json(data)
    assert loaded.chunk_id == "chk_abc123"
    assert loaded.speaker == "ගරු අමාත්‍යතුමා"
    assert loaded.printed_column_start == "1815"


def test_citation_model():
    cit = Citation(
        sitting_date="2026-09-23",
        pdf_page=5,
        printed_columns="1815-1816",
        source_url="https://parliament.lk/doc.pdf",
    )
    assert cit.pdf_page == 5
    assert cit.sitting_date == "2026-09-23"
