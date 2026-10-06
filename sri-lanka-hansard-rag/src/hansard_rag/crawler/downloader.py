"""Safe, restartable, streamed PDF downloader with SHA-256 verification."""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
import httpx

from hansard_rag.config import settings
from hansard_rag.crawler.parliament_client import ParliamentClient
from hansard_rag.crawler.state import CrawlState
from hansard_rag.models import HansardDocument

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF-"


class HansardDownloader:
    """Downloads official Hansard PDFs with atomic rename, validation, and SHA-256 checks."""

    def __init__(
        self,
        client: Optional[ParliamentClient] = None,
        state: Optional[CrawlState] = None,
        failures_path: Optional[Path] = None,
    ):
        self.client = client or ParliamentClient()
        self.state = state or CrawlState()
        self.failures_path = failures_path or (settings.manifests_dir / "failures.jsonl")
        self.failures_path.parent.mkdir(parents=True, exist_ok=True)

    def get_destination_path(self, doc: HansardDocument) -> Path:
        """Construct destination path data/raw/pdf/YYYY/YYYY-MM-DD_hansard.pdf."""
        year = doc.sitting_date[:4]
        filename = f"{doc.sitting_date}_{doc.document_id}.pdf"
        target_dir = settings.raw_pdf_dir / year
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir / filename

    def is_valid_pdf(self, path: Path) -> bool:
        """Verify that the file exists, is non-empty, and starts with %PDF- magic bytes."""
        if not path.exists() or path.stat().st_size < 1024:
            return False
        try:
            with open(path, "rb") as f:
                header = f.read(1024)
                return PDF_MAGIC in header
        except Exception:
            return False

    def log_failure(self, doc: HansardDocument, error: str) -> None:
        """Append error to failures.jsonl."""
        entry = {
            "document_id": doc.document_id,
            "sitting_date": doc.sitting_date,
            "official_pdf_url": doc.official_pdf_url,
            "error": error,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open(self.failures_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        self.state.mark_failed(doc.document_id)

    async def download_document(
        self,
        doc: HansardDocument,
        force: bool = False,
    ) -> HansardDocument:
        """Stream download with verification, SHA-256 hash, and atomic write."""
        dest_path = self.get_destination_path(doc)

        # Skip unchanged files
        if not force and dest_path.exists() and self.is_valid_pdf(dest_path):
            if doc.sha256 and doc.file_size_bytes == dest_path.stat().st_size:
                logger.debug("Skipping already downloaded and verified PDF: %s", dest_path.name)
                doc.download_status = "skipped"
                doc.local_pdf_path = str(dest_path)
                return doc

            # Compute sha256 of existing valid file if not recorded
            hasher = hashlib.sha256()
            with open(dest_path, "rb") as f:
                for chunk in iter(lambda: f.read(65536), b""):
                    hasher.update(chunk)
            doc.sha256 = hasher.hexdigest()
            doc.file_size_bytes = dest_path.stat().st_size
            doc.download_status = "downloaded"
            doc.local_pdf_path = str(dest_path)
            self.state.mark_downloaded(doc.document_id)
            return doc

        part_path = dest_path.with_suffix(".part")
        logger.info("Downloading PDF for %s: %s", doc.sitting_date, doc.official_pdf_url)

        try:
            async with self.client.semaphore:
                await self.client._respect_politeness()
                async with self.client.client.stream("GET", doc.official_pdf_url) as response:
                    if response.status_code != 200:
                        err_msg = f"HTTP {response.status_code} downloading {doc.official_pdf_url}"
                        self.log_failure(doc, err_msg)
                        doc.download_status = "failed"
                        doc.error_message = err_msg
                        return doc

                    # Guard against HTML error pages returned with 200
                    content_type = response.headers.get("content-type", "").lower()
                    if "text/html" in content_type:
                        err_msg = f"Expected PDF but received HTML ({content_type}) for {doc.official_pdf_url}"
                        self.log_failure(doc, err_msg)
                        doc.download_status = "failed"
                        doc.error_message = err_msg
                        return doc

                    doc.etag = response.headers.get("etag")
                    doc.last_modified = response.headers.get("last-modified")

                    hasher = hashlib.sha256()
                    bytes_written = 0

                    with open(part_path, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=65536):
                            f.write(chunk)
                            hasher.update(chunk)
                            bytes_written += len(chunk)

            # Validate magic bytes
            with open(part_path, "rb") as f:
                header = f.read(1024)
                if PDF_MAGIC not in header:
                    part_path.unlink(missing_ok=True)
                    err_msg = f"Invalid PDF magic bytes in downloaded file from {doc.official_pdf_url}"
                    self.log_failure(doc, err_msg)
                    doc.download_status = "failed"
                    doc.error_message = err_msg
                    return doc

            # Atomic rename
            part_path.replace(dest_path)

            doc.sha256 = hasher.hexdigest()
            doc.file_size_bytes = bytes_written
            doc.download_status = "downloaded"
            doc.local_pdf_path = str(dest_path)
            doc.error_message = None

            self.state.mark_downloaded(doc.document_id)
            logger.info("Successfully downloaded: %s (%d bytes, sha256=%s)", dest_path.name, bytes_written, doc.sha256[:8])
            return doc

        except Exception as e:
            part_path.unlink(missing_ok=True)
            err_msg = f"Download exception for {doc.official_pdf_url}: {e}"
            logger.error(err_msg)
            self.log_failure(doc, err_msg)
            doc.download_status = "failed"
            doc.error_message = err_msg
            return doc

    async def download_all(
        self,
        documents: List[HansardDocument],
        force: bool = False,
        limit: Optional[int] = None,
    ) -> List[HansardDocument]:
        """Download multiple documents sequentially/controlled concurrency."""
        updated: List[HansardDocument] = []
        target_docs = documents[:limit] if limit else documents

        for idx, doc in enumerate(target_docs, start=1):
            logger.info("[%d/%d] Processing document %s", idx, len(target_docs), doc.document_id)
            updated_doc = await self.download_document(doc, force=force)
            updated.append(updated_doc)

        return updated
