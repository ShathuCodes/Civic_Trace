# Software Requirements Specification — CivicTrace

**Version:** 0.2 (pilot)  
**Related:** [PRD](./PRD.md), [Architecture](./ARCHITECTURE.md), [application-schema.json](./application-schema.json)  
**Last updated:** 2026-10-06

## 1. Introduction

### 1.1 Purpose

Specify functional and non-functional requirements for CivicTrace so implementers and agents can distinguish **implemented**, **partial**, and **planned** behavior.

### 1.2 Scope

CivicTrace is a read-mostly web application:

- **Frontend:** React + TypeScript + Vite SPA  
- **Backend:** FastAPI read-only API  
- **Data:** Demo seed or MongoDB startup snapshot (pilot)

Out of scope for this SRS revision: production multi-tenant auth, write APIs for public users, and live generative RAG.

### 1.3 Definitions

| Term | Meaning |
|------|---------|
| Hansard | Official parliamentary debate record (PDF/HTML/sitting transcript) |
| Commitment | A trackable public promise attributed to an MP or party |
| Passage | Exact excerpt with document/page/time anchors |
| Assessment | Human-reviewed status of a commitment given evidence |
| Demo mode | Bundled synthetic sample data; always labelled unreviewed |

## 2. System overview

```
[Citizen UI] --/api--> [FastAPI] --snapshot--> [Demo seed | MongoDB]
                              \--> [future: ingest workers, review tools]
```

## 3. Functional requirements

### 3.1 Data modes

| ID | Requirement | Status |
|----|-------------|--------|
| FR-DM-01 | System SHALL support `DATA_MODE=demo` with labelled sample data | Implemented |
| FR-DM-02 | System SHALL support `DATA_MODE=mongodb` read-only snapshot with schema validation | Implemented (untested vs real DB) |
| FR-DM-03 | On data init failure, API SHALL return 503 and MUST NOT silently fall back to demo | Implemented |
| FR-DM-04 | Frontend MAY offer explicit user-selected demo mode; MUST NOT auto-activate on API failure | Implemented |

### 3.2 Entities (application layer)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-EN-01 | Persist/serve MPs, parties, speeches, commitments, issue timelines | Implemented (demo/schema) |
| FR-EN-02 | Optional attendance, memberships, sittings for activity profiles | Implemented (demo) |
| FR-EN-03 | Store SourceDocument, SourcePassage, Claim, EvidenceLink, ReviewDecision, IngestionRun | Planned |
| FR-EN-04 | Role/party affiliations SHALL be date-bounded (`valid_from` / `valid_to`) | Partial (memberships) |

### 3.3 Speeches & Hansard

| ID | Requirement | Status |
|----|-------------|--------|
| FR-SP-01 | List/filter speeches; open detail with EN/SI/TA transcript toggle | Implemented (demo) |
| FR-SP-02 | Each speech SHALL carry Hansard volume/page/URL when available | Schema ready; live ingest missing |
| FR-SP-03 | System SHALL ingest Hansard from official sources on a schedule | Ingestion parser & MP resolver implemented (`app.ingest`) |
| FR-SP-04 | Unsafe URL schemes MUST be rejected for source links | Planned |

### 3.4 Commitments (promises)

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CM-01 | List/filter commitments by status and sponsor | Implemented (demo) |
| FR-CM-02 | Status values: Kept, In Progress, Compromised, Broken, Under Review; Insufficient Evidence planned | Partial |
| FR-CM-03 | Status changes REQUIRE human review with criteria and evidence links | Missing |
| FR-CM-04 | Missing evidence MUST NOT auto-map to Broken | Product rule (enforced in `PromiseMatcher`) |
| FR-CM-05 | Extract promises from manifesto/Hansard text (assisted) | Implemented (`PromiseMatcher` + `DataNormalizer`) |

### 3.5 News & outcomes

| ID | Requirement | Status |
|----|-------------|--------|
| FR-NW-01 | Attach outcome events to commitments/timelines with source URLs | Schema/UI partial (seeded) |
| FR-NW-02 | Ingest from allowlisted news / gazette / official stats sources | Missing |
| FR-NW-03 | UI MUST NOT imply MP sole causation from outcome articles | Product rule |

### 3.6 Comparison & activity

| ID | Requirement | Status |
|----|-------------|--------|
| FR-CP-01 | Compare 2–3 MPs on shared stance dimensions without fake rankings | Implemented (UI) |
| FR-CP-02 | Attendance rates MUST show numerator, denominator, and coverage window | Implemented (activity profile) |
| FR-CP-03 | Composite honesty/loyalty scores MUST NOT be shown without published methodology | Enforced in current UI |

### 3.7 Search & assistant

| ID | Requirement | Status |
|----|-------------|--------|
| FR-SE-01 | Client search over loaded workspace records | Implemented |
| FR-SE-02 | Server-side paginated search | Planned |
| FR-CH-01 | `/api/chat` is keyword retrieval only and MUST say so | Implemented |
| FR-CH-02 | Cited generative answers only after retrieval eval set exists | Planned |

### 3.8 Export, save, navigation

| ID | Requirement | Status |
|----|-------------|--------|
| FR-UX-01 | Hash routes for page/record deep links | Implemented |
| FR-UX-02 | Local bookmarks (browser storage) | Implemented |
| FR-UX-03 | JSON export with unreviewed-data notice | Implemented |

## 4. External interfaces

### 4.1 HTTP API (current)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Health |
| GET | `/api/workspace` | Full snapshot |
| GET | `/api/stats` | Counts; unsupported metrics null |
| GET | `/api/mps`, `/parties`, `/speeches`, `/commitments`, `/timelines` | List/detail |
| GET | `/api/mps/{id}/activity`, `/attendance`, `/speeches` | Activity |
| POST | `/api/compare` | Stance matrix |
| POST | `/api/chat` | Keyword search |

Full OpenAPI: `http://localhost:8000/docs` when running.

### 4.2 Environment

See `backend/.env.example`, `frontend/.env.example`, and [MONGODB_HANDOFF.md](./MONGODB_HANDOFF.md).

## 5. Non-functional requirements

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-01 | CORS restricted to configured origins | Implemented |
| NFR-02 | Secrets never in `VITE_*`, fixtures, git, or client bundles | Required |
| NFR-03 | Demo political content is unreviewed; must be labelled | Implemented |
| NFR-04 | Accessibility: focus trap, Escape, reduced motion on dialogs | Partial |
| NFR-05 | Sinhala/Tamil fonts for transcripts; full UI i18n later | Partial |
| NFR-06 | Pilot MongoDB ≤5k docs/collection snapshot | Implemented limit |
| NFR-07 | Automated tests for API modes and browser smoke | Implemented (basic) |

## 6. Constraints

- Read-only public API in pilot phase  
- No Docker/compose required for local pilot  
- Competition / research use; public “honesty scores” need legal/editorial review  

## 7. Traceability

| PRD goal | Primary SRS IDs |
|----------|-----------------|
| G1 Hansard | FR-SP-* |
| G2 Promises | FR-CM-* |
| G3 News | FR-NW-* |
| G4 Assessments | FR-CM-02..04 |
| G5 Activity | FR-CP-02 |
| G6 Honest UI | FR-DM-*, FR-CP-03, NFR-03 |
