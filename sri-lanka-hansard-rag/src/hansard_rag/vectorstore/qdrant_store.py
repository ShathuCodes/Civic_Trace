"""Qdrant vector store integration for multilingual Hansard chunks."""

import hashlib
import logging
from typing import Any, Dict, List, Optional
import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from hansard_rag.config import settings
from hansard_rag.embeddings.base import BaseEmbeddingProvider
from hansard_rag.models import HansardChunk

logger = logging.getLogger(__name__)


def chunk_id_to_uuid(chunk_id: str) -> str:
    """Derive deterministic UUID from stable chunk_id for Qdrant point identifier."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"hansard.chunk.{chunk_id}"))


class HansardVectorStore:
    """Manages Qdrant collections, indexing, and dense semantic search."""

    def __init__(
        self,
        embedder: BaseEmbeddingProvider,
        url: Optional[str] = settings.qdrant_url,
        api_key: Optional[str] = settings.qdrant_api_key,
        collection_name: str = settings.qdrant_collection,
    ):
        self.embedder = embedder
        self.collection_name = collection_name
        self.dimension = self.embedder.dimension

        # Connect to remote or fallback to embedded local storage
        self.client: QdrantClient
        try:
            self.client = QdrantClient(url=url, api_key=api_key, timeout=10.0)
            # Test connectivity
            _ = self.client.get_collections()
            logger.info("Connected to Qdrant at %s", url)
        except Exception as e:
            fallback_path = str(settings.data_dir / "qdrant_storage")
            logger.warning("Remote Qdrant not reachable at %s (%s). Using local storage at %s.", url, e, fallback_path)
            self.client = QdrantClient(path=fallback_path)

        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Create collection if absent, or verify vector dimensionality."""
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            logger.info("Creating Qdrant collection '%s' with dimension %d (Cosine)", self.collection_name, self.dimension)
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=qmodels.VectorParams(
                    size=self.dimension,
                    distance=qmodels.Distance.COSINE,
                ),
            )
            # Create payload indexes for fast filtering
            for field, schema in [
                ("sitting_date", qmodels.PayloadSchemaType.KEYWORD),
                ("year", qmodels.PayloadSchemaType.INTEGER),
                ("language", qmodels.PayloadSchemaType.KEYWORD),
                ("speaker", qmodels.PayloadSchemaType.KEYWORD),
                ("speaker_role", qmodels.PayloadSchemaType.KEYWORD),
                ("section", qmodels.PayloadSchemaType.KEYWORD),
                ("document_id", qmodels.PayloadSchemaType.KEYWORD),
            ]:
                try:
                    self.client.create_payload_index(
                        collection_name=self.collection_name,
                        field_name=field,
                        field_schema=schema,
                    )
                except Exception as e:
                    logger.debug("Payload index creation skipped for %s: %s", field, e)
        else:
            info = self.client.get_collection(collection_name=self.collection_name)
            existing_dim = info.config.params.vectors.size  # type: ignore
            if existing_dim != self.dimension:
                logger.warning(
                    "Collection '%s' exists with dimension %d, but active embedder uses %d. Recreating collection.",
                    self.collection_name,
                    existing_dim,
                    self.dimension,
                )
                self.client.delete_collection(self.collection_name)
                self._ensure_collection()

    async def upsert_chunks(self, chunks: List[HansardChunk], batch_size: int = 64) -> int:
        """Embed and upsert chunks idempotently into Qdrant."""
        if not chunks:
            return 0

        total_upserted = 0
        texts = [c.text for c in chunks]
        logger.info("Generating embeddings for %d chunks...", len(chunks))
        vectors = await self.embedder.embed_documents(texts)

        points: List[qmodels.PointStruct] = []
        for chunk, vec in zip(chunks, vectors):
            point_id = chunk_id_to_uuid(chunk.chunk_id)
            payload = chunk.model_dump()
            points.append(
                qmodels.PointStruct(
                    id=point_id,
                    vector=vec,
                    payload=payload,
                )
            )

        # Batch upsert
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch,
                wait=True,
            )
            total_upserted += len(batch)

        logger.info("Successfully upserted %d vector points into '%s'", total_upserted, self.collection_name)
        return total_upserted

    async def search(
        self,
        query: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        language: Optional[str] = None,
        speaker: Optional[str] = None,
        section: Optional[str] = None,
        top_k: int = 8,
        score_threshold: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Dense semantic search with structured metadata filters."""
        query_vector = await self.embedder.embed_query(query)

        conditions: List[qmodels.Condition] = []

        if language and language != "auto" and language != "all":
            conditions.append(
                qmodels.FieldCondition(
                    key="language",
                    match=qmodels.MatchValue(value=language),
                )
            )

        if start_date and end_date:
            conditions.append(
                qmodels.FieldCondition(
                    key="sitting_date",
                    range=qmodels.Range(gte=start_date, lte=end_date),  # string lexical comparison valid for YYYY-MM-DD
                )
            )
        elif start_date:
            conditions.append(
                qmodels.FieldCondition(
                    key="sitting_date",
                    range=qmodels.Range(gte=start_date),
                )
            )
        elif end_date:
            conditions.append(
                qmodels.FieldCondition(
                    key="sitting_date",
                    range=qmodels.Range(lte=end_date),
                )
            )

        if speaker:
            conditions.append(
                qmodels.FieldCondition(
                    key="speaker",
                    match=qmodels.MatchText(text=speaker),
                )
            )

        if section:
            conditions.append(
                qmodels.FieldCondition(
                    key="section",
                    match=qmodels.MatchText(text=section),
                )
            )

        query_filter = qmodels.Filter(must=conditions) if conditions else None

        hits = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=top_k,
            score_threshold=score_threshold,
        )

        results = []
        for hit in hits:
            results.append({
                "chunk_id": hit.payload.get("chunk_id"),
                "score": round(hit.score, 4),
                "text": hit.payload.get("text"),
                "language": hit.payload.get("language"),
                "sitting_date": hit.payload.get("sitting_date"),
                "pdf_page_start": hit.payload.get("pdf_page_start"),
                "pdf_page_end": hit.payload.get("pdf_page_end"),
                "printed_column_start": hit.payload.get("printed_column_start"),
                "printed_column_end": hit.payload.get("printed_column_end"),
                "source_url": hit.payload.get("source_url"),
                "speaker": hit.payload.get("speaker"),
                "speaker_role": hit.payload.get("speaker_role"),
                "title": hit.payload.get("title"),
            })

        return results
