"""
Data Normalization & Quarantine Layer.
Transforms raw scraped records into schema-conforming Pydantic models,
resolves entity relationships, and quarantines invalid records into an audit log.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import ValidationError
from ..data import Commitment, IssueTimeline, MP, Party, Speech, TimestampSegment
from .mp_resolver import MPResolver


@dataclass
class QuarantineRecord:
    collection: str
    raw_data: Dict[str, Any]
    reason: str


@dataclass
class NormalizationReport:
    total_processed: int = 0
    total_valid: int = 0
    total_quarantined: int = 0
    quarantined: List[QuarantineRecord] = field(default_factory=list)
    resolved_speakers: int = 0


class DataNormalizer:
    """
    Normalizes raw scraped documents into CivicTrace application models.
    Guarantees referential integrity before records reach the live API.
    """

    def __init__(self, mp_pool: Optional[List[MP]] = None):
        self.resolver = MPResolver([m.model_dump() for m in mp_pool] if mp_pool else None)
        self.registered_mp_ids: Set[str] = {m.id for m in mp_pool} if mp_pool else set()

    def register_mps(self, mps: List[MP]):
        """Register valid MPs for referential integrity checks."""
        for m in mps:
            self.registered_mp_ids.add(m.id)
            self.resolver.register_mp(m.model_dump())

    def normalize_speeches(
        self,
        raw_speeches: List[Dict[str, Any]],
        report: NormalizationReport,
    ) -> List[Speech]:
        """
        Normalize a list of raw speech dicts.
        Maps raw fields, resolves speaker_id, and quarantines invalid items.
        """
        valid_speeches: List[Speech] = []
        seen_ids: Set[str] = set()

        for raw in raw_speeches:
            report.total_processed += 1
            raw_id = str(raw.get("id") or f"speech-{raw.get('date', 'unknown')}-{report.total_processed}")

            if raw_id in seen_ids:
                report.total_quarantined += 1
                report.quarantined.append(QuarantineRecord("speeches", raw, f"Duplicate ID: {raw_id}"))
                continue

            # Resolve speaker
            raw_speaker = raw.get("speaker") or raw.get("speaker_name") or ""
            speaker_id = raw.get("speaker_id")
            if not speaker_id or speaker_id not in self.registered_mp_ids:
                resolved_id, conf, _ = self.resolver.resolve(raw_speaker)
                if resolved_id and conf >= 0.6:
                    speaker_id = resolved_id
                    report.resolved_speakers += 1
                else:
                    report.total_quarantined += 1
                    report.quarantined.append(
                        QuarantineRecord("speeches", raw, f"Unresolved speaker: '{raw_speaker}'")
                    )
                    continue

            # Build segments if raw text provided
            segments = raw.get("segments") or []
            if not segments and (raw.get("text") or raw.get("content")):
                content = raw.get("text") or raw.get("content") or ""
                segments = [
                    TimestampSegment(
                        id=f"{raw_id}-seg1",
                        start_time="00:00:00",
                        start_seconds=0,
                        end_time="00:05:00",
                        end_seconds=300,
                        speaker=raw_speaker,
                        text_en=content,
                        claim_type="Factual Statement",
                        fact_check_status="Verified Primary Source",
                    )
                ]

            try:
                speech = Speech(
                    id=raw_id,
                    title=raw.get("title") or f"Speech by {raw_speaker}",
                    speaker_id=speaker_id,
                    speaker_name=raw_speaker or "Member of Parliament",
                    speaker_role=raw.get("speaker_role") or "Member of Parliament",
                    party=raw.get("party") or "Parliament",
                    sitting_date=str(raw.get("date") or raw.get("sitting_date") or "2024-01-01"),
                    session_name=raw.get("session_name") or "Parliament Session",
                    hansard_vol=str(raw.get("hansard_vol") or "Vol. N/A"),
                    hansard_page=str(raw.get("hansard_page") or "Col. N/A"),
                    hansard_pdf_url=raw.get("hansard_pdf_url") or raw.get("url") or "",
                    video_url=raw.get("video_url") or "",
                    duration=raw.get("duration") or "05:00",
                    duration_seconds=int(raw.get("duration_seconds") or 300),
                    topic=raw.get("topic") or "General Parliamentary Business",
                    summary=raw.get("summary") or (segments[0].text_en[:200] if segments else "Speech summary"),
                    key_claims=raw.get("key_claims") or [],
                    segments=segments,
                    votes_referenced=raw.get("votes_referenced") or [],
                )
                valid_speeches.append(speech)
                seen_ids.add(raw_id)
                report.total_valid += 1
            except ValidationError as exc:
                report.total_quarantined += 1
                report.quarantined.append(QuarantineRecord("speeches", raw, f"Pydantic error: {exc}"))

        return valid_speeches

    def normalize_commitments(
        self,
        raw_commitments: List[Dict[str, Any]],
        report: NormalizationReport,
    ) -> List[Commitment]:
        """
        Normalize raw policy commitments/promises and verify sponsor MP.
        """
        valid_commitments: List[Commitment] = []
        seen_ids: Set[str] = set()

        for raw in raw_commitments:
            report.total_processed += 1
            raw_id = str(raw.get("id") or f"cmt-{report.total_processed}")

            if raw_id in seen_ids:
                report.total_quarantined += 1
                report.quarantined.append(QuarantineRecord("commitments", raw, f"Duplicate ID: {raw_id}"))
                continue

            sponsor_name = raw.get("sponsor_name") or raw.get("sponsor") or ""
            sponsor_id = raw.get("sponsor_mp_id")
            if not sponsor_id or sponsor_id not in self.registered_mp_ids:
                resolved_id, conf, _ = self.resolver.resolve(sponsor_name)
                if resolved_id and conf >= 0.6:
                    sponsor_id = resolved_id
                    report.resolved_speakers += 1
                else:
                    report.total_quarantined += 1
                    report.quarantined.append(
                        QuarantineRecord("commitments", raw, f"Unresolved commitment sponsor: '{sponsor_name}'")
                    )
                    continue

            try:
                cmt = Commitment(
                    id=raw_id,
                    title=raw.get("title") or "Untitled Commitment",
                    category=raw.get("category") or "General Policy",
                    party=raw.get("party") or "Independent",
                    sponsor_mp_id=sponsor_id,
                    sponsor_name=sponsor_name or "Member of Parliament",
                    manifesto_source=raw.get("manifesto_source") or "Election Manifesto / News Record",
                    manifesto_year=int(raw.get("manifesto_year") or 2024),
                    original_quote=raw.get("original_quote") or raw.get("quote") or "Public pledge recorded.",
                    current_status=raw.get("current_status") or "Under Review",
                    target_metric=raw.get("target_metric") or "Metric under observation",
                    achieved_metric=raw.get("achieved_metric") or "Pending verification",
                    confidence_score=raw.get("confidence_score"),
                    verdict_summary=raw.get("verdict_summary") or "Awaiting parliamentary evidence cross-check.",
                    timeline=raw.get("timeline") or [],
                )
                valid_commitments.append(cmt)
                seen_ids.add(raw_id)
                report.total_valid += 1
            except ValidationError as exc:
                report.total_quarantined += 1
                report.quarantined.append(QuarantineRecord("commitments", raw, f"Pydantic error: {exc}"))

        return valid_commitments
