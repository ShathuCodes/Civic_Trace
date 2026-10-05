"""
Promise ↔ Hansard Evidence Matching Engine.
Cross-references public commitments with parliamentary speeches and debate transcripts
to generate citation-backed evidence trails without biased or unverified scores.
"""

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from ..data import Commitment, CommitmentTimelineEvent, Speech


@dataclass
class MatchResult:
    """Outcome of matching a commitment to Hansard speeches."""
    commitment_id: str
    sponsor_mp_id: str
    matched_speeches: List[Speech] = field(default_factory=list)
    suggested_timeline_events: List[CommitmentTimelineEvent] = field(default_factory=list)
    recommended_status: str = "Under Review"  # Kept, In Progress, Compromised, Broken, Under Review
    status_rationale: str = ""
    evidence_found: bool = False


class PromiseMatcher:
    """
    Matches commitments to Hansard debates, extracts cited timeline events,
    and provides transparent, reviewable status recommendations.
    """

    # Keyword patterns indicative of policy progress or impediment
    POSITIVE_MARKERS = [
        "introduced bill", "enacted", "passed", "gazetted", "implemented", "funded",
        "allocated", "established", "launched", "tabled", "appropriated", "approved"
    ]
    NEGATIVE_MARKERS = [
        "delayed", "postponed", "withdrawn", "repealed", "suspended", "abandoned",
        "rejected", "voted against", "dropped", "cannot proceed", "fiscal constraint"
    ]
    COMPROMISE_MARKERS = [
        "amended", "revised target", "modified threshold", "interim measure",
        "transitional relief", "compromise formula", "phased reduction"
    ]

    def _extract_keywords(self, text: str) -> Set[str]:
        """Extract meaningful topic keywords from title and quotes."""
        stop_words = {
            "the", "a", "an", "and", "or", "to", "in", "of", "for", "with", "on", "at",
            "from", "by", "about", "we", "will", "our", "all", "that", "this", "is", "are"
        }
        words = re.findall(r"\b[a-zA-Z\u0D80-\u0DFF\u0B80-\u0BFF]{3,}\b", text.casefold())
        return {w for w in words if w not in stop_words}

    def match_commitment(
        self,
        commitment: Commitment,
        speeches: List[Speech],
    ) -> MatchResult:
        """
        Scan speeches for mentions or debate segments relevant to a commitment.
        """
        result = MatchResult(
            commitment_id=commitment.id,
            sponsor_mp_id=commitment.sponsor_mp_id,
        )

        # Build search keywords from commitment title, category, and target
        search_terms = self._extract_keywords(f"{commitment.title} {commitment.category} {commitment.target_metric}")

        matched: List[Tuple[int, Speech]] = []
        for speech in speeches:
            # Check if speaker is the sponsor or speech is within relevant topic
            is_sponsor = (speech.speaker_id == commitment.sponsor_mp_id)
            speech_text = f"{speech.title} {speech.summary} {speech.topic} " + " ".join(
                seg.text_en for seg in speech.segments
            )
            speech_terms = self._extract_keywords(speech_text)

            overlap = search_terms & speech_terms
            if overlap:
                score = len(overlap)
                if is_sponsor:
                    score += 3  # High priority to speeches by the sponsor MP
                if score >= 2:
                    matched.append((score, speech))

        matched.sort(key=lambda x: x[0], reverse=True)
        top_speeches = [item[1] for item in matched[:5]]
        result.matched_speeches = top_speeches
        result.evidence_found = bool(top_speeches)

        # Generate timeline events from matched speeches
        positive_count = 0
        negative_count = 0
        compromise_count = 0

        for s in top_speeches:
            combined_text = f"{s.title} {s.summary}".casefold()
            is_pos = any(m in combined_text for m in self.POSITIVE_MARKERS)
            is_neg = any(m in combined_text for m in self.NEGATIVE_MARKERS)
            is_comp = any(m in combined_text for m in self.COMPROMISE_MARKERS)

            if is_neg:
                impact = "Negative"
                negative_count += 1
            elif is_comp:
                impact = "Warning"
                compromise_count += 1
            elif is_pos:
                impact = "Positive"
                positive_count += 1
            else:
                impact = "Neutral"

            event = CommitmentTimelineEvent(
                date=s.sitting_date,
                stage="Parliamentary Debate",
                title=f"Debate: {s.title}",
                description=s.summary,
                source_type="Hansard",
                source_ref=f"{s.hansard_vol}, {s.hansard_page}",
                source_url=s.hansard_pdf_url,
                status_impact=impact,
            )
            result.suggested_timeline_events.append(event)

        # Synthesize transparent recommendation
        if not result.evidence_found:
            result.recommended_status = "Under Review"
            result.status_rationale = "No direct parliamentary speeches or legislative debates recorded yet."
        elif negative_count > positive_count:
            result.recommended_status = "Broken"
            result.status_rationale = "Parliamentary records document postponement, abandonment, or rejection of the target."
        elif compromise_count > 0 and positive_count == 0:
            result.recommended_status = "Compromised"
            result.status_rationale = "Hansard records show amended scope or compromised threshold."
        elif positive_count >= 2:
            result.recommended_status = "Kept"
            result.status_rationale = "Multiple parliamentary actions and legislative readings confirm implementation."
        else:
            result.recommended_status = "In Progress"
            result.status_rationale = "Active debate and interim legislative readings underway in Parliament."

        return result
