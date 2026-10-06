"""State persistence for restartable crawler operations."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Set

from hansard_rag.config import settings

logger = logging.getLogger(__name__)


class CrawlState:
    """Manages checkpoint state in crawl_state.json."""

    def __init__(self, state_file: Optional[Path] = None):
        self.state_file = state_file or (settings.manifests_dir / "crawl_state.json")
        self.state: Dict[str, Any] = {
            "last_discovered_page": 0,
            "total_discovered_documents": 0,
            "discovered_urls": [],
            "downloaded_document_ids": [],
            "failed_document_ids": [],
            "last_sync_timestamp": None,
        }
        self.load()

    def load(self) -> None:
        """Load state from disk if exists."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.state.update(data)
                logger.debug("Loaded crawl state from %s", self.state_file)
            except Exception as e:
                logger.warning("Could not read crawl state: %s. Starting fresh.", e)

    def save(self) -> None:
        """Atomically persist state to disk."""
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        tmp_file = self.state_file.with_suffix(".tmp")
        try:
            with open(tmp_file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2, ensure_ascii=False)
            tmp_file.replace(self.state_file)
        except Exception as e:
            logger.error("Failed to save crawl state: %s", e)
            if tmp_file.exists():
                tmp_file.unlink()

    @property
    def discovered_urls(self) -> Set[str]:
        return set(self.state.get("discovered_urls", []))

    def add_discovered_url(self, url: str) -> None:
        urls = self.state.setdefault("discovered_urls", [])
        if url not in urls:
            urls.append(url)
            self.state["total_discovered_documents"] = len(urls)

    def mark_downloaded(self, doc_id: str) -> None:
        downloaded = self.state.setdefault("downloaded_document_ids", [])
        if doc_id not in downloaded:
            downloaded.append(doc_id)
        failed = self.state.setdefault("failed_document_ids", [])
        if doc_id in failed:
            failed.remove(doc_id)
        self.save()

    def mark_failed(self, doc_id: str) -> None:
        failed = self.state.setdefault("failed_document_ids", [])
        if doc_id not in failed:
            failed.append(doc_id)
        self.save()
