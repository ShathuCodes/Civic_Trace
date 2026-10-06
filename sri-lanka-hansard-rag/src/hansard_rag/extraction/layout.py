"""Layout analysis, column detection, and conservative header/footer cleanup."""

import re
from typing import List, Optional, Tuple

COLUMN_PATTERN = re.compile(
    r"(?:\[?\s*(?:Cols?\.?|Columns?)\s*(\d{1,5})(?:\s*[-–—]\s*(\d{1,5}))?\s*\]?|"
    r"^\s*(\d{1,5})\s*[-–—]\s*(\d{1,5})\s*$)",
    re.IGNORECASE,
)

# Common exact repeated top-of-page running headers in Hansards
RUNNING_HEADER_PATTERNS = [
    re.compile(r"^\s*PARLIAMENTARY\s+DEBATES\s*$", re.IGNORECASE),
    re.compile(r"^\s*OFFICIAL\s+REPORT\s*$", re.IGNORECASE),
    re.compile(r"^\s*පාර්ලිමේන්තු\s+විවාද\s*$", re.IGNORECASE),
    re.compile(r"^\s*பாராளுமன்ற\s+விவாதங்கள்\s*$", re.IGNORECASE),
]

# Patterns that MUST NEVER BE REMOVED EVEN IF REPEATED
PRESERVE_PATTERNS = [
    re.compile(r"(Hon\.|Minister|Speaker|Deputy Speaker|Leader of the House)", re.IGNORECASE),
    re.compile(r"(ගරු|කථානායක|නියෝජ්‍ය කථානායක|ඇමති|මන්ත්‍රී)"),
    re.compile(r"(கௌரவ|சபாநாயகர்|அமைச்சர்|உறுப்பினர்)"),
    re.compile(r"(Bill|Motion|Question|Order of the Day|Papers Presented)", re.IGNORECASE),
    re.compile(r"(පනත් කෙටුම්පත|යෝජනාව|ප්‍රශ්නය|න්‍යාය පත්‍රය)"),
    re.compile(r"(மசோதா|பிரேரணை|கேள்வி)"),
]


def extract_column_numbers(text: str) -> Optional[str]:
    """Detect printed Hansard column references like [Cols. 1815-1816]."""
    for line in text.splitlines()[:10] + text.splitlines()[-10:]:
        match = COLUMN_PATTERN.search(line)
        if match:
            c1, c2, c3, c4 = match.groups()
            start = c1 or c3
            end = c2 or c4
            if start and end:
                return f"{start}-{end}"
            elif start:
                return str(start)
    return None


def clean_running_headers_and_footers(lines: List[str]) -> List[str]:
    """Conservatively remove only standard running headers/footers at extreme page edges."""
    if not lines:
        return []

    cleaned = list(lines)

    # Check top 3 lines
    for idx in range(min(3, len(cleaned))):
        line = cleaned[idx].strip()
        # Protect preserved parliamentary phrases
        if any(p.search(line) for p in PRESERVE_PATTERNS):
            continue

        if any(h.search(line) for h in RUNNING_HEADER_PATTERNS):
            cleaned[idx] = ""

    # Check bottom 2 lines for solitary page numbers (e.g. "1816" or "5")
    for idx in range(max(0, len(cleaned) - 2), len(cleaned)):
        line = cleaned[idx].strip()
        if line.isdigit() and len(line) <= 5:
            cleaned[idx] = ""

    return [l for l in cleaned if l.strip()]
