"""Tests for vector retrieval, filters, citation generation, and insufficient evidence handling."""

import hashlib
import pytest
from hansard_rag.embeddings.local import LocalEmbeddingProvider
from hansard_rag.models import HansardChunk
from hansard_rag.rag.answer import HansardRAGService, INSUFFICIENT_MESSAGES
from hansard_rag.rag.retrieval import HansardRetriever
from hansard_rag.vectorstore.qdrant_store import HansardVectorStore


@pytest.mark.asyncio
async def test_vectorstore_and_retrieval(tmp_path, monkeypatch):
    from hansard_rag.config import settings
    monkeypatch.setattr(settings, "data_dir", tmp_path / "data")

    embedder = LocalEmbeddingProvider()
    store = HansardVectorStore(embedder=embedder, collection_name="test_hansards")

    chunk_si = HansardChunk(
        chunk_id="chunk_si_1",
        document_id="doc_1",
        sitting_date="2026-09-23",
        year=2026,
        language="si",
        title="Hansard of 2026-09-23",
        section="Oral Questions",
        speaker="ගරු ධීවර අමාත්‍යතුමා",
        speaker_role="Minister",
        pdf_page_start=5,
        pdf_page_end=5,
        printed_column_start="1815",
        printed_column_end="1816",
        source_url="https://parliament.lk/hansard_2026_09_23.pdf",
        text="උතුරු සහ නැගෙනහිර පළාත්වල ධීවරයින් සඳහා නව සහනාධාර වැඩපිළිවෙළක් ලබන මස සිට ක්‍රියාත්මක කිරීමට රජය තීරණය කර තිබෙනවා.",
        text_sha256="hash1",
        token_count=35,
    )

    chunk_en = HansardChunk(
        chunk_id="chunk_en_1",
        document_id="doc_1",
        sitting_date="2026-09-23",
        year=2026,
        language="en",
        title="Hansard of 2026-09-23",
        section="Oral Questions",
        speaker="The Hon. Minister of Fisheries",
        speaker_role="Minister",
        pdf_page_start=6,
        pdf_page_end=6,
        printed_column_start="1817",
        printed_column_end="1818",
        source_url="https://parliament.lk/hansard_2026_09_23.pdf",
        text="The Ministry has allocated 500 million rupees for the modernization of fishing harbours.",
        text_sha256="hash2",
        token_count=20,
    )

    # Test idempotent upsert
    upserted_1 = await store.upsert_chunks([chunk_si, chunk_en])
    assert upserted_1 == 2
    upserted_2 = await store.upsert_chunks([chunk_si])
    assert upserted_2 == 1

    # Search with language filter
    retriever = HansardRetriever(vectorstore=store)
    evidence_si, citations_si, detected_lang = await retriever.retrieve(
        query="ධීවරයින් සඳහා සහනාධාර",
        language="si",
    )
    assert len(evidence_si) >= 1
    assert evidence_si[0].language == "si"
    assert len(citations_si) >= 1
    assert citations_si[0].sitting_date == "2026-09-23"
    assert citations_si[0].pdf_page == 5

    # Test RAG service
    rag = HansardRAGService(retriever=retriever)
    resp = await rag.answer(
        question="ධීවරයින් සඳහා සහනාධාර ලබා දෙන්නේ කවදාද?",
        language="si",
    )
    assert resp.answer_language == "si"
    assert len(resp.citations) >= 1
    assert resp.citations[0].pdf_page == 5

    # Test insufficient evidence refusal
    empty_store = HansardVectorStore(embedder=embedder, collection_name="empty_hansards")
    empty_rag = HansardRAGService(retriever=HansardRetriever(vectorstore=empty_store))
    refusal_resp = await empty_rag.answer(
        question="What was discussed about space exploration?",
        language="en",
    )
    assert refusal_resp.answer == INSUFFICIENT_MESSAGES["en"]
    assert len(refusal_resp.citations) == 0
