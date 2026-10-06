"""Gemini API embedding implementation with batching and rate-limit retries."""

import asyncio
import hashlib
import logging
from typing import List, Optional
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from hansard_rag.config import settings
from hansard_rag.embeddings.base import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    """Generates multilingual embeddings using Google Gemini API."""

    def __init__(
        self,
        api_key: Optional[str] = settings.gemini_api_key,
        model_name: Optional[str] = None,
    ):
        model = model_name or settings.embedding_model or "text-embedding-004"
        super().__init__(model_name=model)
        self.api_key = api_key or settings.gemini_api_key
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Set it in .env or pass it explicitly.")

        from google import genai
        self.client = genai.Client(api_key=self.api_key)
        self._dimension = 768  # text-embedding-004 standard dimension

    @property
    def dimension(self) -> int:
        return self._dimension

    @retry(
        retry=retry_if_exception_type(Exception),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def _embed_batch_remote(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        """Call Gemini embed API with retry on rate-limit."""
        loop = asyncio.get_running_loop()

        def _sync_call() -> List[List[float]]:
            results = []
            # Process in sub-batches of 50 to respect payload limits
            for i in range(0, len(texts), 50):
                batch = texts[i : i + 50]
                response = self.client.models.embed_content(
                    model=self.model_name,
                    contents=batch,
                )
                if hasattr(response, "embeddings"):
                    for emb in response.embeddings:
                        results.append(emb.values)
                elif hasattr(response, "embedding"):
                    results.append(response.embedding.values)
            return results

        return await loop.run_in_executor(None, _sync_call)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed document texts with checkpoint caching."""
        embeddings: List[List[float]] = []
        uncached_indices: List[int] = []
        uncached_texts: List[str] = []

        for idx, text in enumerate(texts):
            h = hashlib.sha256(text.strip().encode("utf-8")).hexdigest()
            if h in self._cache:
                embeddings.append(self._cache[h])
            else:
                embeddings.append([])  # placeholder
                uncached_indices.append(idx)
                uncached_texts.append(text)

        if uncached_texts:
            logger.info("Requesting Gemini embeddings for %d new texts...", len(uncached_texts))
            remote_embeddings = await self._embed_batch_remote(uncached_texts, "RETRIEVAL_DOCUMENT")
            for idx, text, emb in zip(uncached_indices, uncached_texts, remote_embeddings):
                h = hashlib.sha256(text.strip().encode("utf-8")).hexdigest()
                self._cache[h] = emb
                embeddings[idx] = emb
                if len(emb) != self._dimension:
                    self._dimension = len(emb)
            self.save_checkpoints()

        return embeddings

    async def embed_query(self, query: str) -> List[float]:
        """Embed single user query."""
        res = await self._embed_batch_remote([query], "RETRIEVAL_QUERY")
        return res[0]
