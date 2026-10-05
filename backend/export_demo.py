"""Regenerate the explicitly labelled frontend demo snapshot: python -m backend.export_demo."""
import json
from pathlib import Path
from backend.app.main import DEMO

root = Path(__file__).resolve().parents[1]
data = {name: [item.model_dump() for item in records] for name, records in DEMO.items()}
for person in data['mps']:
    person['avatar_url'] = ''
target = root / 'frontend/src/fixtures/demo.json'
target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(target)
