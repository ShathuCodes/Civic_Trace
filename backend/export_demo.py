"""Regenerate the explicitly labelled frontend demo snapshot: python -m backend.export_demo."""
import json
from pathlib import Path
from backend.app.main import DEMO
from backend.app.activity import DEMO_ATTENDANCE, DEMO_MEMBERSHIPS, DEMO_SITTINGS
from backend.app.evidence import DEMO_TRAIL_EVENTS, DEMO_TRAIL_RELATIONSHIPS

root = Path(__file__).resolve().parents[1]
data = {name: [item.model_dump() for item in records] for name, records in DEMO.items()}
for person in data['mps']:
    person['avatar_url'] = ''
data['attendance'] = [item.model_dump() for item in DEMO_ATTENDANCE]
data['memberships'] = [item.model_dump() for item in DEMO_MEMBERSHIPS]
data['sittings'] = [item.model_dump() for item in DEMO_SITTINGS]
data['trail_events'] = [item.model_dump() for item in DEMO_TRAIL_EVENTS]
data['trail_relationships'] = [item.model_dump() for item in DEMO_TRAIL_RELATIONSHIPS]
target = root / 'frontend/src/fixtures/demo.json'
target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(target)

