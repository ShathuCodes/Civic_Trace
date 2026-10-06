"""Secondary language validation using langdetect with Unicode script guardrails."""

import logging
from typing import Optional

try:
    import langdetect
    from langdetect import DetectorFactory
    DetectorFactory.seed = 42
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False

logger = logging.getLogger(__name__)


def validate_secondary_language(text: str, primary_script: str) -> Optional[str]:
    """Perform secondary statistical check on text without overriding obvious Unicode blocks."""
    if not LANGDETECT_AVAILABLE or len(text.strip()) < 30:
        return primary_script

    # Sinhala and Tamil Unicode blocks are 100% authoritative for script;
    # langdetect is primarily useful to confirm Latin text is English (en).
    if primary_script in ("si", "ta"):
        return primary_script

    try:
        detected = langdetect.detect(text)
        if primary_script == "en" and detected == "en":
            return "en"
        elif primary_script == "en" and detected != "en":
            # Could be Latin-transliterated names or secondary European language
            return "en"
        return detected
    except Exception as e:
        logger.debug("Secondary langdetect skipped: %s", e)
        return primary_script
