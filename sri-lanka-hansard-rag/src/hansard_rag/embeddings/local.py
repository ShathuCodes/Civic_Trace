"""Local multilingual embedding implementation supporting sentence-transformers and lightweight fallback."""

import asyncio
import hashlib
import logging
import math
from typing import List, Optional

from hansard_rag.config import settings
from hansard_rag.embeddings.base import BaseEmbeddingProvider

logger = logging.getLogger(__name__)


def compute_deterministic_vector(text: str, dim: int = 384) -> List[float]:
    """Compute high-quality deterministic pseudo-dense vector for local offline development.
    
    Generates consistent cosine similarity by hashing character n-grams (1 to 4 grams)
    across Sinhala, Tamil, and English scripts, followed by L2 unit normalization.
    """
    vec = [0.0] * dim
    words = text.lower().split()
    chars = text.strip()

    # N-gram hashing across characters and words
    for i in range(len(chars)):
        for n in range(1, 4):
            if i + n <= len(chars):
                sub = chars[i : i + n].encode("utf-8")
                # Deterministic hash bucket
                h = int(hashlib.md5(sub).hexdigest(), 16)
                idx = h % dim
                sign = 1.0 if ((h >> 16) & 1) == 0 else -1.0
                vec[idx] += sign

    for w in words:
        sub = w.encode("utf-8")
        h = int(hashlib.sha256(sub).hexdigest(), 16)
        idx = h % dim
        sign = 1.5 if ((h >> 16) & 1) == 0 else -1.5
        vec[idx] += sign

    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0.0:
        return [v / norm for v in vec]
    return [0.0] * dim


class LocalEmbeddingProvider(BaseEmbeddingProvider):
    """Local multilingual embedding provider."""

    def __init__(
        self,
        model_name: Optional[str] = None,
    ):
        model = model_name or settings.embedding_model or "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        super().__init__(model_name=model)
        self._st_model = None
        self._dim = 384

        # Attempt to load SentenceTransformer if installed
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading local SentenceTransformer model: %s", self.model_name)
            self._st_model = SentenceTransformer(self.model_name)
            self._dim = self._st_model.get_sentence_embedding_dimension()
        except Exception as e:
            logger.info("SentenceTransformer not loaded (%s). Using deterministic 384-d local multilingual embedding.", e)
            self._st_model = None
            self._dim = 384

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed document texts."""
        embeddings: List[List[float]] = []
        uncached_indices: List[int] = []
        uncached_texts: List[str] = []

        for idx, text in enumerate(texts):
            h = hashlib.sha256(text.strip().encode("utf-8")).hexdigest()
            if h in self._cache:
                embeddings.append(self._cache[h])
            else:
                embeddings.append([])
                uncached_indices.append(idx)
                uncached_texts.append(text)

        if uncached_texts:
            if self._st_model:
                loop = asyncio.get_running_loop()
                computed = await loop.run_in_executor(
                    None,
                    lambda: self._st_model.encode(uncached_texts, convert_to_numpy=True).tolist(),
                )
            else:
                computed = [compute_deterministic_vector(t, self._dim) for t in uncached_texts]

            for idx, text, emb in zip(uncached_indices, uncached_texts, computed):
                h = hashlib.sha256(text.strip().encode("utf-8")).hexdigest()
                self._cache[h] = emb
                embeddings[idx] = emb

            self.save_checkpoints()

        return embeddings

    async def embed_query(self, query: str) -> List[float]:
        """Embed single user query."""
        res = await self.embed_documents([query])
        return res[0]
