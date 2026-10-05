# Product Requirements Document — CivicTrace

**Product:** CivicTrace  
**Domain:** Sri Lankan parliamentary accountability & promise tracking  
**Status:** Pilot (evidence workspace + demo data)  
**Last updated:** 2026-10-06

## 1. Vision

CivicTrace helps citizens, journalists, and researchers judge whether Members of Parliament (MPs) in Sri Lanka keep public promises and use parliamentary time productively—by comparing what they promised and said against **Hansard** (official parliamentary records) and **reliable public news / official sources**, with every assessment tied to inspectable evidence.

The product must never invent political certainty. A speech proves what was said. Missing evidence is not a broken promise. Outcome news does not prove a single MP caused an outcome.

## 2. Problem

Public claims about MPs are often:

- Hard to verify against original parliamentary text
- Scattered across manifesto PDFs, news, and sittings
- Presented with unsupported “accuracy” or loyalty scores

Citizens need a transparent path: **question → original record → linked promise → outcome evidence → explicit gaps**.

## 3. Goals

| Priority | Goal |
|----------|------|
| G1 | Ingest and store Hansard sittings with stable citations (volume, page, URL, date, speaker) |
| G2 | Capture manifesto / campaign promises as first-class commitments with sponsors and deadlines |
| G3 | Link news and official publications as outcome evidence without implying false causality |
| G4 | Support reviewable assessments: Kept / In Progress / Compromised / Broken / Under Review / Insufficient Evidence |
| G5 | Expose MP activity signals that are methodologically sound (e.g. attendance with explicit denominator) |
| G6 | Present an editorial UI that never overclaims verification |

## 4. Non-goals (current phase)

- Live “AI verified” political truth scores
- Composite loyalty / honesty indices without published methodology and human review
- Full-chamber coverage before a narrow reviewed pilot succeeds
- Replacing official Hansard or court processes
- Stock portraits or simulated video playback as evidence

## 5. Users

| Persona | Needs |
|---------|--------|
| Citizen | Find what an MP promised and whether there is evidence of follow-through |
| Journalist | Trace a claim to Hansard page / manifesto quote / news URL quickly |
| Researcher / reviewer | Audit status decisions, corrections, and provenance |
| Data partner | Hand off scraped Hansard/news into a normalized schema |

## 6. Core use cases

1. **Promise check** — Select an MP → list commitments → open supporting manifesto + Hansard + outcome sources → see status and gaps.
2. **Speech inspection** — Search sittings → open segment in EN/SI/TA → jump to Hansard PDF / recording offset when available.
3. **Activity profile** — View attendance, memberships, and speech topics with explicit coverage and denominators.
4. **Compare stances** — Compare 2–3 MPs on the same issue and date range only when source coverage is comparable.
5. **Issue timeline** — Follow events on one policy theme with per-event sources (not a causal graph).

## 7. Success metrics (pilot)

| Metric | Target |
|--------|--------|
| Traceability | 100% of published assessments link to at least one primary source passage or document |
| Narrow pilot | 1 issue, 3–5 sittings, 30–50 reviewed segments, 5–10 public figures |
| Source spot-check | ≥10 randomly sampled citations open and match extracted text |
| Honesty of UI | Zero public “verified / live accuracy” labels without a measured evaluation |
| Reviewability | Every status change has reviewer, time, criteria, and prior revision |

Accuracy of automated honesty scoring is **not** a launch metric until extraction + linking + review exist. Expect early automation to be noisy; human review is the gate.

## 8. Product principles

1. **Evidence over scores** — Prefer citations and status narratives over opaque rankings.
2. **Honest labels** — Demo, imported, unreviewed, and reviewed are distinct states.
3. **Hansard ≠ truth** — Parliamentary speech is evidence of speech, not of fact.
4. **Missing ≠ broken** — Insufficient evidence is a first-class status.
5. **Comparable before compare** — Same issue, comparable date range and corpus coverage.
6. **Immutable raw sources** — Never overwrite scrape archives; normalize into a separate layer.

## 9. Release phases

| Phase | Name | Outcome |
|-------|------|---------|
| 0 | Evidence workspace (current) | Browse demo / imported snapshot; no honesty engine |
| 1 | Real data bridge | Normalized MongoDB (or equivalent) with provenance fields |
| 2 | Narrow reviewed pilot | One issue end-to-end with human-reviewed commitments |
| 3 | Ingestion pipeline | Scheduled Hansard + news ingest, claim extraction queue |
| 4 | Measured retrieval / AI | Cited answers with evaluation set; abstain when unsure |
| 5 | Public maturity | Pagination, localization, auth for reviewers, monitoring |

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Overclaiming accuracy | UI/API forbid unsupported metrics; docs require review gate |
| Biased news sources | Multi-source policy; label outlet; prefer primary official docs |
| Name / identity ambiguity | Stable person IDs; transliteration aliases; quarantine unresolved speakers |
| Legal / defamation | Publish evidence and methodology; avoid unverified labels as fact |
| Scraping ToS / site changes | Prefer official APIs/exports; store fetch metadata; idempotent ingest |

## 11. Open questions

- Which news outlets and official gazettes are in-scope for v1?
- Who owns editorial review for the competition / public pilot?
- Will Hansard arrive as PDF, HTML, or partner Mongo collections?
- Is Sinhala/Tamil UI required for the first public demo or only transcripts?
