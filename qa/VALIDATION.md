# Validation notes

See also [docs/STATUS.md](../docs/STATUS.md) for product completion context.

- TypeScript and Vite production build: PASS.
- oxlint: PASS, no warnings after cleanup.
- Python API tests: 7 PASS.
- Browser smoke flows: PASS, zero captured page errors.
- Visual inspection: desktop overview, mobile overview, dark profiles, and transcript detail.

Browser checks used Chromium headless against running Vite/FastAPI processes. Desktop 1440px and mobile 390px were checked; this is not a full device lab or formal accessibility audit.

Covered: initial data loading; empty search and reset; speech detail; Tamil transcript switching; Escape and focus restoration; bookmarking and persistence after reload; two-person comparison; commitment-specific sources; issue timelines; profiles; dark/light theme; mobile navigation; no horizontal overflow on the 390px overview; visible 503 error and explicit sample-data recovery.

Backend tests cover mode labels and computed counts, source search/detail/404, invalid comparison rejection, keyword-only chat and no-match behavior, CORS origin rejection, MongoDB configuration failure without demo fallback, and a schema-mapped MongoDB snapshot using a fake client. The actual friend's database was not tested.

## Re-run

```bash
npm --prefix frontend ci
npm --prefix frontend run build
npm --prefix frontend run lint
python -m pip install -r backend/requirements.txt
python -m unittest discover -s tests -v
```

Optional browser smoke test (installs local test tooling without changing the lockfile):

```bash
npm --prefix frontend install --no-save --package-lock=false playwright
npx --prefix frontend playwright install chromium
node tests/browser_smoke.cjs
```

Use free local ports 8000 and 5173. The script starts/stops its own servers. It expects `python` to resolve to an environment with backend dependencies. On Windows, run in a suitable shell with that environment activated; the automated script itself was tested on Linux.

Not validated: real MongoDB authentication/TLS/schema, external source availability and factual correctness, source-video alignment, full Sinhala/Tamil localization, real LLM quality, production load, or deployment recovery. Sample data and supplied links must be reviewed before public launch.

Noto Sans Sinhala and Tamil are bundled locally through fontsource dependencies; transcript rendering does not depend on Google Fonts availability. Interface translation is still pending.
