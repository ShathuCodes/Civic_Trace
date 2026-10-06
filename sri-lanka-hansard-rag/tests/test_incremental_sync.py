"""Tests for incremental sync, checkpointing, and resume behavior."""

import hashlib
import json
import pytest
from hansard_rag.crawler.downloader import HansardDownloader, PDF_MAGIC
from hansard_rag.crawler.state import CrawlState
from hansard_rag.models import HansardDocument


def test_crawl_state_checkpoint(tmp_path):
    state_file = tmp_path / "crawl_state.json"
    state = CrawlState(state_file=state_file)

    state.add_discovered_url("https://parliament.lk/doc1.pdf")
    state.mark_downloaded("doc_1")
    state.mark_failed("doc_2")

    # Reload from disk
    reloaded = CrawlState(state_file=state_file)
    assert "https://parliament.lk/doc1.pdf" in reloaded.discovered_urls
    assert "doc_1" in reloaded.state["downloaded_document_ids"]
    assert "doc_2" in reloaded.state["failed_document_ids"]


@pytest.mark.asyncio
async def test_skip_already_downloaded(tmp_path):
    state = CrawlState(state_file=tmp_path / "state.json")
    failures = tmp_path / "failures.jsonl"
    downloader = HansardDownloader(state=state, failures_path=failures)

    # Mock destination file
    dummy_pdf_content = PDF_MAGIC + b"X" * 2000
    expected_sha = hashlib.sha256(dummy_pdf_content).hexdigest()

    doc = HansardDocument(
        document_id="doc_existing",
        sitting_date="2026-09-23",
        title="Hansard of 2026-09-23",
        source_listing_url="https://parliament.lk/hansards",
        official_pdf_url="https://parliament.lk/uploads/doc.pdf",
        discovered_at="2026-09-23T00:00:00Z",
        last_checked_at="2026-09-23T00:00:00Z",
    )

    dest_path = downloader.get_destination_path(doc)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(dummy_pdf_content)

    updated_doc = await downloader.download_document(doc, force=False)
    assert updated_doc.download_status in ("skipped", "downloaded")
    assert updated_doc.sha256 == expected_sha
    assert updated_doc.file_size_bytes == len(dummy_pdf_content)
