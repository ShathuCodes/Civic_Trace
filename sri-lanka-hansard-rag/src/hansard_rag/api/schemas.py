"""API request and response schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from hansard_rag.models import AskResponse, Citation, EvidenceItem


class SearchRequest(BaseModel):
    query: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    language: Optional[str] = Field(default="auto", description="si | ta | en | auto | all")
    speaker: Optional[str] = None
    section: Optional[str] = None
    top_k: int = Field(default=8, ge=1, le=50)
    score_threshold: Optional[float] = None


class SearchResponse(BaseModel):
    query: str
    detected_language: str
    results_count: int
    results: List[Dict[str, Any]]


class AskRequest(BaseModel):
    question: str
    language: Optional[str] = Field(default="auto", description="si | ta | en | auto")
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    top_k: int = Field(default=8, ge=1, le=50)


class SyncRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    force: bool = False
    limit: Optional[int] = None


class SyncResponse(BaseModel):
    status: str
    discovered: int
    downloaded: int
    extracted: int
    chunked: int
    indexed: int
    message: str


class StatsResponse(BaseModel):
    status: str
    qdrant_collection: str
    total_vectors_indexed: int
    total_documents_discovered: int
    embedding_provider: str
    embedding_model: str
