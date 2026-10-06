"""Hansard listing crawler and discovery module."""

from datetime import datetime, timezone
import hashlib
import json
import logging
from pathlib import Path
import re
from typing import AsyncGenerator, Dict, List, Optional, Set
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

from hansard_rag.config import settings
from hansard_rag.crawler.parliament_client import ParliamentClient
from hansard_rag.crawler.state import CrawlState
from hansard_rag.models import HansardDocument

logger = logging.getLogger(__name__)

LISTING_PATH = "/en/business-of-parliament/hansards"
ALLOWED_DOMAINS = {"www.parliament.lk", "parliament.lk"}


def parse_sitting_date(text: str, fallback_url: str = "") -> Optional[str]:
    """Parse date from title string or PDF filename into ISO YYYY-MM-DD."""
    # Pattern 1: ISO YYYY-MM-DD
    iso_match = re.search(r"\b(20\d\d|19\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b", text)
    if iso_match:
        return iso_match.group(0)

    # Pattern 2: Month DD, YYYY (e.g. "Hansard of April 04, 2006")
    try:
        month_match = re.search(
            r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b",
            text,
            re.IGNORECASE,
        )
        if month_match:
            month_str, day_str, year_str = month_match.groups()
            dt = datetime.strptime(f"{month_str} {day_str} {year_str}", "%B %d %Y")
            return dt.strftime("%Y-%m-%d")
    except Exception:
        pass

    # Pattern 3: Fallback from URL filename
    url_match = re.search(r"\b(20\d\d|19\d\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b", fallback_url)
    if url_match:
        return url_match.group(0)

    return None


def generate_document_id(pdf_url: str, sitting_date: Optional[str]) -> str:
    """Generate stable deterministic document ID."""
    url_tail = pdf_url.split("/")[-1].replace(".pdf", "")
    if sitting_date:
        return f"hansard_{sitting_date}_{url_tail}"
    url_hash = hashlib.sha256(pdf_url.encode("utf-8")).hexdigest()[:12]
    return f"hansard_{url_tail}_{url_hash}"


class HansardDiscovery:
    """Discovers every available Hansard document from parliament.lk."""

    def __init__(
        self,
        client: Optional[ParliamentClient] = None,
        state: Optional[CrawlState] = None,
        manifest_path: Optional[Path] = None,
    ):
        self.client = client or ParliamentClient()
        self.state = state or CrawlState()
        self.manifest_path = manifest_path or (settings.manifests_dir / "documents.jsonl")
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)

    def load_existing_manifest(self) -> Dict[str, HansardDocument]:
        """Load known documents from manifests/documents.jsonl."""
        existing: Dict[str, HansardDocument] = {}
        if self.manifest_path.exists():
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            doc = HansardDocument.model_validate_json(line)
                            existing[doc.official_pdf_url] = doc
                        except Exception as e:
                            logger.warning("Corrupted manifest entry skipped: %s", e)
        return existing

    def append_to_manifest(self, doc: HansardDocument) -> None:
        """Incrementally append a discovered document to documents.jsonl."""
        with open(self.manifest_path, "a", encoding="utf-8") as f:
            f.write(doc.model_dump_json() + "\n")

    def parse_page_html(self, html: str, source_url: str) -> tuple[List[HansardDocument], Optional[int]]:
        """Extract Hansard documents and max pagination page from page HTML."""
        soup = BeautifulSoup(html, "html.parser")
        documents: List[HansardDocument] = []
        now_iso = datetime.now(timezone.utc).isoformat()

        # Parse Hansard news boxes
        news_boxes = soup.find_all("div", class_=lambda c: c and "news_box" in c)
        for box in news_boxes:
            # Extract title
            title_tag = box.find(["h1", "h2", "h3", "h4", "div"], class_=lambda c: c and "sub_heading" in c)
            if not title_tag:
                title_tag = box.find(["h1", "h2", "h3"])
            title = title_tag.get_text(strip=True) if title_tag else "Hansard Record"

            # Extract PDF link
            pdf_link = box.find("a", href=lambda h: h and ".pdf" in h.lower())
            if not pdf_link:
                continue

            raw_href = pdf_link["href"].strip()
            pdf_url = urljoin(source_url, raw_href)

            # Security and sanity validation: allowed domain
            parsed_url = urlparse(pdf_url)
            if parsed_url.netloc not in ALLOWED_DOMAINS:
                logger.warning("Rejecting link outside allowed domain: %s", pdf_url)
                continue

            sitting_date = parse_sitting_date(title, fallback_url=pdf_url)
            if not sitting_date:
                logger.warning("Could not parse sitting date for %s (%s). Skipping.", title, pdf_url)
                continue

            doc_id = generate_document_id(pdf_url, sitting_date)
            doc = HansardDocument(
                document_id=doc_id,
                sitting_date=sitting_date,
                title=title,
                source_listing_url=source_url,
                official_pdf_url=pdf_url,
                discovered_at=now_iso,
                last_checked_at=now_iso,
            )
            documents.append(doc)

        # Parse maximum page number from pagination links
        max_page: Optional[int] = None
        for a_tag in soup.find_all("a", class_=lambda c: c and "page-link" in c):
            href = a_tag.get("href") or ""
            page_match = re.search(r"[?&]page=(\d+)", href)
            if page_match:
                p = int(page_match.group(1))
                if max_page is None or p > max_page:
                    max_page = p

        return documents, max_page

    async def discover_all(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        legislature: Optional[str] = None,
        max_pages: Optional[int] = None,
    ) -> List[HansardDocument]:
        """Traverse all pages and collect Hansard records incrementally."""
        existing_docs = self.load_existing_manifest()
        discovered_docs: List[HansardDocument] = []
        seen_pdf_urls: Set[str] = set(existing_docs.keys())

        page = 1
        last_page_urls: Set[str] = set()

        logger.info("Starting Hansard discovery (from=%s, to=%s, legislature=%s)", start_date, end_date, legislature)

        while True:
            if max_pages and page > max_pages:
                logger.info("Reached maximum requested page count (%d).", max_pages)
                break

            params: Dict[str, str] = {"page": str(page), "itemCount": "16"}
            if start_date:
                params["from"] = start_date
            if end_date:
                params["to"] = end_date
            if legislature:
                params["legislature"] = legislature

            url = f"{self.client.base_url}{LISTING_PATH}"
            try:
                response = await self.client.get(url, params=params)
                current_url = str(response.url)
            except Exception as e:
                logger.error("Failed to fetch discovery page %d: %s", page, e)
                break

            docs_on_page, max_pagination_page = self.parse_page_html(response.text, current_url)
            current_page_urls = {d.official_pdf_url for d in docs_on_page}

            # Boundary checks:
            # 1. Zero documents found on page
            if not docs_on_page:
                logger.info("No documents found on page %d. Discovery completed.", page)
                break

            # 2. Server clamped to previous page (same set of URLs returned)
            if current_page_urls == last_page_urls:
                logger.info("Page %d yielded identical documents to page %d (server clamped). Completed.", page, page - 1)
                break

            last_page_urls = current_page_urls

            # Add newly discovered records
            new_on_page = 0
            for doc in docs_on_page:
                if doc.official_pdf_url not in seen_pdf_urls:
                    seen_pdf_urls.add(doc.official_pdf_url)
                    existing_docs[doc.official_pdf_url] = doc
                    self.append_to_manifest(doc)
                    discovered_docs.append(doc)
                    self.state.add_discovered_url(doc.official_pdf_url)
                    new_on_page += 1

            logger.info("Page %d: discovered %d records (%d new). Max page reported: %s", page, len(docs_on_page), new_on_page, max_pagination_page)

            # Check if we have surpassed the last page reported by pagination
            if max_pagination_page and page >= max_pagination_page:
                logger.info("Reached final reported page %d. Discovery complete.", max_pagination_page)
                break

            page += 1

        self.state.state["last_discovered_page"] = page
        self.state.state["last_sync_timestamp"] = datetime.now(timezone.utc).isoformat()
        self.state.save()

        logger.info("Discovery finished. Total unique Hansards in manifest: %d (New in run: %d)", len(existing_docs), len(discovered_docs))
        return list(existing_docs.values())
