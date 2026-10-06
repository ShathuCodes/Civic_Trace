"""Extraction quality metrics and confidence indicators."""

import unicodedata
from typing import Dict, List, Tuple


def count_script_characters(text: str) -> Dict[str, int]:
    """Count characters per script category."""
    counts = {
        "sinhala": 0,
        "tamil": 0,
        "latin": 0,
        "digits": 0,
        "punctuation": 0,
        "whitespace": 0,
        "replacement": 0,
        "control": 0,
        "total": len(text),
    }

    for ch in text:
        code = ord(ch)
        if 0x0D80 <= code <= 0x0DFF:
            counts["sinhala"] += 1
        elif 0x0B80 <= code <= 0x0BFF:
            counts["tamil"] += 1
        elif ("a" <= ch <= "z") or ("A" <= ch <= "Z"):
            counts["latin"] += 1
        elif ch.isdigit():
            counts["digits"] += 1
        elif ch in "\ufffd\ufeff":
            counts["replacement"] += 1
        elif ch.isspace():
            counts["whitespace"] += 1
        elif unicodedata.category(ch).startswith("P") or unicodedata.category(ch).startswith("S"):
            counts["punctuation"] += 1
        elif unicodedata.category(ch).startswith("C"):
            counts["control"] += 1

    return counts


def calculate_page_quality(text: str, min_char_threshold: int = 100) -> Tuple[float, List[str]]:
    """Compute normalized quality score (0.0 to 1.0) and descriptive quality flags."""
    flags: List[str] = []
    text_len = len(text.strip())

    if text_len == 0:
        return 0.0, ["empty_page"]

    counts = count_script_characters(text)
    total = counts["total"]

    # Ratios
    printable_ratio = (total - counts["control"] - counts["replacement"]) / max(1, total)
    replacement_ratio = counts["replacement"] / max(1, total)
    meaningful_chars = counts["sinhala"] + counts["tamil"] + counts["latin"]
    meaningful_ratio = meaningful_chars / max(1, total - counts["whitespace"])

    if text_len < min_char_threshold:
        flags.append("short_page_text")

    if replacement_ratio > 0.05:
        flags.append("high_replacement_chars")

    if printable_ratio < 0.85:
        flags.append("low_printable_ratio")

    if meaningful_ratio < 0.3 and text_len >= min_char_threshold:
        flags.append("low_meaningful_script_ratio")

    # Composite score
    score = (
        (0.4 * printable_ratio)
        + (0.4 * meaningful_ratio)
        + (0.2 * min(1.0, text_len / 500.0))
        - (1.0 * replacement_ratio)
    )
    score = max(0.0, min(1.0, score))

    if score < 0.5:
        flags.append("low_quality_score")

    return round(score, 3), flags
