"""
Unit tests for CivicTrace Ingestion, Entity Resolution, and Promise Matching Engine.
"""

import unittest
from backend.app.data import Commitment, MP, Speech, TimestampSegment
from backend.app.ingest.mp_resolver import MPResolver, resolve_mp_speaker
from backend.app.ingest.hansard_parser import HansardParser
from backend.app.ingest.promise_matcher import PromiseMatcher
from backend.app.ingest.normalizer import DataNormalizer, NormalizationReport


class TestMPResolver(unittest.TestCase):
    def setUp(self):
        self.resolver = MPResolver()

    def test_english_honorifics_and_initials(self):
        mp_id, conf, _ = self.resolver.resolve("Hon. Dr. Harsha de Silva (Member for Colombo)")
        self.assertEqual(mp_id, "mp-harsha")
        self.assertGreaterEqual(conf, 0.7)

        mp_id, conf, _ = self.resolver.resolve("A. K. Dissanayake")
        self.assertEqual(mp_id, "mp-akd")
        self.assertGreaterEqual(conf, 0.7)

        mp_id, conf, _ = self.resolver.resolve("Opposition Leader Sajith Premadasa")
        self.assertEqual(mp_id, "mp-sajith")
        self.assertGreaterEqual(conf, 0.7)

    def test_sinhala_and_tamil_names(self):
        mp_id, conf, _ = self.resolver.resolve("ගරු අනුර කුමාර දිසානායක මහතා")
        self.assertEqual(mp_id, "mp-akd")
        self.assertGreaterEqual(conf, 0.7)

        mp_id, conf, _ = self.resolver.resolve("கௌரவ கலாநிதி ஹர்ஷ டி சில்வா")
        self.assertEqual(mp_id, "mp-harsha")
        self.assertGreaterEqual(conf, 0.7)

    def test_convenience_helper(self):
        self.assertEqual(resolve_mp_speaker("Ranil Wickremesinghe"), "mp-ranil")
        self.assertEqual(resolve_mp_speaker("Hon. Ali Sabry, PC"), "mp-alisabry")
        self.assertIsNone(resolve_mp_speaker("Unknown Foreign Visitor"))


class TestHansardParser(unittest.TestCase):
    def setUp(self):
        self.parser = HansardParser()

    def test_parse_debate_text(self):
        sample_transcript = """
Hon. Dr. Harsha de Silva:
We must ensure that the Committee on Public Finance scrutinizes every tax exemption.
Fiscal consolidation must protect vulnerable families through targeted cash transfers.

Anura Kumara Dissanayake:
We will introduce a comprehensive digital procurement bill to eliminate corruption in state contracts.
Public assets will be protected under an independent anti-fraud commission.
"""
        speeches = self.parser.parse_debate_text(
            raw_text=sample_transcript,
            sitting_date="2024-03-07",
            session_name="9th Parliament 4th Session",
            hansard_vol="Vol. 302",
            hansard_page="Col. 1420-1435",
            topic="Fiscal Transparency & Procurement",
        )
        self.assertEqual(len(speeches), 2)

        s1, s2 = speeches[0], speeches[1]
        self.assertEqual(s1.speaker_id, "mp-harsha")
        self.assertEqual(s1.sitting_date, "2024-03-07")
        self.assertEqual(s1.hansard_vol, "Vol. 302")
        self.assertEqual(len(s1.segments), 1)

        self.assertEqual(s2.speaker_id, "mp-akd")
        self.assertEqual(s2.segments[0].claim_type, "Policy Promise")


class TestPromiseMatcher(unittest.TestCase):
    def setUp(self):
        self.matcher = PromiseMatcher()
        self.speeches = [
            Speech(
                id="sp-1",
                title="Procurement Reform Bill Debate",
                speaker_id="mp-akd",
                speaker_name="Anura Kumara Dissanayake",
                speaker_role="President",
                party="NPP",
                sitting_date="2024-04-10",
                session_name="9th Parliament",
                hansard_vol="Vol. 305",
                hansard_page="Col. 500",
                hansard_pdf_url="https://parliament.lk/doc/1",
                video_url="",
                duration="05:00",
                duration_seconds=300,
                topic="Procurement Transparency",
                summary="The government enacted the digital procurement framework to eliminate kickbacks in state contracts.",
                key_claims=["Digital procurement implemented"],
                segments=[
                    TimestampSegment(
                        id="seg-1",
                        start_time="00:00",
                        start_seconds=0,
                        end_time="05:00",
                        end_seconds=300,
                        speaker="Anura Kumara Dissanayake",
                        text_en="We have introduced bill and gazetted the independent procurement commission.",
                        claim_type="Policy Promise",
                        fact_check_status="Verified Primary Source",
                    )
                ],
                votes_referenced=[],
            )
        ]

    def test_promise_matching_generates_timeline_event(self):
        commitment = Commitment(
            id="cmt-procurement",
            title="Digital Public Procurement",
            category="Procurement Transparency",
            party="NPP",
            sponsor_mp_id="mp-akd",
            sponsor_name="Anura Kumara Dissanayake",
            manifesto_source="Election Manifesto 2024",
            manifesto_year=2024,
            original_quote="All government contracts above Rs. 50 million will use open digital tenders.",
            current_status="In Progress",
            target_metric="100% digital tenders for state procurement",
            achieved_metric="Gazette draft published",
            verdict_summary="Under active legislative consideration.",
            timeline=[],
        )

        result = self.matcher.match_commitment(commitment, self.speeches)
        self.assertTrue(result.evidence_found)
        self.assertEqual(len(result.matched_speeches), 1)
        self.assertEqual(len(result.suggested_timeline_events), 1)
        event = result.suggested_timeline_events[0]
        self.assertEqual(event.source_type, "Hansard")
        self.assertEqual(event.source_ref, "Vol. 305, Col. 500")


class TestNormalizerAndQuarantine(unittest.TestCase):
    def setUp(self):
        sample_mps = [
            MP(
                id="mp-akd",
                name="Anura Kumara Dissanayake",
                sinhala_name="අනුර කුමාර දිසානායක",
                tamil_name="அநுர குமார திசாநாயக்க",
                party="NPP",
                party_code="NPP",
                district="Colombo",
                current_role="President",
                policy_focus=[],
                bio="",
                stances={},
                commitments_count={},
            )
        ]
        self.normalizer = DataNormalizer(sample_mps)

    def test_normalizer_quarantines_unresolved_speaker(self):
        report = NormalizationReport()
        raw_speeches = [
            {
                "id": "raw-1",
                "speaker": "Hon. Anura Kumara Dissanayake",
                "date": "2024-03-01",
                "text": "Discussion on national economy.",
            },
            {
                "id": "raw-2",
                "speaker": "Random Person Not In Parliament",
                "date": "2024-03-01",
                "text": "Unattributed speech snippet.",
            },
        ]

        normalized = self.normalizer.normalize_speeches(raw_speeches, report)
        self.assertEqual(len(normalized), 1)
        self.assertEqual(normalized[0].speaker_id, "mp-akd")
        self.assertEqual(report.total_processed, 2)
        self.assertEqual(report.total_valid, 1)
        self.assertEqual(report.total_quarantined, 1)
        self.assertIn("Unresolved speaker", report.quarantined[0].reason)


if __name__ == "__main__":
    unittest.main()
