"""Polite, rate-limited HTTP client for parliament.lk."""

import asyncio
import logging
import random
import time
from typing import Any, Dict, Optional
import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from hansard_rag.config import settings

logger = logging.getLogger(__name__)


class ParliamentClient:
    """HTTP Client honoring rate limits, exponential backoff, and respectful crawling."""

    def __init__(
        self,
        base_url: str = "https://www.parliament.lk",
        delay_seconds: float = settings.crawl_delay_seconds,
        max_concurrency: int = settings.crawl_max_concurrency,
        timeout_seconds: float = settings.request_timeout_seconds,
        user_agent: str = settings.user_agent,
    ):
        self.base_url = base_url
        self.delay_seconds = max(1.5, delay_seconds)
        self.semaphore = asyncio.Semaphore(max_concurrency)
        self.timeout_seconds = timeout_seconds
        self.user_agent = user_agent
        self._last_request_time = 0.0

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,si;q=0.8,ta;q=0.8",
        }
        self.client = httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(self.timeout_seconds),
            follow_redirects=True,
            limits=httpx.Limits(max_connections=max_concurrency, max_keepalive_connections=max_concurrency),
        )

    async def _respect_politeness(self) -> None:
        """Enforce polite crawling delay with random jitter."""
        now = time.time()
        elapsed = now - self._last_request_time
        target_delay = self.delay_seconds + random.uniform(0.1, 0.4)
        if elapsed < target_delay:
            await asyncio.sleep(target_delay - elapsed)
        self._last_request_time = time.time()

    @retry(
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    )
    async def get(self, url: str, params: Optional[Dict[str, Any]] = None) -> httpx.Response:
        """Execute a polite GET request with backoff and retry."""
        async with self.semaphore:
            await self._respect_politeness()
            logger.debug("GET %s (params=%s)", url, params)
            response = await self.client.get(url, params=params)

            if response.status_code == 429 or response.status_code >= 500:
                retry_after = response.headers.get("Retry-After")
                if retry_after:
                    try:
                        wait_time = float(retry_after)
                        logger.warning("Server returned %d with Retry-After: %s. Sleeping.", response.status_code, wait_time)
                        await asyncio.sleep(wait_time)
                    except ValueError:
                        pass
                response.raise_for_status()

            return response

    async def head(self, url: str) -> httpx.Response:
        """Execute a HEAD request to check file headers."""
        async with self.semaphore:
            await self._respect_politeness()
            return await self.client.head(url)

    async def close(self) -> None:
        """Close underlying httpx client."""
        await self.client.aclose()

    async def __aenter__(self) -> "ParliamentClient":
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        await self.close()
