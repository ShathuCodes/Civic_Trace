# Project status — CivicTrace

**Audit date:** 2026-10-06  
**Branch of audit work:** `sujeevan/project-audit-docs`  
**Verdict:** Direction is **correct** for an evidence-first MP accountability product. Implementation is a **strong pilot UI + read-only API** on **synthetic demo data**. The honesty-analysis pipeline (Hansard ingest, news ingest, promise extraction, linking, review) is **mostly not built yet**.

## 1. What the product is trying to do

Analyse whether Sri Lankan MPs:

- Keep manifesto / public promises  
- Use parliamentary time productively (attendance, speaking, committee work when data exists)  
- Align speeches and votes with commitments  
- Appear in reliable news/official sources when outcomes occur  

…by comparing promises against **Hansard** and **reliable public sources**, not by inventing AI “truth scores”.

## 2. Completion estimate

| Area | Rough completion | Notes |
|------|------------------|-------|
| Product framing & honest UI boundaries | ~80% | Good trust posture in README/UI |
| Frontend evidence workspace | ~70% | Browse/compare/activity work on demo |
| Backend read API + models | ~60% | Demo + Mongo snapshot adapter |
| MP activity (attendance methodology) | ~40% | Demo collections + profile UI |
| MongoDB real integration | ~15% | Code exists; real DB untested |
| Hansard ingestion | ~30% | `HansardParser` + `MPResolver` built; schedule fetcher planned |
| News ingestion | ~10% | Schema & normalizer ready; scraper connectors next |
| Promise extraction / linking | ~35% | `PromiseMatcher` evidence linker + timeline generator built |
| Human review workflow | ~0% | — |
| Cited RAG / measured AI | ~0% | Keyword `/api/chat` only |
| Production ops (Docker, CI, auth) | ~5% | Local scripts + unittest/smoke |

**Overall toward the stated honesty-analysis goal: ~25–30%** (foundation + demo), not a finished analyser.

## 3. Path correctness

### Correct choices already made

- Separating speeches, commitments, timelines, and activity entities  
- Refusing silent demo fallback and fake “live verified” metrics  
- Treating Hansard as proof of speech, not of factual truth  
- Planning Mongo normalization instead of binding UI to raw scrape shapes  
- Starting attendance with explicit denominators  

### Gaps to close next (in order)

1. Real normalized data (or a curated mini-corpus) for one issue  
2. Immutable source archive + ingest  
3. Commitment↔passage↔news links with human review  
4. Only then: scoring, retrieval AI, full chamber scale  

### Accuracy expectations

Automated promise-vs-news matching will be imperfect (name variants, sarcasm, coalition ambiguity, delayed outcomes). Treat v1 as **assisted evidence assembly + human verdicts**. Publish methodology; expect contested edge cases.

## 4. What was removed in the audit cleanup

| Removed | Why |
|---------|-----|
| `changes.patch` (~426KB) | Historical diff vs original zip; not needed to run or develop |
| `docs/FULL_IMPROVEMENT_PROMPT.md` | Agent dump; replaced by `AGENTS.md` + structured docs |
| `docs/REVIEW_AND_ROADMAP.md` | Merged into ROADMAP, ARCHITECTURE, STATUS, PRD |

## 5. Documentation map (current)

| Doc | Purpose |
|-----|---------|
| [PRD.md](./PRD.md) | Product vision, users, goals, phases |
| [SRS.md](./SRS.md) | Requirements + implementation status tags |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Current vs target system design |
| [ROADMAP.md](./ROADMAP.md) | Prioritized delivery order |
| [MONGODB_HANDOFF.md](./MONGODB_HANDOFF.md) | Partner data integration |
| [application-schema.json](./application-schema.json) | Pilot collection shapes |
| [../AGENTS.md](../AGENTS.md) | Rules for coding agents |
| [../qa/VALIDATION.md](../qa/VALIDATION.md) | Last known QA results |

## 6. Recommended next engineering sprint

1. Obtain redacted Hansard/news samples from the data partner (or scrape a tiny official set legally).  
2. Write a normalizer into `mps` / `speeches` / `commitments` shapes.  
3. Curate **one issue** with reviewed links; load via Mongo or fixture.  
4. Add `review_status` / provenance fields to the public API contract.  
5. Keep UI labels honest until review exists.  
