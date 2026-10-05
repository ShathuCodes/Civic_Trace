# Civic Trace — evidence workspace patch

A redesign of the supplied Civic_Trace-main prototype, with a restrained editorial UI and honest data boundaries. This is a working pilot, not a verified political-information service or a production-ready system.

## Start here

- `docs/REVIEW_AND_ROADMAP.md`: what was wrong, what changed, and priority improvements.
- `docs/FULL_IMPROVEMENT_PROMPT.md`: complete coding-agent prompt covering data, AI, UI, security, deployment, and evaluation.
- `docs/MONGODB_HANDOFF.md`: what to request from your friend and how to connect normalized data.
- `docs/application-schema.json`: current collection schemas.
- `qa/`: desktop/mobile screenshots and validation notes.

## Run locally

Use Node 22.12+ (tested with Node 24) and Python 3.11+ (tested with 3.12).

From the project root:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. API documentation is at http://localhost:8000/docs. The Vite development proxy forwards /api to the backend. The default backend mode is explicitly labelled demo data.

After installing dependencies, Windows users can run `start_all.bat` from the project folder with the intended Python environment activated.

### Frontend-only demonstration

Copy frontend/.env.example to frontend/.env.local and set `VITE_DEMO_MODE=true`, then restart Vite. This explicitly selects the bundled unreviewed sample data. API failures never silently activate demo mode; the user can choose it from the error screen.

### MongoDB

Set DATA_MODE=mongodb, MONGODB_URI and MONGODB_DATABASE in the **backend** process environment. Read docs/MONGODB_HANDOFF.md first. Raw scraped documents generally require normalization. The adapter is read-only and takes a validated startup snapshot. Restart to refresh. Invalid configuration returns 503. The actual friend's database is not connected or tested.

### Build / deployment

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
python -m unittest discover -s tests -v
```

Serve frontend/dist through your hosting setup. Configure a same-origin reverse proxy for /api, or set VITE_API_BASE_URL to the deployed backend URL **before building** and allow the exact frontend origin in backend CORS_ORIGINS. Vite's development proxy is not included in a production build. Do not use VITE_DEMO_MODE=true for a deployment intended to show imported data. Database and model credentials belong only on the backend.

## Included behavior

- Responsive sidebar, compact navigation, warm neutral/green design, and light/dark themes.
- Search across loaded records, speech topic/sort controls, commitment status filter, and profile search.
- Shareable hash routes and record links; browser back/forward; JSON export with unreviewed-data notice.
- Accessible detail dialogs with focus return, focus trapping, Escape, and reduced-motion support.
- Browser-local bookmarks, profile-to-speech navigation, two/three-person policy comparison, and issue event trails.
- English/Sinhala/Tamil transcript selection with explicit missing-translation fallback. Interface labels remain English.
- Direct Hansard/recording links; supplied timestamp links, not a simulated player.
- Real loading/error/empty states and deliberate demo selection.
- /api/workspace, collection list/detail endpoints, health, computed counts, validated compare input, and honest keyword-only /api/chat.

## Deliberate changes to prototype behavior

The old AI drawer, simulated video player, unsupported confidence/accuracy figures, hardcoded dataset-wide totals, stock politician portraits, and misleading 'live verified' badges are not carried into the new UI. The rewritten /api/chat returns extractive matches and explicitly says it is not generative RAG. The legacy /api/stats fields for unsupported measurements return null. Backend models make unsupported legacy metrics optional.

The design retains the idea's core browsing areas, but does not pretend that unimplemented production capabilities are complete. Full multilingual UI, reviewed claim citations, authenticated editorial review, real grounded AI, measured alignment, live database refresh, source-link verification and production-scale pagination remain follow-up work.

## Apply the patch safely

This ZIP contains a full replacement project and a `changes.patch` against the uploaded archive. Work in a separate branch/copy. Either use this complete folder, or run `git apply --check changes.patch` then `git apply changes.patch` from your original project root. The diff includes deletion of the obsolete UI components. Do not apply it blindly over newer local changes. It does not include node_modules, secrets, .git, or build output.
