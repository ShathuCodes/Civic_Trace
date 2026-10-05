# Architecture — CivicTrace

**Last updated:** 2026-10-06

## 1. Current architecture (pilot)

```
┌─────────────────────────────────────────────────────────┐
│  frontend/ (React 19 + Vite 8 + TypeScript)             │
│  Hash router · editorial CSS · optional VITE_DEMO_MODE  │
└───────────────────────────┬─────────────────────────────┘
                            │ /api (Vite proxy → :8000)
┌───────────────────────────▼─────────────────────────────┐
│  backend/app/main.py (FastAPI, read-only)               │
│  data.py (models + SAMPLE_*) · activity.py (attendance) │
└───────────────────────────┬─────────────────────────────┘
           ┌────────────────┴────────────────┐
           ▼                                 ▼
    DATA_MODE=demo                    DATA_MODE=mongodb
    in-process lists                  pymongo startup snapshot
                                      (≤5k docs/collection)
```

### What this is good for

- Demonstrating citizen flows: browse speeches, commitments, timelines, compare stances, MP activity  
- Honest failure modes (503, explicit demo selection)  
- A stable **application schema** for a data partner to normalize into  

### What this is not

- Not an honesty-analysis pipeline  
- Not live Hansard/news ingestion  
- Not production query/pagination architecture  

## 2. Target architecture (honesty analysis)

```
 Official Hansard / gazette / news RSS / partner scrapes
                         │
                         ▼
              ┌──────────────────────┐
              │  Raw archive (immutable) │  source URL, hash, fetched_at,
              │  IngestionRun            │  MIME, language, parser version
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  Normalize + link      │  Person, Sitting, Passage,
              │  Claim extraction queue│  Commitment, EvidenceLink
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  Human review          │  ReviewDecision, revisions
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │  Read API + UI         │  published assessments only
              └──────────────────────┘
```

### Core entities (target)

| Entity | Role |
|--------|------|
| SourceDocument | Immutable fetched Hansard PDF/HTML/news article |
| SourcePassage | Exact excerpt with page/time anchors |
| Person / RoleTerm | Stable MP identity + dated offices |
| Sitting / SpeechSegment | Chamber calendar + spoken segments |
| Claim | Atomic statement extracted from text |
| Commitment | Trackable promise with deadline/target |
| EvidenceLink | Claim/commitment ↔ passage/news |
| PolicyEvent | Timeline outcome with source |
| ReviewDecision | Human gate before public status |

Schema for the **current** pilot models: [application-schema.json](./application-schema.json).  
Mongo handoff: [MONGODB_HANDOFF.md](./MONGODB_HANDOFF.md).

## 3. Trust boundaries

| Layer | Rule |
|-------|------|
| Browser | No DB URIs, no model keys, no silent demo fallback |
| API | Validate inputs; null unsupported legacy metrics |
| Raw store | Append-only; corrections via new versions |
| Public UI | Show review status; never “live verified” without eval |

## 4. Repository layout

```
civictrace/
├── AGENTS.md                 # Instructions for coding agents
├── README.md                 # Runbook + honest scope
├── docs/                     # PRD, SRS, architecture, roadmap, data
├── backend/app/              # FastAPI application
├── frontend/src/             # SPA (App.tsx workspace + MPActivityProfile)
├── tests/                    # API + browser smoke
└── qa/                       # Validation notes + screenshots
```

## 5. Design constraints for implementers

- Preserve editorial UI: warm neutrals, restrained green, compact lists — no neon/glass “AI dashboard” aesthetics  
- Prefer evidence browsers over decorative charts (`recharts` is unused and should stay unused until measured series exist)  
- Keep `/api/chat` honest until real cited retrieval ships  
- Extend models carefully; quarantine invalid partner documents rather than inventing fields  

## 6. Technology choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| API | FastAPI + Pydantic v2 | Fast validation, OpenAPI for partners |
| UI | React + Vite | Existing pilot; hash routes for shareable demos |
| Store (pilot) | MongoDB snapshot or demo lists | Matches likely scrape partner |
| Store (future) | Mongo raw + normalized; optional Postgres later | Not a prerequisite to start |
| ASR / LLM | Deferred | Only after retrieval eval + review workflow |
