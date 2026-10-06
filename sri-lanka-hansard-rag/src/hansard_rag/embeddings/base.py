"""Abstract base embedding provider and checkpoint caching."""

from abc import ABC, abstractmethod
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from hansard_rag.config import settings

logger = logging.getLogger(__name__)


class BaseEmbeddingProvider(ABC):
    """Abstract interface for dense multilingual embedding generators."""

    def __init__(self, model_name: str, checkpoint_dir: Optional[Path] = None):
        self.model_name = model_name
        self.checkpoint_dir = checkpoint_dir or (settings.data_dir / "checkpoints")
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        safe_model = model_name.replace("/", "_").replace(":", "_")
        self.checkpoint_file = self.checkpoint_dir / f"embeddings_{safe_model}.json"
        self._cache: Dict[str, List[float]] = {}
        self.load_checkpoints()

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Vector dimensionality of the embedding model."""
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Compute embeddings for a batch of document texts."""
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Compute embedding for a single user query."""
        pass

    def load_checkpoints(self) -> None:
        """Load cached embeddings to avoid redundant computation."""
        if self.checkpoint_file.exists():
            try:
                with open(self.checkpoint_file, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
                logger.debug("Loaded %d embedding checkpoints from %s", len(self._cache), self.checkpoint_file.name)
            except Exception as e:
                logger.warning("Could not read embedding cache: %s", e)

    def save_checkpoints(self) -> None:
        """Atomically persist embedding cache to disk."""
        tmp = self.checkpoint_file.with_suffix(".tmp")
        try:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(self._cache, f)
            tmp.replace(self.checkpoint_file)
        except Exception as e:
            logger.error("Failed to save embedding checkpoints: %s", e)
            if tmp.exists():
                tmp.unlink()
