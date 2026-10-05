"""
Parliamentary Hansard Debate Parser for Sri Lanka.
Extracts sitting metadata, speaker turns, policy statements, and citations,
and structures them into validated Speech and TimestampSegment records.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from ..data import Speech, TimestampSegment
from .mp_resolver import MPResolver, resolve_mp_speaker


@dataclass
class HansardTurn:
    """Represents a single speaker turn extracted from a debate transcript."""
    raw_speaker: str
    text_en: str
    text_si: Optional[str] = None
    text_ta: Optional[str] = None
    start_seconds: int = 0
    end_seconds: int = 0
    claim_type: str = "Factual Statement"  # Policy Promise, Critique, Factual Statement, Legislative Defense
    speaker_id: Optional[str] = None


class HansardParser:
    """
    Parses parliamentary debate transcripts, extracts sitting dates and volumes,
    and structures debate turns into validated Speech and TimestampSegment models.
    """

    def __init__(self, resolver: Optional[MPResolver] = None):
        self.resolver = resolver or MPResolver()

    def parse_speaker_turn(self, raw_header: str) -> Tuple[str, Optional[str]]:
        """
        Extract the speaker's name and role from a Hansard turn header line.
        Examples:
          - "Hon. Dr. Harsha de Silva (Member for Colombo):"
          - "The Minister of Foreign Affairs (Hon. Ali Sabry):"
          - "Anura Kumara Dissanayake:"
          - "ගරු අනුර කුමාර දිසානායක මහතා:"
        """
        header = raw_header.strip().rstrip(":")
        # Check for role inside parentheses: "Speaker Name (Role)"
        role_match = re.search(r"\((.*?)\)", header)
        role = role_match.group(1).strip() if role_match else None
        clean_name = re.sub(r"\(.*?\)", "", header).strip()
        return clean_name, role

    def classify_claim_type(self, text: str) -> str:
        """Heuristic classification of a debate segment."""
        text_lower = text.casefold()
        if any(w in text_lower for w in ["we will", "promise", "pledge", "committed to", "shall introduce", "අප ක්‍රියාත්මක කරනවා", "පොරොන්දු"]):
            return "Policy Promise"
        if any(w in text_lower for w in ["failure", "crisis", "mismanagement", "corruption", "unacceptable", "ව්‍යසනය", "වංචා"]):
            return "Critique"
        if any(w in text_lower for w in ["government is", "bill provides", "statute", "amendment clause", "පනත් කෙටුම්පත"]):
            return "Legislative Defense"
        return "Factual Statement"

    def parse_debate_text(
        self,
        raw_text: str,
        sitting_date: str,
        session_name: str,
        hansard_vol: str = "Vol. Pilot",
        hansard_page: str = "Col. 1-50",
        hansard_pdf_url: str = "https://www.parliament.lk/hansard",
        video_url: str = "",
        topic: str = "Parliamentary Debate",
    ) -> List[Speech]:
        """
        Parses raw text of a parliamentary sitting with turns formatted as:
        [Speaker Header]:
        Speech text...

        Returns a list of validated Speech objects.
        """
        # Split text into turns by line matching "[Title/Name]:"
        pattern = re.compile(r"^([A-Z\u0D80-\u0DFF\u0B80-\u0BFF][^:\n]{2,80}):\s*$", re.MULTILINE)
        matches = list(pattern.finditer(raw_text))

        speeches: List[Speech] = []
        if not matches:
            return speeches

        for i, match in enumerate(matches):
            raw_header = match.group(1)
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
            speech_body = raw_text[start_pos:end_pos].strip()

            if not speech_body:
                continue

            speaker_name, role = self.parse_speaker_turn(raw_header)
            mp_id, conf, _ = self.resolver.resolve(speaker_name)

            # Skip or quarantine turns that cannot be resolved to a known MP
            if not mp_id or conf < 0.6:
                continue

            mp_info = self.resolver.get_mp(mp_id) or {}
            canonical_name = mp_info.get("name", speaker_name)

            # Build timestamp segment
            claim_type = self.classify_claim_type(speech_body)
            segment_id = f"seg-{sitting_date}-{mp_id}-{i+1}"
            segment = TimestampSegment(
                id=segment_id,
                start_time=f"00:{i*2:02d}:00",
                start_seconds=i * 120,
                end_time=f"00:{(i+1)*2:02d}:00",
                end_seconds=(i + 1) * 120,
                speaker=canonical_name,
                text_en=speech_body,
                claim_type=claim_type,
                fact_check_status="Verified Primary Source",
            )

            # Extract first sentence as summary
            sentences = re.split(r"[.!?]\s+", speech_body)
            summary = sentences[0] + "." if sentences else speech_body[:200]
            title = f"{canonical_name} on {topic} ({sitting_date})"

            speech_id = f"speech-{sitting_date}-{mp_id}"
            speech = Speech(
                id=speech_id,
                title=title,
                speaker_id=mp_id,
                speaker_name=canonical_name,
                speaker_role=role or "Member of Parliament",
                party="Parliament",
                sitting_date=sitting_date,
                session_name=session_name,
                hansard_vol=hansard_vol,
                hansard_page=hansard_page,
                hansard_pdf_url=hansard_pdf_url,
                video_url=video_url,
                duration="02:00",
                duration_seconds=120,
                topic=topic,
                summary=summary,
                key_claims=[sentences[0]] if sentences else [summary],
                segments=[segment],
                votes_referenced=[],
            )
            speeches.append(speech)

        return speeches
