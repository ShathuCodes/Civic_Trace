# MongoDB handoff and connection guide

Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [application-schema.json](./application-schema.json) · [ROADMAP.md](./ROADMAP.md)

The adapter is implemented; a real database connection has NOT been tested because no URI or real schema was supplied.

## Ask your friend for these items

1. Database name and exact collection names.
2. Three to five REDACTED sample documents from every collection, including one incomplete record and one multilingual record.
3. A field dictionary: types, date formats, IDs, joins, timestamps, language codes, and whether transcript offsets are relative to a clip or to the full video.
4. Source provenance: canonical source URL, document/page reference, publication date, scrape time, raw text/PDF location, source language, and parser version.
5. Coverage: time range, sitting IDs, people covered, record counts, missing sessions, update schedule, duplicates, and known extraction errors.
6. Database access through a server-side read-only account and a restricted network allowlist. Share credentials privately, not in a repository or frontend environment variable.

## Adapter supplied in this patch

Backend environment variables:

```text
DATA_MODE=mongodb
MONGODB_URI=<server-side connection string>
MONGODB_DATABASE=<database name>
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

The backend does not automatically load backend/.env.example. Set the variables in your terminal or hosting secret manager. If you use a .env file later, add an explicit loader and keep it ignored.

PowerShell example (enter credentials locally):

```powershell
$env:DATA_MODE = "mongodb"
$env:MONGODB_DATABASE = "civic_trace"
# Set MONGODB_URI privately in this shell or secret manager.
python -m uvicorn backend.app.main:app --reload --port 8000
```

Required normalized collections are `mps`, `parties`, `speeches`, `commitments`, and `timelines`. Empty collections are allowed. Existing documents must conform to the Pydantic models in backend/app/data.py; see docs/application-schema.json for their machine-readable shapes. Public IDs are string `id` fields, separate from MongoDB `_id`. Speech `speaker_id` and commitment `sponsor_mp_id` must reference a public `mps.id`.

Startup reads an immutable snapshot, validates records, checks duplicate IDs and those foreign references, and exposes /api/workspace. A configuration/connection/schema failure produces 503, never sample records. Server logs show only the exception type, not document contents or the URI. Data is marked unreviewed even if loaded from MongoDB.

**Pilot limits:** at most 5,000 documents per collection; a startup snapshot requires restart to refresh; the aggregate endpoint returns the whole snapshot. This is an integration bridge for a small pilot, not a production query layer. The real connection, TLS/network settings, field mapping, and large datasets need validation when access is available. No data is written to MongoDB by this adapter.

## Mapping raw scraped documents

Do not rename raw fields destructively. Produce a new normalized collection or a staging database. Keep immutable raw records and a mapping report. For example, raw `speaker`, `date`, `content`, and `url` are not sufficient for every Speech field. Resolve a stable person ID, identify the sitting and source passage, preserve raw source data, and represent missing video/transcript information explicitly. Do not invent political metrics or timestamps to satisfy the legacy model.

Unsupported legacy metrics (attendance_rate, loyalty_index, total_speeches, votes_attended, confidence_score, verified_accuracy) are now nullable with a default of null; avatar_url defaults to an empty string. The redesigned UI does not display these unreviewed numbers or stock portraits. Omit unsupported metrics rather than guessing them. Other content fields still require a deliberate mapping.

Recommended production indexes after the contract is confirmed: unique id per entity; speeches(sitting_date,id); speeches(speaker_id,sitting_date,id); commitments(sponsor_mp_id,current_status,id); source_documents(canonical_url,content_hash); source_passages(source_id,page); ingestion_runs(started_at). Query patterns and the deployed MongoDB edition determine the final keyword/vector index design.

## Acceptance before switching the demo off

- Validate every normalized document and all entity references; quarantine invalid rows.
- Manually open at least ten exact source passages and compare extraction against the original.
- Check empty, missing, duplicate, multilingual and historical-role examples.
- Record actual coverage and freshness; don't call a snapshot live.
- Exercise unavailable DB, wrong credentials, missing configuration, malformed records, and empty collections.
- Confirm no credentials or database connection string appears in frontend bundles, logs, exports, or Git.
