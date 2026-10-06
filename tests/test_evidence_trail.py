"""
Civic Trace - "What happened after?" Evidence Trail unit tests.
Tests the complete evidence trail contract, relationships, source inspections,
date ordering, uncertain dates, unreviewed link separation, and review authorization.
"""

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app import main
from backend.app.evidence import TrailEvent, TrailRelationship


class EvidenceTrailTests(unittest.TestCase):
    def setUp(self):
        self.mode = patch.object(main, 'MODE', 'demo')
        self.mode.start()
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.mode.stop()

    def test_speech_evidence_trail_returns_origin_and_accepted_events(self):
        """A speech with accepted relationships returns the origin summary and chronologically ordered events."""
        res = self.client.get('/api/evidence-trails/sp-001')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['origin']['record_id'], 'sp-001')
        self.assertEqual(data['origin']['record_kind'], 'speech')
        self.assertIn('Debate on Anti-Corruption', data['origin']['title'])
        self.assertEqual(data['origin']['date_precision'], 'day')
        self.assertTrue(data['total_accepted'] > 0)
        self.assertEqual(data['coverage_status'], 'covered_with_events')

        # Check chronological ordering
        dates = [item['event']['date'] for item in data['established_trail']]
        self.assertEqual(dates, sorted(dates))

    def test_commitment_evidence_trail_returns_origin_and_events(self):
        """A commitment returns origin summary with manifesto quote and linked stages."""
        res = self.client.get('/api/evidence-trails/com-001')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['origin']['record_id'], 'com-001')
        self.assertEqual(data['origin']['record_kind'], 'commitment')
        self.assertIn('Digital Public Asset Declaration', data['origin']['title'])
        self.assertTrue(data['total_accepted'] >= 3)

    def test_unreviewed_suggestions_are_kept_separate(self):
        """Proposed/unreviewed candidate links must NOT appear in established_trail unless requested, and remain separate."""
        # Without include_unreviewed=true
        res_default = self.client.get('/api/evidence-trails/sp-001')
        self.assertEqual(res_default.status_code, 200)
        data_default = res_default.json()
        self.assertEqual(data_default['unreviewed_suggestions'], [])
        self.assertTrue(data_default['total_unreviewed'] >= 1)

        # All events in established_trail MUST have review_state == 'accepted'
        for item in data_default['established_trail']:
            self.assertEqual(item['relationship']['review_state'], 'accepted')

        # With include_unreviewed=true
        res_unreviewed = self.client.get('/api/evidence-trails/sp-001', params={'include_unreviewed': 'true'})
        self.assertEqual(res_unreviewed.status_code, 200)
        data_unrev = res_unreviewed.json()
        self.assertTrue(len(data_unrev['unreviewed_suggestions']) >= 1)
        for item in data_unrev['unreviewed_suggestions']:
            self.assertEqual(item['relationship']['review_state'], 'proposed')

    def test_filtering_by_event_type(self):
        """Filtering by event_type restricts the returned items to that exact type."""
        res = self.client.get('/api/evidence-trails/sp-002', params={'event_type': 'recorded_vote'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(len(data['established_trail']) >= 1)
        for item in data['established_trail']:
            self.assertEqual(item['event']['event_type'], 'recorded_vote')

    def test_filtering_by_date_range(self):
        """Date range restricts events to [date_from, date_to]."""
        res = self.client.get('/api/evidence-trails/sp-002', params={'date_from': '2024-01-01', 'date_to': '2024-03-31'})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        for item in data['established_trail']:
            self.assertTrue(item['event']['date'] >= '2024-01-01')
            self.assertTrue(item['event']['date'] <= '2024-03-31')

    def test_every_event_has_inspectable_source_or_unavailability_notice(self):
        """Every event has a valid source citation or explicitly marks source_available as false."""
        res = self.client.get('/api/evidence-trails/sp-001')
        data = res.json()
        for item in data['established_trail']:
            event = item['event']
            self.assertIn('source_type', event)
            self.assertIn('source_available', event)
            if not event['source_available']:
                self.assertIsNone(event['source_url'])
            else:
                self.assertTrue(bool(event['source_ref'] or event['source_url']))

    def test_trail_event_detail_endpoint(self):
        """GET /api/trail-events/{id} returns the full event context, linked speeches, and source summary."""
        res = self.client.get('/api/trail-events/evt-vat-01')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['event']['id'], 'evt-vat-01')
        self.assertEqual(data['event']['event_type'], 'recorded_vote')
        self.assertIn('Division No. 44', data['source_summary']['source_ref'])
        self.assertTrue(len(data['relationships']) >= 1)

    def test_nonexistent_record_returns_404(self):
        """Nonexistent record ID returns 404."""
        res = self.client.get('/api/evidence-trails/nonexistent-id')
        self.assertEqual(res.status_code, 404)

        res_evt = self.client.get('/api/trail-events/nonexistent-event')
        self.assertEqual(res_evt.status_code, 404)

    def test_honest_empty_state_for_record_with_no_linked_follow_ups(self):
        """Records without follow-up evidence return clean empty states without inventing events."""
        # sp-005 is M.A. Sumanthiran's speech on PTA with no follow-ups in this pilot snapshot
        res = self.client.get('/api/evidence-trails/sp-005')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['established_trail'], [])
        self.assertEqual(data['unreviewed_suggestions'], [])
        self.assertEqual(data['total_accepted'], 0)
        self.assertEqual(data['coverage_status'], 'no_linked_records')
        self.assertIn('No later linked evidence is available', data['coverage_explanation'])

    def test_topic_similarity_alone_does_not_create_accepted_relationship(self):
        """Two records sharing a topic (e.g. Anti-Corruption) do NOT show as follow-ups without an explicit relationship."""
        # sp-001 topic is 'Anti-Corruption & Transparency'. Check that another speech with similar topic isn't in trail.
        res = self.client.get('/api/evidence-trails/sp-001')
        data = res.json()
        linked_event_ids = {item['event']['id'] for item in data['established_trail']}
        # None of the events should be an unrelated speech
        for item in data['established_trail']:
            self.assertEqual(item['relationship']['from_record_id'], 'sp-001')

    def test_review_endpoint_rejects_unauthenticated_requests(self):
        """POST /api/trail-relationships/review rejects requests without valid reviewer token."""
        payload = {
            'relationship_id': 'rel-sp1-sug',
            'review_state': 'accepted',
            'reviewer': 'Jane Doe',
        }
        # Without token
        res_no_auth = self.client.post('/api/trail-relationships/review', json=payload)
        self.assertEqual(res_no_auth.status_code, 401)

        # With wrong token
        res_bad_auth = self.client.post(
            '/api/trail-relationships/review',
            json=payload,
            headers={'X-Reviewer-Token': 'wrong-token'}
        )
        self.assertEqual(res_bad_auth.status_code, 401)

    def test_review_endpoint_accepts_valid_authorized_review(self):
        """POST /api/trail-relationships/review allows authorized reviewer to update review state."""
        payload = {
            'relationship_id': 'rel-sp1-sug',
            'review_state': 'accepted',
            'reviewer': 'Senior Research Officer',
            'review_note': 'Verified against Hansard proceedings Section 14',
        }
        res = self.client.post(
            '/api/trail-relationships/review',
            json=payload,
            headers={'X-Reviewer-Token': 'civic-trace-review-secret-2024'}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['new_review_state'], 'accepted')
        self.assertEqual(data['reviewer'], 'Senior Research Officer')

        # Now sp-001 established trail includes this newly accepted relationship!
        trail_res = self.client.get('/api/evidence-trails/sp-001')
        trail_data = trail_res.json()
        accepted_rel_ids = [item['relationship']['id'] for item in trail_data['established_trail']]
        self.assertIn('rel-sp1-sug', accepted_rel_ids)


if __name__ == '__main__':
    unittest.main()
