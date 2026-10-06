"""Tests for Hansard discovery, HTML parsing, and pagination handling."""

import pytest
from hansard_rag.crawler.discovery import HansardDiscovery, generate_document_id, parse_sitting_date

SAMPLE_HTML = """
<html>
<body>
  <div class="row white_box p-4 m-auto img_border news_box mb-4">
    <h1 class="sub_heading mb-1">Hansard of 2026-09-23</h1>
    <a href="https://www.parliament.lk/uploads/businessdocs/english/24387_english_2026-09-23.pdf">Download</a>
  </div>
  <div class="row white_box p-4 m-auto img_border news_box mb-4">
    <h1 class="sub_heading mb-1">Hansard of September 22, 2026</h1>
    <a href="/uploads/businessdocs/english/24384_english_2026-09-22.pdf">Download</a>
  </div>
  <ul class="pagination">
    <li class="page-item active"><a class="page-link" href="?page=1">1</a></li>
    <li class="page-item"><a class="page-link" href="?page=2">2</a></li>
    <li class="page-item"><a class="page-link" href="?page=221">221</a></li>
  </ul>
</body>
</html>
"""


def test_parse_sitting_date():
    assert parse_sitting_date("Hansard of 2026-09-23") == "2026-09-23"
    assert parse_sitting_date("Hansard of April 04, 2006") == "2006-04-04"
    assert parse_sitting_date("Unrelated Title", fallback_url="https://site.lk/24387_english_2026-09-23.pdf") == "2026-09-23"


def test_generate_document_id():
    doc_id = generate_document_id("https://www.parliament.lk/uploads/test_doc.pdf", "2026-09-23")
    assert doc_id == "hansard_2026-09-23_test_doc"


def test_parse_page_html():
    discovery = HansardDiscovery()
    docs, max_page = discovery.parse_page_html(SAMPLE_HTML, "https://www.parliament.lk/en/business-of-parliament/hansards")

    assert len(docs) == 2
    assert max_page == 221

    assert docs[0].sitting_date == "2026-09-23"
    assert docs[0].official_pdf_url == "https://www.parliament.lk/uploads/businessdocs/english/24387_english_2026-09-23.pdf"

    assert docs[1].sitting_date == "2026-09-22"
    assert docs[1].official_pdf_url == "https://www.parliament.lk/uploads/businessdocs/english/24384_english_2026-09-22.pdf"
