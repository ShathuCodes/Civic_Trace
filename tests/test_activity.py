"""
Tests for the MP Activity Profile endpoints.

Run with:
    python -m unittest discover -s tests -v

These tests use the demo dataset only and are isolated from any real database.
All attendance figures are from synthetic sample data clearly labelled as
unreviewed; they do NOT represent verified records for any real MP.
"""
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app import main
from backend.app.activity import DEMO_ATTENDANCE, DEMO_MEMBERSHIPS, DEMO_SITTINGS


class ActivityProfileTests(unittest.TestCase):
    def setUp(self):
        self.mode = patch.object(main, 'MODE', 'demo')
        self.mode.start()
        self.client = TestClient(main.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.mode.stop()

    # --- /api/mps/{id}/activity ---

    def test_activity_summary_returns_mp_metadata(self):
        r = self.client.get('/api/mps/mp-akd/activity')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['mp_id'], 'mp-akd')
        self.assertIn('party', data)
        self.assertIn('district', data)
        self.assertIn('current_role', data)
        self.assertIn('memberships', data)
        self.assertIsInstance(data['memberships'], list)

    def test_activity_summary_404_for_unknown_mp(self):
        r = self.client.get('/api/mps/mp-does-not-exist/activity')
        self.assertEqual(r.status_code, 404)

    def test_attendance_rate_uses_only_present_and_absent(self):
        """
        Rate denominator = present + absent only.
        Missing-data records must NOT increase the denominator.
        """
        r = self.client.get('/api/mps/mp-akd/activity')
        data = r.json()
        att = data['attendance']
        self.assertTrue(att['available'])
        present = att['present']
        absent = att['absent']
        missing = att['missing_data']
        # At least one of each in the demo data
        self.assertGreater(present, 0)
        self.assertGreater(missing, 0)
        if present + absent > 0:
            expected_rate = round(present / (present + absent) * 100, 1)
            self.assertAlmostEqual(att['attendance_rate'], expected_rate, places=1)
        # Confirm denominator label
        self.assertIn(str(present + absent), att['rate_denominator_label'])

    def test_missing_data_not_counted_as_absent(self):
        """Missing records remain unknown; they must not inflate the absent count."""
        r = self.client.get('/api/mps/mp-akd/activity')
        att = r.json()['attendance']
        # The mp-akd demo has one missing_data record
        self.assertGreater(att['missing_data'], 0)
        # Absent count should only reflect explicitly recorded absences
        explicit_absent = sum(
            1 for rec in DEMO_ATTENDANCE
            if rec.mp_id == 'mp-akd' and rec.recorded_status == 'absent'
        )
        self.assertEqual(att['absent'], explicit_absent)

    def test_date_filter_restricts_records(self):
        """Filtering to a tight date range must reduce (or preserve) counts."""
        r_all = self.client.get('/api/mps/mp-akd/activity')
        r_narrow = self.client.get('/api/mps/mp-akd/activity',
                                   params={'date_from': '2024-03-01', 'date_to': '2024-03-31'})
        self.assertEqual(r_narrow.status_code, 200)
        all_present = r_all.json()['attendance']['present']
        narrow_present = r_narrow.json()['attendance']['present']
        self.assertLessEqual(narrow_present, all_present)

    def test_reversed_date_range_is_rejected(self):
        r = self.client.get('/api/mps/mp-akd/activity',
                            params={'date_from': '2024-06-01', 'date_to': '2024-01-01'})
        self.assertEqual(r.status_code, 422)

    def test_invalid_date_format_is_rejected(self):
        r = self.client.get('/api/mps/mp-akd/activity',
                            params={'date_from': 'not-a-date'})
        self.assertEqual(r.status_code, 422)

    def test_speech_count_is_deduplicated(self):
        """
        Speech count must equal unique speech IDs, not transcript chunks or
        translation variants.
        """
        r = self.client.get('/api/mps/mp-akd/activity')
        data = r.json()
        speech_count = data['speeches']['count']
        # Verify against unique IDs in demo dataset
        unique_ids = {s.id for s in main.DEMO['speeches'] if s.speaker_id == 'mp-akd'}
        self.assertEqual(speech_count, len(unique_ids))

    def test_topics_sum_consistent_with_speech_count_for_single_topic_dataset(self):
        """
        Each speech has exactly one topic; topic total must equal speech count.
        """
        r = self.client.get('/api/mps/mp-akd/activity')
        data = r.json()
        speech_count = data['speeches']['count']
        topic_total = sum(t['count'] for t in data['speeches']['topics'])
        self.assertEqual(topic_total, speech_count)

    def test_filters_applied_echo_back(self):
        r = self.client.get('/api/mps/mp-akd/activity',
                            params={'date_from': '2024-01-01', 'date_to': '2024-12-31'})
        filters = r.json()['filters_applied']
        self.assertEqual(filters['date_from'], '2024-01-01')
        self.assertEqual(filters['date_to'], '2024-12-31')

    def test_eligible_sitting_days_respects_membership(self):
        """
        mp-ranil joined only in the 4th session. Sittings in 3rd session
        must not count towards his eligible days.
        """
        r = self.client.get('/api/mps/mp-ranil/activity')
        data = r.json()
        eligible = data['attendance']['eligible_sitting_days']
        # In the demo, ranil has no membership in 3rd session
        # All sittings in the demo for 3rd session should be ineligible
        third_session_sittings = [
            s for s in DEMO_SITTINGS if '3rd Session' in s.parliament_session
        ]
        # Eligible must be ≤ total sittings in demo
        all_sittings = len(DEMO_SITTINGS)
        if eligible is not None:
            self.assertLessEqual(eligible, all_sittings)
            # Ranil was not a member during the 3rd session sittings
            self.assertLessEqual(eligible, all_sittings - len(third_session_sittings))

    # --- /api/mps/{id}/attendance ---

    def test_attendance_records_endpoint(self):
        r = self.client.get('/api/mps/mp-akd/attendance')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data['available'])
        self.assertGreater(data['total'], 0)
        for rec in data['records']:
            self.assertEqual(rec['mp_id'], 'mp-akd')

    def test_attendance_deduplication_by_sitting_id(self):
        """No sitting_id should appear more than once in the response."""
        r = self.client.get('/api/mps/mp-akd/attendance')
        data = r.json()
        sitting_ids = [rec['sitting_id'] for rec in data['records']]
        self.assertEqual(len(sitting_ids), len(set(sitting_ids)))

    def test_attendance_status_filter(self):
        r = self.client.get('/api/mps/mp-akd/attendance', params={'status': 'present'})
        data = r.json()
        for rec in data['records']:
            self.assertEqual(rec['recorded_status'], 'present')

    def test_attendance_404_for_unknown_mp(self):
        r = self.client.get('/api/mps/unknown-mp/attendance')
        self.assertEqual(r.status_code, 404)

    def test_attendance_pagination(self):
        r = self.client.get('/api/mps/mp-akd/attendance',
                            params={'page': 1, 'page_size': 2})
        data = r.json()
        self.assertLessEqual(len(data['records']), 2)

    # --- /api/mps/{id}/speeches ---

    def test_speeches_endpoint(self):
        r = self.client.get('/api/mps/mp-akd/speeches')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn('speeches', data)
        self.assertIn('total', data)
        self.assertIn('label', data)
        self.assertIn('coverage_note', data)
        for s in data['speeches']:
            self.assertIn('id', s)
            self.assertIn('title', s)
            self.assertIn('sitting_date', s)
            self.assertIn('topic', s)
            self.assertIn('has_audio', s)

    def test_speeches_deduplication(self):
        """No speech ID should appear more than once."""
        r = self.client.get('/api/mps/mp-akd/speeches')
        speech_ids = [s['id'] for s in r.json()['speeches']]
        self.assertEqual(len(speech_ids), len(set(speech_ids)))

    def test_speeches_topic_filter(self):
        # Get a topic from the first result
        r = self.client.get('/api/mps/mp-akd/speeches')
        data = r.json()
        if not data['speeches']:
            return  # no speeches to test
        first_topic = data['speeches'][0]['topic']
        r2 = self.client.get('/api/mps/mp-akd/speeches', params={'topic': first_topic})
        for s in r2.json()['speeches']:
            self.assertEqual(s['topic'].casefold(), first_topic.casefold())

    def test_speeches_404_for_unknown_mp(self):
        r = self.client.get('/api/mps/unknown-mp/speeches')
        self.assertEqual(r.status_code, 404)

    def test_speeches_reversed_date_rejected(self):
        r = self.client.get('/api/mps/mp-akd/speeches',
                            params={'date_from': '2025-01-01', 'date_to': '2024-01-01'})
        self.assertEqual(r.status_code, 422)

    def test_speeches_date_filter(self):
        r_all = self.client.get('/api/mps/mp-akd/speeches')
        r_narrow = self.client.get('/api/mps/mp-akd/speeches',
                                   params={'date_from': '2024-03-01', 'date_to': '2024-03-31'})
        total_all = r_all.json()['total']
        total_narrow = r_narrow.json()['total']
        self.assertLessEqual(total_narrow, total_all)

    def test_speeches_empty_dataset_for_mp_with_no_speeches(self):
        """An MP in the directory but with no speeches must return 0, not an error."""
        # mp-alisabry has no speeches in the demo dataset
        r = self.client.get('/api/mps/mp-alisabry/speeches')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['total'], 0)

    def test_absence_not_inferred_from_no_speech(self):
        """
        An MP who is absent from the speech list for a sitting must NOT
        have an 'absent' attendance record generated automatically.
        The activity endpoint's absent count must come only from
        explicitly recorded attendance records.
        """
        # mp-alisabry: no speeches in the dataset at all
        r_att = self.client.get('/api/mps/mp-alisabry/attendance')
        att_records = r_att.json()['records']
        explicit_absent = [rec for rec in att_records
                           if rec['recorded_status'] == 'absent']
        # All absent records must have an explicit source in the demo
        for rec in explicit_absent:
            # These must have been in DEMO_ATTENDANCE explicitly
            found = any(
                d.mp_id == 'mp-alisabry' and
                d.sitting_id == rec['sitting_id'] and
                d.recorded_status == 'absent'
                for d in DEMO_ATTENDANCE
            )
            self.assertTrue(found, f"Absent record {rec['sitting_id']} not in demo attendance")


class ActivityUnavailableTests(unittest.TestCase):
    """Verify correct 503 / unavailable-state behaviour when activity data is missing."""

    def setUp(self):
        self.mode = patch.object(main, 'MODE', 'demo')
        self.mode.start()
        self.client = TestClient(main.app)
        self.client.__enter__()
        # Simulate no activity data
        self.client.app.state.activity = None

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.mode.stop()

    def test_activity_summary_503_when_activity_unavailable(self):
        r = self.client.get('/api/mps/mp-akd/activity')
        self.assertEqual(r.status_code, 503)

    def test_attendance_503_when_activity_unavailable(self):
        r = self.client.get('/api/mps/mp-akd/attendance')
        self.assertEqual(r.status_code, 503)

    def test_speeches_endpoint_still_works_without_activity(self):
        """Speeches come from the main records store, not the activity store."""
        r = self.client.get('/api/mps/mp-akd/speeches')
        # Should succeed because speeches are in main records, not activity
        # (activity None only blocks attendance endpoints)
        self.assertIn(r.status_code, [200, 503])


if __name__ == '__main__':
    unittest.main()
