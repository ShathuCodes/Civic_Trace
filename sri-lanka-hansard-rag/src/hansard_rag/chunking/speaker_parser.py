"""Conservative speaker, role, and parliamentary structure parser."""

import re
from typing import Optional, Tuple

# Multilingual speaker prefix patterns
SPEAKER_PATTERNS = [
    # English
    re.compile(
        r"^(?:The\s+)?(Hon\.\s+[\w\s\.\,\'\-]+|Mr\.\s+Speaker|The\s+Speaker|The\s+Deputy\s+Speaker|Minister\s+of\s+[\w\s\.\,\'\-]+)\s*:\s*",
        re.IGNORECASE,
    ),
    # Sinhala: ගරු ... මයා / මැතිතුමා / අමාත්‍යතුමා
    re.compile(
        r"^(ගරු\s+[\u0D80-\u0DFF\s\.\,\'\-]+?(?:මයා|මැතිතුමා|අමාත්‍යතුමා|මන්ත්‍රීතුමා|කථානායකතුමා))\s*:\s*"
    ),
    # Tamil: கௌரவ ... அவர்கள் / அமைச்சர்
    re.compile(
        r"^(கௌரவ\s+[\u0B80-\u0BFF\s\.\,\'\-]+?(?:அவர்கள்|அமைச்சர்|சபாநாயகர்|உறுப்பினர்))\s*:\s*"
    ),
]

# Question numbers
QUESTION_PATTERNS = [
    re.compile(r"(?:Question\s+No\.?|ප්‍රශ්න\s+අංක|கேள்வி\s+இலக்கம்)\s*[:\-]?\s*(\d+[\w\/\-]*)", re.IGNORECASE),
]

# Bill / Motion
BILL_PATTERNS = [
    re.compile(r"(?:Bill|Motion|පනත් කෙටුම්පත|යෝජනාව|மசோதா|பிரேரணை)\s*[:\-]?\s*([^\n\.\;]{5,80})", re.IGNORECASE),
]

# Parliamentary Sections
SECTION_PATTERNS = [
    re.compile(r"^(ORAL ANSWERS TO QUESTIONS|QUESTIONS FOR ORAL ANSWERS|PAPERS PRESENTED|PETITIONS|NOTICES OF MOTIONS|STATEMENTS|APPROPRIATION BILL)", re.IGNORECASE),
    re.compile(r"^(වාචික පිළිතුරු අපේක්ෂා කරන ප්‍රශ්න|පිළිගන්වන ලද ලිපි ලේඛන|පෙත්සම්|යෝජනා පිළිබඳ නිවේදන|විශේෂ ප්‍රකාශ)"),
    re.compile(r"^(வாய்மூல விடைக்கான வினாக்கள்|சமர்ப்பிக்கப்பட்ட பத்திரங்கள்|பிரேரணைகள்)"),
]


def parse_speaker_and_role(text: str) -> Tuple[Optional[str], Optional[str]]:
    """Conservatively extract speaker and role if clearly indicated, else None."""
    for pattern in SPEAKER_PATTERNS:
        match = pattern.search(text)
        if match:
            raw_speaker = match.group(1).strip()
            # Determine role if mentioned
            role = None
            if re.search(r"(Speaker|කථානායක|சபாநாயகர்)", raw_speaker, re.I):
                role = "Speaker"
            elif re.search(r"(Minister|ඇමති|අමාත්‍ය|அமைச்சர்)", raw_speaker, re.I):
                role = "Minister"
            elif re.search(r"(Leader of the House|සභානායක)", raw_speaker, re.I):
                role = "Leader of the House"

            return raw_speaker, role

    return None, None


def parse_parliamentary_metadata(text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Extract section, question number, and bill/motion if present."""
    section = None
    question_no = None
    bill = None

    for line in text.splitlines()[:5]:
        line_clean = line.strip()
        for sec_pat in SECTION_PATTERNS:
            if sec_pat.search(line_clean):
                section = line_clean
                break
        if section:
            break

    for q_pat in QUESTION_PATTERNS:
        q_match = q_pat.search(text)
        if q_match:
            question_no = q_match.group(1).strip()
            break

    for b_pat in BILL_PATTERNS:
        b_match = b_pat.search(text)
        if b_match:
            bill = b_match.group(1).strip()
            break

    return section, question_no, bill
