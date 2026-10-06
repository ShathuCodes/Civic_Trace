"""Deterministic chunk IDs and multilingual token estimation."""

import hashlib
import re


def estimate_multilingual_tokens(text: str) -> int:
    """Calculate realistic token estimate across Sinhala, Tamil, and English.
    
    Standard BPE tokenizers (tiktoken, Gemini, Llama, SentenceTransformers)
    split Brahmic scripts (Sinhala, Tamil) at roughly ~2.2 - 3.0 characters per token,
    and Latin/English text at ~4.0 characters per token.
    """
    if not text:
        return 0

    sin_chars = len([c for c in text if 0x0D80 <= ord(c) <= 0x0DFF])
    tam_chars = len([c for c in text if 0x0B80 <= ord(c) <= 0x0BFF])
    lat_chars = len([c for c in text if ("a" <= c <= "z") or ("A" <= c <= "Z")])
    other_chars = len(text) - (sin_chars + tam_chars + lat_chars)

    est_tokens = (
        (sin_chars / 2.5)
        + (tam_chars / 2.5)
        + (lat_chars / 4.0)
        + (other_chars / 3.0)
    )
    return max(1, int(round(est_tokens)))


def compute_chunk_id(
    document_id: str,
    language: str,
    page_start: int,
    page_end: int,
    normalized_text: str,
) -> str:
    """Deterministic chunk ID from metadata and normalized text hash."""
    seed = f"{document_id}:{language}:{page_start}:{page_end}:{normalized_text.strip()}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()[:24]


def compute_text_sha256(text: str) -> str:
    """Compute SHA-256 hash of normalized text."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()
