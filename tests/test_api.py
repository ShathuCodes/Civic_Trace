"""Run with: python -m unittest discover -s tests -v"""
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app import main

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.mode = patch.object(main, 'MODE', 'demo'); self.mode.start()
        self.client = TestClient(main.app); self.client.__enter__()
    def tearDown(self):
        self.client.__exit__(None, None, None); self.mode.stop()
    def test_workspace_and_counts(self):
        data = self.client.get('/api/workspace').json()
        self.assertEqual(data['meta']['mode'], 'demo')
        self.assertEqual(data['meta']['verification'], 'unreviewed')
        stats = self.client.get('/api/stats').json()
        self.assertEqual(stats['total_speeches_indexed'], len(data['speeches']))
        self.assertIsNone(stats['average_whisper_alignment_accuracy'])
    def test_search_and_detail(self):
        all_records = self.client.get('/api/speeches').json()
        self.assertTrue(all_records)
        speech = all_records[0]
        found = self.client.get('/api/speeches', params={'speaker_id':speech['speaker_id']}).json()
        self.assertTrue(all(s['speaker_id'] == speech['speaker_id'] for s in found))
        self.assertEqual(self.client.get('/api/speeches/'+speech['id']).json()['id'], speech['id'])
        self.assertEqual(self.client.get('/api/speeches/missing').status_code, 404)
        self.assertEqual(self.client.get('/api/speeches', params={'search':'zzzznotarecord'}).json(), [])
    def test_comparison_rejects_invalid_selection(self):
        ids = [m['id'] for m in self.client.get('/api/mps').json()]
        self.assertEqual(self.client.post('/api/compare', json={'leader_ids':ids[:2]}).status_code, 200)
        for invalid in [[], [ids[0]], [ids[0], ids[0]], [ids[0], 'missing']]:
            self.assertEqual(self.client.post('/api/compare', json={'leader_ids':invalid}).status_code, 422)
    def test_chat_does_not_claim_rag_or_verification(self):
        result = self.client.post('/api/chat', json={'query':'tax'}).json()
        self.assertIn('keyword retrieval', result['answer'])
        self.assertEqual(result['grounded_claim_count'], 0)
        self.assertEqual(self.client.post('/api/chat', json={'query':'a'}).status_code, 422)
        result = self.client.post('/api/chat', json={'query':'zzzznotarecord'}).json()
        self.assertEqual(result['citations'], [])
    def test_cors_rejects_unconfigured_origin(self):
        r = self.client.options('/api/workspace', headers={'origin':'https://untrusted.invalid', 'access-control-request-method':'GET'})
        self.assertEqual(r.status_code, 400)

class MongoStartupTests(unittest.TestCase):
    def test_missing_configuration_never_falls_back_to_demo(self):
        with patch.object(main, 'MODE', 'mongodb'), patch.dict('os.environ', {'MONGODB_URI':'', 'MONGODB_DATABASE':''}):
            with TestClient(main.app) as client:
                self.assertEqual(client.get('/api/workspace').status_code, 503)
                self.assertEqual(client.get('/api/health').status_code, 503)
    def test_schema_mapped_snapshot(self):
        class Collection:
            def __init__(self, docs): self.docs = docs
            def count_documents(self, query): return len(self.docs)
            def find(self, query, projection): return self.docs
        class DB:
            def __getitem__(self, name): return Collection([x.model_dump() for x in main.DEMO[name]])
        class Client:
            admin = None
            def __init__(self, *args, **kwargs): self.admin = self
            def command(self, cmd): return {'ok':1}
            def __getitem__(self, db): return DB()
            def close(self): pass
        with patch.object(main, 'MODE', 'mongodb'), patch.dict('os.environ', {'MONGODB_URI':'mongodb://example', 'MONGODB_DATABASE':'test'}), patch('pymongo.MongoClient', Client):
            with TestClient(main.app) as client:
                result = client.get('/api/workspace')
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json()['meta']['mode'], 'mongodb')
                self.assertTrue(result.json()['speeches'])

if __name__ == '__main__': unittest.main()
