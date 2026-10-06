"""Multilingual question routing and retrieval coordinator."""

import logging
from typing import List, Optional, Tuple

from hansard_rag.language.unicode_rules import detect_dominant_script
from hansard_rag.models import Citation, EvidenceItem
from hansard_rag.vectorstore.qdrant_store import HansardVectorStore

logger = logging.getLogger(__name__)


def detect_question_language(question: str) -> str:
    """Detect whether the question is Sinhala, Tamil, or English."""
    script, _ = detect_dominant_script(question)
    if script in ("si", "ta", "en"):
        return script
    return "en"


class HansardRetriever:
    """Retrieves relevant multilingual Hansard passages and formats citations."""

    def __init__(self, vectorstore: HansardVectorStore):
        self.vectorstore = vectorstore

    async def retrieve(
        self,
        query: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        language: Optional[str] = "auto",
        top_k: int = 8,
        score_threshold: Optional[float] = None,
    ) -> Tuple[List[EvidenceItem], List[Citation], str]:
        """Perform semantic retrieval and assemble citations and evidence."""
        query_lang = detect_question_language(query)

        # Target language filtering
        search_lang = None
        if language and language not in ("auto", "all"):
            search_lang = language

        hits = await self.vectorstore.search(
            query=query,
            start_date=start_date,
            end_date=end_date,
            language=search_lang,
            top_k=top_k,
            score_threshold=score_threshold,
        )

        evidence: List[EvidenceItem] = []
        citations: List[Citation] = []
        seen_citations = set()

        for h in hits:
            item = EvidenceItem(
                chunk_id=h["chunk_id"],
                language=h["language"],
                score=h["score"],
                text=h["text"],
                sitting_date=h.get("sitting_date"),
                pdf_page=h.get("pdf_page_start"),
                source_url=h.get("source_url"),
                speaker=h.get("speaker"),
            )
            evidence.append(item)

            # Deduplicate citations by (sitting_date, pdf_page, source_url)
            cit_key = (h.get("sitting_date"), h.get("pdf_page_start"), h.get("source_url"))
            if cit_key not in seen_citations and h.get("sitting_date") and h.get("pdf_page_start"):
                seen_citations.add(cit_key)
                citations.append(
                    Citation(
                        sitting_date=h["sitting_date"],
                        pdf_page=h["pdf_page_start"],
                        printed_columns=h.get("printed_column_start"),
                        source_url=h.get("source_url") or "",
                    )
                )

        return evidence, citations, query_lang
