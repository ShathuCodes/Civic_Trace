"""Text normalization and conservative cleanup for multilingual parliamentary text."""

import re
import unicodedata


def normalize_unicode(text: str) -> str:
    """Normalize string to UTF-8 and Unicode NFC form."""
    if not text:
        return ""
    # NFC normalization
    normalized = unicodedata.normalize("NFC", text)
    # Remove null bytes and hazardous control characters except \n, \t, \r
    cleaned = "".join(
        ch for ch in normalized
        if ch in "\n\r\t" or not unicodedata.category(ch).startswith("C")
    )
    return cleaned


def join_line_wrapped_words(text: str) -> str:
    """Safely rejoin words broken by end-of-line hyphens across lines."""
    # Pattern: English word ending in hyphen followed by newline and continuing letters
    pattern_en = re.compile(r"([a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,})")
    rejoined = pattern_en.sub(r"\1\2", text)
    return rejoined


def normalize_whitespace(text: str) -> str:
    """Normalize runs of horizontal spaces while preserving paragraph breaks."""
    lines = text.splitlines()
    normalized_lines = []
    for line in lines:
        cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
        normalized_lines.append(cleaned_line)

    result = "\n".join(normalized_lines)
    # Collapse 3 or more consecutive newlines into 2
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


def clean_hansard_text(text: str) -> str:
    """Execute full conservative normalization pipeline."""
    t1 = normalize_unicode(text)
    t2 = join_line_wrapped_words(t1)
    t3 = normalize_whitespace(t2)
    return t3
