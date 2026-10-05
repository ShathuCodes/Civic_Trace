# Roadmap — CivicTrace

**Last updated:** 2026-10-06  
**Companion:** [PRD](./PRD.md) · [STATUS](./STATUS.md)

## Principle

Ship **inspectable evidence** before **automated honesty scores**. A narrow reviewed pilot beats a full-chamber demo with fake confidence.

## P0 — Evidence credibility & real data

1. **Provenance fields** on every public claim: source URL, page/passage ID, publication date, fetch date, extractor version, review status.  
2. **Partner MongoDB handoff** — redacted samples, field dictionary, read-only URI (see [MONGODB_HANDOFF.md](./MONGODB_HANDOFF.md)).  
3. **Normalize** raw scrapes into application collections; quarantine invalid rows.  
4. **Spot-check** sample quotes/URLs before treating seed as real.

**Done when:** a reviewer can open each published commitment and land on the original context; DB outages never look like successful live data.

## P1 — Narrow honesty pilot

1. Pick **one issue** (e.g. education funding or transport).  
2. Cover **3–5 sittings**, **30–50 segments**, **5–10 figures**.  
3. Manually (then assisted) extract **commitments** and link Hansard + news.  
4. Publish statuses only after human review; include **Insufficient Evidence**.  
5. Demonstrate UI path: search → passage → profile → commitment → outcome.

**Done when:** an external person completes an evidence-finding task using only checked links.

## P1 — Ingestion foundations

1. Idempotent Hansard fetch (PDF/HTML) into immutable raw store.  
2. Allowlisted news/gazette fetchers with host restrictions.  
3. Sitting calendar sync; stable person ID resolution.  
4. IngestionRun logging and reprocess hooks.

**Done when:** refreshing data does not require editing Python seed files.

## P1 — Activity & parliament time (methodological)

1. Keep attendance with explicit denominators (already started in activity API/UI).  
2. Distinguish speaking time, questions, votes (when vote data exists).  
3. Never infer absence from lack of speech segments alone.

## P2 — Measured retrieval / AI

1. Build a labelled retrieval evaluation set.  
2. Keyword → hybrid retrieval with citation IDs.  
3. Optional LLM answers **only** from retrieved passages; abstain on gaps.  
4. Replace `/api/chat` contract deliberately; keep “not RAG” until then.

## P2 — Editorial workflow

1. Reviewer authentication (writes only).  
2. Correction history and publish/unpublish.  
3. Date-bounded roles and party memberships everywhere.

## P3 — Product maturity

- Server pagination and indexed search  
- Full EN/SI/TA UI strings  
- Deployment reverse proxy, health/readiness, monitoring  
- Accessibility audit beyond current dialog basics  
- Remove unused dependencies (`httpx`/`requests` if still unused; `recharts` until needed)

## Explicitly deferred

- Composite “honesty index” leaderboards  
- Whisper/Gemini pipelines without eval numbers  
- Simulated video players  
- Stock politician photography  

## Suggested near-term build order (engineering)

1. Confirm partner schema → mapping script → MongoDB connect test  
2. One reviewed issue dataset (even if curated in JSON)  
3. Raw document archive + ingest stub  
4. Claim/commitment linking UI for reviewers  
5. Public read path unchanged until review gate exists  
