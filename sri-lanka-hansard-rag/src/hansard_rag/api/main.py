"""FastAPI application for Multilingual Hansard RAG service."""

from contextlib import asynccontextmanager
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from hansard_rag.api.schemas import AskRequest, AskResponse, SearchRequest, SearchResponse, StatsResponse, SyncRequest, SyncResponse
from hansard_rag.config import settings
from hansard_rag.embeddings.base import BaseEmbeddingProvider
from hansard_rag.embeddings.gemini import GeminiEmbeddingProvider
from hansard_rag.embeddings.local import LocalEmbeddingProvider
from hansard_rag.logging_config import setup_logging
from hansard_rag.rag.answer import HansardRAGService
from hansard_rag.rag.retrieval import HansardRetriever
from hansard_rag.vectorstore.qdrant_store import HansardVectorStore

setup_logging(settings.log_level)
logger = logging.getLogger("hansard_rag.api")

# Global pipeline singletons
embedder: Optional[BaseEmbeddingProvider] = None
vectorstore: Optional[HansardVectorStore] = None
retriever: Optional[HansardRetriever] = None
rag_service: Optional[HansardRAGService] = None


def get_embedder() -> BaseEmbeddingProvider:
    global embedder
    if embedder is None:
        if settings.embedding_provider.lower() == "gemini" and settings.gemini_api_key:
            embedder = GeminiEmbeddingProvider()
        else:
            embedder = LocalEmbeddingProvider()
    return embedder


def get_vectorstore() -> HansardVectorStore:
    global vectorstore
    if vectorstore is None:
        emb = get_embedder()
        vectorstore = HansardVectorStore(embedder=emb)
    return vectorstore


def get_rag_service() -> HansardRAGService:
    global retriever, rag_service
    if rag_service is None:
        vs = get_vectorstore()
        retriever = HansardRetriever(vectorstore=vs)
        rag_service = HansardRAGService(retriever=retriever)
    return rag_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup."""
    logger.info("Initializing Hansard RAG API...")
    settings.ensure_directories()
    _ = get_rag_service()
    yield
    logger.info("Shutting down Hansard RAG API.")


app = FastAPI(
    title="Sri Lanka Parliament Hansard Multilingual RAG API",
    description="Production multilingual retrieval-augmented question answering for Sri Lankan parliamentary Hansards.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/stats", response_model=StatsResponse)
async def stats():
    """Collection and indexing statistics."""
    vs = get_vectorstore()
    try:
        col_info = vs.client.get_collection(vs.collection_name)
        total_vectors = col_info.points_count or 0
    except Exception:
        total_vectors = 0

    manifest_file = settings.manifests_dir / "documents.jsonl"
    doc_count = 0
    if manifest_file.exists():
        with open(manifest_file, "r", encoding="utf-8") as f:
            doc_count = sum(1 for line in f if line.strip())

    emb = get_embedder()
    return StatsResponse(
        status="active",
        qdrant_collection=vs.collection_name,
        total_vectors_indexed=total_vectors,
        total_documents_discovered=doc_count,
        embedding_provider=settings.embedding_provider,
        embedding_model=emb.model_name,
    )


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    """Dense semantic search across multilingual Hansard chunks."""
    vs = get_vectorstore()
    from hansard_rag.rag.retrieval import detect_question_language
    det_lang = detect_question_language(req.query)

    search_lang = None
    if req.language and req.language not in ("auto", "all"):
        search_lang = req.language

    results = await vs.search(
        query=req.query,
        start_date=req.start_date,
        end_date=req.end_date,
        language=search_lang,
        speaker=req.speaker,
        section=req.section,
        top_k=req.top_k,
        score_threshold=req.score_threshold,
    )

    return SearchResponse(
        query=req.query,
        detected_language=det_lang,
        results_count=len(results),
        results=results,
    )


@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest):
    """Multilingual RAG question answering with verified citations."""
    svc = get_rag_service()
    try:
        res = await svc.answer(
            question=req.question,
            start_date=req.start_date,
            end_date=req.end_date,
            language=req.language,
            top_k=req.top_k,
        )
        return res
    except Exception as e:
        logger.error("Error generating answer: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/sync", response_model=SyncResponse)
async def admin_sync(req: SyncRequest):
    """Trigger incremental sync pipeline via API."""
    from hansard_rag.cli import run_sync_pipeline
    try:
        results = await run_sync_pipeline(
            start_date=req.start_date,
            end_date=req.end_date,
            force=req.force,
            limit=req.limit,
        )
        return SyncResponse(
            status="completed",
            discovered=results["discovered"],
            downloaded=results["downloaded"],
            extracted=results["extracted"],
            chunked=results["chunked"],
            indexed=results["indexed"],
            message="Incremental sync pipeline executed successfully.",
        )
    except Exception as e:
        logger.error("Admin sync failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/reindex")
async def admin_reindex():
    """Rebuild vector database collection from chunk manifest."""
    vs = get_vectorstore()
    multi_chunks_file = settings.chunks_dir / "multilingual.jsonl"
    if not multi_chunks_file.exists():
        raise HTTPException(status_code=400, detail="No chunks found. Run chunking first.")

    from hansard_rag.models import HansardChunk
    chunks = []
    with open(multi_chunks_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                chunks.append(HansardChunk.model_validate_json(line))

    # Recreate collection
    try:
        vs.client.delete_collection(vs.collection_name)
    except Exception:
        pass
    vs._ensure_collection()

    upserted = await vs.upsert_chunks(chunks)
    return {"status": "reindexed", "chunks_indexed": upserted}
