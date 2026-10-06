"""Unicode script detection rules for Sinhala, Tamil, and English."""

import unicodedata
from typing import Dict, Literal, Tuple

ScriptType = Literal["si", "ta", "en", "mixed", "common"]


def classify_char_script(ch: str) -> ScriptType:
    """Classify single character by Unicode script."""
    code = ord(ch)
    if 0x0D80 <= code <= 0x0DFF:
        return "si"
    elif 0x0B80 <= code <= 0x0BFF:
        return "ta"
    elif ("a" <= ch <= "z") or ("A" <= ch <= "Z"):
        return "en"
    return "common"


def detect_dominant_script(text: str, confidence_threshold: float = 0.65) -> Tuple[ScriptType, float]:
    """Detect dominant language script in a logical text block."""
    si_count = 0
    ta_count = 0
    en_count = 0

    for ch in text:
        code = ord(ch)
        if 0x0D80 <= code <= 0x0DFF:
            si_count += 1
        elif 0x0B80 <= code <= 0x0BFF:
            ta_count += 1
        elif ("a" <= ch <= "z") or ("A" <= ch <= "Z"):
            en_count += 1

    total_alpha = si_count + ta_count + en_count
    if total_alpha == 0:
        return "common", 1.0

    ratios = {
        "si": si_count / total_alpha,
        "ta": ta_count / total_alpha,
        "en": en_count / total_alpha,
    }

    dominant_script, max_ratio = max(ratios.items(), key=lambda item: item[1])

    if max_ratio >= confidence_threshold:
        return dominant_script, round(max_ratio, 3)  # type: ignore

    # Genuinely mixed block
    return "mixed", round(max_ratio, 3)
