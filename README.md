# CivicTrace

Evidence workspace for Sri Lankan parliamentary accountability: inspect MP speeches (Hansard), track public commitments, and link outcome sources—without pretending unverified data is “AI-verified truth.”

**Status:** pilot UI + read-only API on demo (or optional MongoDB snapshot). Honesty-analysis ingestion is not finished. See [docs/STATUS.md](docs/STATUS.md).

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/PRD.md](docs/PRD.md) | Product vision and goals |
| [docs/SRS.md](docs/SRS.md) | Software requirements + implementation tags |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Current and target architecture |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Delivery priorities |
| [docs/STATUS.md](docs/STATUS.md) | Completion audit |
| [docs/MONGODB_HANDOFF.md](docs/MONGODB_HANDOFF.md) | Partner database integration |
| [docs/application-schema.json](docs/application-schema.json) | Pilot collection schemas |
| [AGENTS.md](AGENTS.md) | Rules for coding agents |
| [qa/VALIDATION.md](qa/VALIDATION.md) | Build/test notes |

## Run locally

Node 22.12+ (tested with 24) and Python 3.11+ (tested with 3.12).

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

Second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. API docs: http://localhost:8000/docs. Vite proxies `/api` to the backend. Default data mode is **demo** (labelled unreviewed).

Windows: after dependencies are installed and the venv is active, `start_all.bat` can start both processes.

### Frontend-only demo

Copy `frontend/.env.example` → `frontend/.env.local`, set `VITE_DEMO_MODE=true`, restart Vite. API failures never silently enable demo mode; choose it from the error screen.

### MongoDB

Set `DATA_MODE=mongodb`, `MONGODB_URI`, and `MONGODB_DATABASE` on the **backend**. Read [docs/MONGODB_HANDOFF.md](docs/MONGODB_HANDOFF.md) first. Raw scrapes need normalization. Adapter is read-only and loads a startup snapshot (restart to refresh). Real partner DB is not yet tested in this repo.

### Verify

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
python -m unittest discover -s tests -v
```

## What works today

- Browse MPs, parties, speeches, commitments, issue timelines (demo data)
- Hash routes, bookmarks, JSON export, EN/SI/TA transcript toggle
- Compare 2–3 MP stances without fake rankings
- MP activity profile with explicit attendance denominators
- Honest keyword-only `/api/chat` (not RAG)

## What does not work yet

- Live Hansard or news ingestion
- Automatic promise extraction or honesty scoring
- Human editorial review workflow
- Production pagination, full SI/TA UI, authenticated writes

## Design stance

The earlier prototype overclaimed AI/metrics. This pilot keeps browsing flows and drops unsupported “verified” theatre. Extend evidence and provenance before adding scores or generative assistants.
