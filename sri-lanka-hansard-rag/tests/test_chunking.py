"""Tests for semantic multilingual chunking and deterministic IDs."""

import pytest
from hansard_rag.chunking.metadata import compute_chunk_id, estimate_multilingual_tokens
from hansard_rag.chunking.semantic_chunker import SemanticChunker
from hansard_rag.chunking.speaker_parser import parse_parliamentary_metadata, parse_speaker_and_role
from hansard_rag.models import HansardDocument, LanguageSegment
from tests.fixtures.synthetic_hansard import SYNTHETIC_ENGLISH_TEXT, SYNTHETIC_SINHALA_TEXT, SYNTHETIC_TAMIL_TEXT


def test_multilingual_token_estimation():
    # English
    en_tokens = estimate_multilingual_tokens("This is a simple sentence about parliament.")
    assert 5 <= en_tokens <= 15

    # Sinhala
    si_tokens = estimate_multilingual_tokens(SYNTHETIC_SINHALA_TEXT)
    assert 20 <= si_tokens <= 150

    # Tamil
    ta_tokens = estimate_multilingual_tokens(SYNTHETIC_TAMIL_TEXT)
    assert 20 <= ta_tokens <= 150


def test_deterministic_chunk_id():
    id1 = compute_chunk_id("doc_1", "si", 1, 2, "ස්ථාවර පාඨය")
    id2 = compute_chunk_id("doc_1", "si", 1, 2, "ස්ථාවර පාඨය")
    id3 = compute_chunk_id("doc_1", "si", 1, 2, "වෙනස් පාඨය")

    assert id1 == id2
    assert id1 != id3
    assert len(id1) == 24


def test_speaker_and_structure_parsing():
    speaker, role = parse_speaker_and_role("The Hon. Minister of Fisheries: Statement")
    assert speaker == "The Hon. Minister of Fisheries"
    assert role == "Minister"

    speaker_si, role_si = parse_speaker_and_role("ගරු කථානායකතුමා: අද දින")
    assert speaker_si == "ගරු කථානායකතුමා"
    assert role_si == "Speaker"

    section, q_num, _ = parse_parliamentary_metadata("ORAL ANSWERS TO QUESTIONS\nQuestion No. 45/2026")
    assert section == "ORAL ANSWERS TO QUESTIONS"
    assert q_num == "45/2026"


def test_semantic_chunker_speaker_preservation(tmp_path, monkeypatch):
    from hansard_rag.config import settings
    monkeypatch.setattr(settings, "chunks_dir", tmp_path / "chunks")

    doc = HansardDocument(
        document_id="doc_123",
        sitting_date="2026-09-23",
        title="Hansard of 2026-09-23",
        source_listing_url="https://parliament.lk/hansards",
        official_pdf_url="https://parliament.lk/sample.pdf",
        discovered_at="2026-09-23T00:00:00Z",
        last_checked_at="2026-09-23T00:00:00Z",
    )

    seg1 = LanguageSegment(
        segment_id="seg_1",
        document_id=doc.document_id,
        sitting_date=doc.sitting_date,
        language="en",
        text="The Speaker:\nOrder in the House please.",
        pdf_page_start=1,
        pdf_page_end=1,
        source_url=doc.official_pdf_url,
        extraction_method="pymupdf",
    )
    seg2 = LanguageSegment(
        segment_id="seg_2",
        document_id=doc.document_id,
        sitting_date=doc.sitting_date,
        language="en",
        text="The Hon. Minister of Fisheries:\nI present the annual report.",
        pdf_page_start=1,
        pdf_page_end=1,
        source_url=doc.official_pdf_url,
        extraction_method="pymupdf",
    )

    chunker = SemanticChunker(target_tokens=500, overlap_tokens=50)
    chunks = chunker.process_all_languages(doc, [seg1, seg2])

    assert len(chunks) >= 1
    assert all(c.language == "en" for c in chunks)
    assert all(c.year == 2026 for c in chunks)
    assert all(c.source_url == doc.official_pdf_url for c in chunks)
