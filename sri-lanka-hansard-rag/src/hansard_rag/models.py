"""Data schemas and transfer models for Sri Lanka Hansard pipeline."""

from typing import List, Optional
from pydantic import BaseModel, Field


class HansardDocument(BaseModel):
    """Manifest record of an official Hansard sitting document."""
    document_id: str
    sitting_date: str = Field(description="ISO format YYYY-MM-DD")
    title: str
    legislature: Optional[str] = None
    session: Optional[str] = None
    source_listing_url: str
    official_pdf_url: str
    discovered_at: str
    last_checked_at: str
    sha256: Optional[str] = None
    file_size_bytes: Optional[int] = None
    download_status: str = Field(default="discovered", description="discovered | downloaded | skipped | failed")
    etag: Optional[str] = None
    last_modified: Optional[str] = None
    local_pdf_path: Optional[str] = None
    error_message: Optional[str] = None


class ExtractedPage(BaseModel):
    """Page-level extraction details and metrics."""
    document_id: str
    sitting_date: str
    pdf_page: int
    printed_page_or_column: Optional[str] = None
    extraction_method: str = Field(description="pymupdf | pdfplumber | ocr | hybrid")
    quality_score: float = Field(ge=0.0, le=1.0)
    raw_text: str
    source_url: str
    character_count: int = 0
    sinhala_characters: int = 0
    tamil_characters: int = 0
    latin_characters: int = 0
    replacement_characters: int = 0
    quality_flags: List[str] = Field(default_factory=list)


class LanguageSegment(BaseModel):
    """Script-separated parliamentary text segment."""
    segment_id: str
    document_id: str
    sitting_date: str
    language: str = Field(description="si | ta | en | mixed")
    text: str
    pdf_page_start: int
    pdf_page_end: int
    printed_column_start: Optional[str] = None
    printed_column_end: Optional[str] = None
    speaker: Optional[str] = None
    speaker_role: Optional[str] = None
    section: Optional[str] = None
    source_url: str
    extraction_method: str
    language_confidence: float = 1.0
    quality_flags: List[str] = Field(default_factory=list)


class HansardChunk(BaseModel):
    """Vector-ready chunk with comprehensive metadata."""
    chunk_id: str
    document_id: str
    sitting_date: str
    year: int
    language: str
    title: str
    section: Optional[str] = None
    speaker: Optional[str] = None
    speaker_role: Optional[str] = None
    question_number: Optional[str] = None
    bill_or_motion: Optional[str] = None
    pdf_page_start: int
    pdf_page_end: int
    printed_column_start: Optional[str] = None
    printed_column_end: Optional[str] = None
    source_url: str
    text: str
    text_sha256: str
    token_count: int
    extraction_methods: List[str] = Field(default_factory=list)
    quality_flags: List[str] = Field(default_factory=list)


class Citation(BaseModel):
    """Grounded citation pointing to the exact official PDF page."""
    sitting_date: str
    pdf_page: int
    printed_columns: Optional[str] = None
    source_url: str


class EvidenceItem(BaseModel):
    """Retrieved vector chunk evidence with relevance score."""
    chunk_id: str
    language: str
    score: float
    text: str
    sitting_date: Optional[str] = None
    pdf_page: Optional[int] = None
    source_url: Optional[str] = None
    speaker: Optional[str] = None


class AskResponse(BaseModel):
    """Response returned by the Multilingual RAG QA API."""
    answer: str
    answer_language: str
    citations: List[Citation]
    evidence: List[EvidenceItem]
