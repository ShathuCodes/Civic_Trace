# Review, implemented patch, and next priorities

Scope: the uploaded Civic_Trace-main.zip and the two supplied proposal/report PDFs. Findings below come from those local materials. No live political fact-check, external source-link audit, user study, or real MongoDB test was performed.

## Main finding

The idea is strongest when it makes evidence easy to inspect. The original code was a polished demonstration of an intended system, not the implemented and validated evidence pipeline implied by several UI/report labels. Improving the visual design alone would have amplified unsupported claims.

The next highest-value investment is source provenance and one genuinely reviewed end-to-end issue, followed by database integration, then measured retrieval/AI and video alignment. More graphs or decorative features should come later.

## Original issues and patch response

| Area | Finding in supplied code | Patch response | Remaining work |
|---|---|---|---|
| Visual design | Neon/gradient actions, glass panels, dense technical labels, large navigation | Editorial neutral/green system, quiet typography, sidebar, compact record rows, shared detail treatment | User testing and full accessibility audit |
| Search | Header query did not reach active content | Search filters records; topic/status/sort controls; URL search on submit | Server pagination, date/party filters, hybrid retrieval |
| Data state | Fetch failures silently substituted local records | Visible connection failures; explicit user-selected sample mode; metadata reports mode | Freshness policies and production observability |
| Trust | 'Live verified' badge and fixed accuracy/pages/hours | Honest sample/imported labels; actual dataset counts; unsupported stats null | Human-reviewed provenance per claim |
| Identity | Unrelated stock-image portraits represented politicians | Initials-based avatars; explicit historical-role caveat | Verified photos and time-bounded role/party histories |
| Source navigation | Commitment source picked a sponsor's arbitrary speech; timeline source picked speeches[0] | Commitment events link their own supplied URLs; timeline references explicitly lack links | Exact passage IDs and event-level provenance |
| Video | Timer-based playback simulator | Real external source links with supplied offsets; no simulated playback | Validated source offsets and real embedded playback |
| AI | Scripted keyword/template responses presented as grounded RAG | Remove misleading assistant UI; API labels keyword retrieval honestly | Actual cited retrieval/generation and evaluation |
| Comparison | Unsupported attendance/loyalty numbers and policy summaries | Position matrix without rankings; missing positions explicit; summaries marked unreviewed | Comparable date scope and claim-level citations; party manifesto comparisons |
| Localization | Language selector implied more than the implemented transcript toggle | Transcript-only language control and visible English fallback | Full Sinhala/Tamil interface and translation QA |
| MongoDB | No integration in supplied code | Read-only validated snapshot adapter, environment template, schema export | Actual schema mapping, connection testing, pagination and refresh |
| API robustness | Hardcoded localhost frontend API, permissive wildcard CORS, invalid comparison defaulted to unrelated people | Configurable same-origin API, explicit CORS, 422 on invalid comparison, 503 on unavailable data | Production auth for writes, rate limits, logs, contract generation |
| Navigation | Local tab state and limited shareability | Hash routes, deep-linked records, saved items, JSON export, browser history | URL persistence for all filters; broader usability testing |

## What to improve a lot, in order

### P0 — Evidence credibility

Store immutable source documents, exact passages/pages, publication/fetch dates, extraction versions, and reviewer decisions. Remove guesses from public-facing content. Validate the prototype's existing sample quotes, URLs, role labels, votes, and outcome figures before treating any of them as real evidence. Status labels are interpretations that need transparent criteria. A speech proves what was said, not the truth of every statement.

Acceptance: a reviewer can trace each published claim to its original context; unsupported content is visibly unreviewed or excluded.

### P0 — Real data integration

Obtain redacted documents and a schema from your friend, not only a connection URI. Resolve stable people/sitting IDs, duplicates, source URLs, language, and time coverage. Normalize separately from raw scraped data. Keep reads least-privileged. The included snapshot adapter is a pilot bridge, not a scalable ingestion architecture.

Acceptance: real normalized records render consistently, invalid records are quarantined, and outages never look like a successful live connection.

### P1 — A narrow, complete demonstration

Use the proposal's pilot scope: one issue, 3–5 sittings, 30–50 reviewed segments and 5–10 public figures. Demonstrate search → exact passage → profile/context → linked commitment/event. Complete this with genuine evidence before expanding the number of tabs or claiming coverage of the full chamber.

Acceptance: a user completes a real evidence-finding task with links that a reviewer has checked.

### P1 — Retrieval, AI and media that are measurable

Add a retrieval evaluation set, then actual cited answers with abstention and conflict handling. Add real video controls only after timestamps are aligned and spot-checked. Do not treat LLM confidence as verification. The proposal's search-time, factual-support and alignment percentages remain evaluation targets.

Acceptance: report measured results, sample size, failed cases and denominators; each answer claim maps to a source passage.

### P1 — Editorial review and temporal correctness

Add review decisions, corrections and revision history. Make office/party membership valid for a date range. Track commitments against defined deadlines/targets; missing evidence is not failure. Make source coverage comparable before comparing leaders. Outcomes do not establish political causality.

Acceptance: reviewers can explain and reproduce every published assessment.

### P2 — Product maturity

Complete multilingual interface translation, server-side pagination, all-filter deep linking, keyboard/mobile QA, accessible touch targets, caching, deployment routing, health monitoring and recovery. Add accounts/alerts only when demanded by the use case. Gather citizen/journalist task observations rather than relying on estimated market size.

## Reality check against the report

The supplied architecture report labels several demonstration behaviors as completed features. Revise the report to say 'sample UI', 'prototype matching', or 'planned pipeline' where appropriate. There is no demonstrated Whisper processing pipeline or live Gemini RAG integration in the uploaded repository. This patch does not implement either, and does not claim the seed dataset is verified ground truth.

## Known limits of this patch

- Real MongoDB schema, credentials and network behavior are untested; fake-client tests only verify adapter control flow.
- Existing sample political content is preserved for demonstration, not fact-checked. Source links and timestamp accuracy are unverified.
- No actual LLM, ingestion scheduler, OCR/ASR process, reviewer authentication, full localization, or live refresh.
- Search and comparison operate over a small loaded snapshot. A production repository must paginate and index queries.
- Saved records are browser-local. Records unavailable in the current dataset are not shown.
- Hash navigation preserves page/search/detail links, but topic/status/sort are not fully URL-encoded.
- Dataset labels are coarse; per-record verification/review fields are future schema work.
