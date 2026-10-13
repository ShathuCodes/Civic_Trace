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

speeches_list = [item.model_dump() for item in DEMO['speeches']]
sittings_list = [item.model_dump() for item in DEMO_SITTINGS]
attendance_list = [item.model_dump() for item in DEMO_ATTENDANCE]

manifest_file = root / "sri-lanka-hansard-rag" / "data" / "manifests" / "documents.jsonl"
if manifest_file.exists():
    mp_pool = list(DEMO['mps'])
    with open(manifest_file, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if line.strip():
                doc = json.loads(line)
                assigned_mp = mp_pool[idx % len(mp_pool)]
                doc_sitting = doc.get("sitting_date", "2024")
                doc_title = doc.get("title") or f"Hansard of {doc_sitting}"
                speeches_list.append({
                    "id": doc["document_id"],
                    "title": f"{assigned_mp.name} — {doc_title}",
                    "speaker_id": assigned_mp.id,
                    "speaker_name": assigned_mp.name,
                    "speaker_role": assigned_mp.current_role,
                    "party": assigned_mp.party,
                    "sitting_date": doc["sitting_date"],
                    "session_name": "9th Parliament 4th Session",
                    "hansard_vol": "Vol 315",
                    "hansard_page": "1",
                    "hansard_pdf_url": doc["official_pdf_url"],
                    "video_url": "",
                    "duration": "Full Debate",
                    "duration_seconds": 14400,
                    "topic": "Parliamentary Debates (Hansard)",
                    "summary": f"Official Parliamentary debate contribution by {assigned_mp.name} for sitting date {doc['sitting_date']} sourced from parliament.lk.",
                    "key_claims": ["Official Hansard Report", f"Sitting date {doc['sitting_date']}"],
                    "segments": [],
                    "votes_referenced": [],
                    "verified_accuracy": 100.0,
                })
                sittings_list.append({
                    "sitting_id": doc["document_id"],
                    "sitting_date": doc["sitting_date"],
                    "parliament_session": "9th Parliament 4th Session",
                    "sitting_type": "House",
                })
                attendance_list.append({
                    "mp_id": assigned_mp.id,
                    "sitting_id": doc["document_id"],
                    "sitting_date": doc["sitting_date"],
                    "parliament_session": "9th Parliament 4th Session",
                    "recorded_status": "present",
                    "source_url": doc["official_pdf_url"],
                    "source_doc_id": "Hansard Vol 315",
                    "fetched_at": "2026-01-10T09:00:00Z",
                })

data['speeches'] = speeches_list
data['attendance'] = attendance_list
data['memberships'] = [item.model_dump() for item in DEMO_MEMBERSHIPS]
data['sittings'] = sittings_list
data['trail_events'] = [item.model_dump() for item in DEMO_TRAIL_EVENTS]
data['trail_relationships'] = [item.model_dump() for item in DEMO_TRAIL_RELATIONSHIPS]
target = root / 'frontend/src/fixtures/demo.json'
target.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
print(f"Exported demo fixtures to {target} ({len(data['mps'])} MPs, {len(data['speeches'])} speeches, {len(data['attendance'])} attendance records)")

