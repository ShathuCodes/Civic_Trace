# AGENTS.md — CivicTrace

Instructions for AI coding agents working in this repository.

## Mission

CivicTrace is an **evidence workspace** for Sri Lankan parliamentary accountability: compare MP promises to **Hansard** and **reliable public sources**. It is not a generator of unverifiable “honesty scores.”

Read before large changes:

1. `docs/PRD.md` — product intent  
2. `docs/SRS.md` — requirements and what is already implemented  
3. `docs/ARCHITECTURE.md` — current vs target design  
4. `docs/ROADMAP.md` — priority order  
5. `docs/STATUS.md` — honesty about completion  
6. `README.md` — how to run  

## Non-negotiable product rules

- Never reintroduce “live verified”, fake accuracy %, loyalty indices, or simulated video players without real measured pipelines and tests.  
- API/data init failure → error (503). **Never** silently substitute demo data.  
- Missing evidence ≠ Broken promise.  
- A Hansard speech proves what was said, not that the claim is true.  
- Outcome news does not prove a single MP caused the outcome.  
- No MongoDB URIs, model keys, or secrets in `VITE_*`, fixtures, screenshots, or git.  
- Do not use stock photos as politician portraits; prefer initials until licensed (and correctly identified) images exist.  
- Keep `/api/chat` labelled as keyword retrieval until cited RAG exists.

## How to work

1. Prefer the smallest change that advances `docs/ROADMAP.md` P0/P1.  
2. Distinguish in PRs/commits: **implemented** vs **demo/seed** vs **planned**.  
3. Update `docs/SRS.md` status columns when you complete or remove a requirement.  
4. Run before claiming done:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
python -m unittest discover -s tests -v
```

5. Preserve the editorial UI language (warm neutrals, restrained green, compact lists). Do not restyle into neon/glass AI dashboards.  
6. Extend Pydantic models carefully; keep `docs/application-schema.json` in sync when the contract changes (regenerate or edit deliberately).  
7. For Mongo work, follow `docs/MONGODB_HANDOFF.md`; normalize separately from raw scrapes.

## Code map

| Path | Role |
|------|------|
| `backend/app/main.py` | FastAPI routes, demo/mongodb lifespan |
| `backend/app/data.py` | Core models + sample seed |
| `backend/app/activity.py` | Attendance / memberships / sittings |
| `backend/export_demo.py` | Export seed → `frontend/src/fixtures/demo.json` |
| `frontend/src/App.tsx` | Main workspace UI |
| `frontend/src/MPActivityProfile.tsx` | Activity profile |
| `frontend/src/api.ts` | Client API helpers |
| `tests/` | API unit tests + browser smoke |

## Out of scope unless explicitly requested

- Force-push, git config changes, committing secrets  
- Broad unused refactors, new decorative chart dashboards  
- Claiming full-chamber coverage or production readiness  
- Implementing exploit/scraper bypasses against sites that forbid access — prefer official/public feeds and partner exports  

## Documentation ownership

| Doc | Agents may update when |
|-----|------------------------|
| `docs/SRS.md` | Requirement status changes |
| `docs/STATUS.md` | Meaningful completion shifts |
| `docs/ROADMAP.md` | Priorities reprioritized with rationale |
| `docs/PRD.md` | Product scope changes (ask human first if contested) |
| `AGENTS.md` | Process rules change |
