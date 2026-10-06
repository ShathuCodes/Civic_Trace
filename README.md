# Civic Trace

### A multilingual workspace for exploring Sri Lankan parliamentary records

Civic Trace helps citizens, researchers, and journalists explore parliamentary speeches, understand MP activity, and trace information back to its source.

The application combines structured parliamentary records with multilingual Hansard search and evidence-based question answering. It supports **English, Sinhala, and Tamil**, with voice input and read-aloud features.

> Civic Trace is a working pilot. Data coverage, extraction quality, translations, and generated answers require validation against official records. Missing data is displayed explicitly.

## Features

### Parliamentary records and MP profiles

- Browse MPs, parties, speeches, commitments, and issue timelines.
- View MP attendance, speech counts, topic distributions, and membership periods.
- Filter activity by date, session, topic, and attendance status.
- Compare MPs using available parliamentary records.
- Follow evidence trails and open linked source documents.

### Multilingual search and question answering

- Search Hansard passages using multilingual embeddings.
- Ask questions through the integrated Qdrant and Gemini pipeline.
- View answers alongside retrieved evidence and source citations.
- Receive an insufficient-evidence response when no relevant evidence is retrieved.
- Use an extractive fallback when answer generation is unavailable.

### Language and voice

- Switch the interface between English, Sinhala, and Tamil.
- Use voice input and read-aloud functionality through browser speech APIs.
- View available multilingual transcripts with explicit missing-translation handling.

Voice availability and language support depend on the browser, operating system, installed voices, and microphone permissions.

### User experience

- Responsive layouts with light and dark themes.
- Search, filtering, sorting, and shareable record links.
- Browser-local bookmarks and preferences.
- Accessible dialogs, keyboard navigation, and reduced-motion support.
- Explicit loading, error, empty, and demo-data states.

## Architecture

Civic Trace has three main application components:

| Component | Responsibility |
|---|---|
| React frontend | Browsing, profiles, language selection, voice interaction, and evidence display |
| Main FastAPI backend | Application APIs, structured records, activity calculations, and integration with the RAG service |
| Hansard RAG service | Document processing, multilingual retrieval, and answer generation |

Two storage components serve different purposes:

| Storage | Purpose |
|---|---|
| MongoDB | Structured records such as MPs, speeches, sittings, attendance, and evidence relationships |
| Qdrant | Hansard text embeddings and metadata used for semantic retrieval |

Attendance and speech totals are calculated from structured records. They are not calculated from a limited set of semantic-search results.

### Question-answering flow

1. A user enters or speaks a question.
2. The frontend sends the request to the application backend.
3. The integrated RAG service embeds the query and retrieves relevant Hansard passages from Qdrant.
4. Gemini generates an answer using the retrieved evidence.
5. The frontend displays the answer, citations, and source excerpts.

### Document ingestion flow

1. Discover and download official Hansard documents.
2. Extract PDF text, using OCR where necessary.
3. Separate and normalize multilingual text.
4. Create chunks with available speaker, date, page, and source metadata.
5. Generate embeddings and index the chunks in Qdrant.

The Hansard ingestion pipeline does not automatically establish complete attendance records. Attendance requires explicit supporting records.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Python, FastAPI, Pydantic
- **Structured storage:** MongoDB
- **Vector search:** Qdrant
- **Answer generation:** Gemini
- **Default embeddings:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Document processing:** PDF extraction and Tesseract OCR
- **Voice:** Browser speech recognition and speech synthesis

## Repository Structure

```text
backend/
  app/
    main.py                 Application API and data loading
    activity.py             MP activity models and calculations
    evidence.py             Evidence trail models and logic
    data.py                 Demo records
  export_demo.py
  requirements.txt

frontend/
  src/
    App.tsx
    MPActivityProfile.tsx
    EvidenceTrailView.tsx
    api.ts
    hooks/                  Voice input and read-aloud hooks
    i18n/                   Language context and translations
    fixtures/               Frontend demonstration data

sri-lanka-hansard-rag/
  src/hansard_rag/
    api/
    crawler/
    extraction/
    language/
    chunking/
    embeddings/
    vectorstore/
    rag/
  tests/
  docker-compose.yml
  .env.example

tests/                      Main application tests
docs/                       Design, schema, and handoff documentation
```

## Local Development

### Prerequisites

- Node.js 22.12+ and npm
- Python 3.11+
- MongoDB access when using imported structured records
- Qdrant for semantic retrieval
- A Gemini API key for generated answers
- Tesseract with the required language data when OCR is enabled

Docker is required if using the supplied RAG Docker Compose setup.

### 1. Start the main backend

From the project root:

```bash
python -m venv .venv
```

Activate the environment.

**Windows PowerShell:**

```powershell
.venv\Scripts\Activate.ps1
```

**macOS / Linux:**

```bash
source .venv/bin/activate
```

Install dependencies and start FastAPI:

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

API documentation: http://localhost:8000/docs

### 2. Configure structured data

Set these variables in the backend process environment to use MongoDB:

```dotenv
DATA_MODE=mongodb
MONGODB_URI=
MONGODB_DATABASE=
```

See `docs/MONGODB_HANDOFF.md` for the expected data format. Raw scraped documents may require normalization before loading.

The existing MongoDB adapter loads a validated startup snapshot. Restart the backend to load updated records.

For demonstration data:

```dotenv
DATA_MODE=demo
```

### 3. Configure the Hansard RAG service

Copy `sri-lanka-hansard-rag/.env.example` to `.env` in that directory and configure the relevant settings:

```dotenv
GEMINI_API_KEY=

EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

QDRANT_URL=
QDRANT_API_KEY=
QDRANT_COLLECTION=sri_lanka_hansards

OCR_ENABLED=true
DATA_DIR=data
```

Use the Qdrant URL appropriate to your deployment. An API key is needed when required by the configured Qdrant instance.

When running both FastAPI services locally, give them different host ports. For example:

- Main application API: `8000`
- Hansard RAG API: `8001`

For the supplied RAG Docker Compose configuration, use this port mapping for its `app` service:

```yaml
ports:
  - "8001:8000"
```

From `sri-lanka-hansard-rag/`, start the services:

```bash
docker compose up --build
```

Configure the main backend’s RAG connection to use the address reachable from its runtime. For a main backend running directly on the host, this example uses `http://localhost:8001`.

Starting the services does not populate the search index. Run the ingestion workflow to index Hansard documents before testing retrieval.

### 4. Start the frontend

In a separate terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173.

The Vite development proxy forwards `/api` requests to the main backend.

### Frontend-only demonstration

Copy `frontend/.env.example` to `frontend/.env.local` and set:

```dotenv
VITE_DEMO_MODE=true
```

Restart Vite after changing frontend environment variables.

This mode uses bundled sample records. It does not demonstrate the live database or integrated RAG service. API failures do not silently activate demo mode.

## Data and Evidence Rules

- Missing attendance data is never treated as absence.
- Attendance percentages use recorded present and absent days, with the denominator shown explicitly.
- Eligible sitting days respect parliamentary membership dates.
- Speech counts are deduplicated; chunks and translations do not count as additional speeches.
- Absence is never inferred from an MP having no recorded speech.
- Missing translations and incomplete coverage remain visible.
- Generated answers should be checked against their cited passages.
- Parliamentary statements and commitments are not, by themselves, proof of implementation or outcomes.

## Validation

Run the main backend tests:

```bash
python -m unittest discover -s tests -v
```

Check the frontend:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

The RAG package has its own tests under `sri-lanka-hansard-rag/tests`.

Before demonstrating imported data, verify:

- Data loading and document coverage.
- Attendance calculations and speech deduplication.
- Retrieval across English, Sinhala, and Tamil.
- Citation links and supporting excerpts.
- Insufficient-evidence and service-failure behavior.
- Voice functionality on the demonstration browser.

## Deployment

Build the frontend:

```bash
npm --prefix frontend run build
```

Serve `frontend/dist` through your hosting setup.

Configure a same-origin reverse proxy for `/api`, or set `VITE_API_BASE_URL` before building and configure the backend’s `CORS_ORIGINS` for the deployed frontend.

The Vite development proxy is not included in production builds.

Keep database credentials and model API keys on the backend. Configure persistent storage for Qdrant and ingested documents, and restrict access to administrative ingestion and reindexing endpoints.

Do not enable frontend demo mode for a deployment intended to display imported records.

## Current Status

The multilingual interface, voice features, MP activity profiles, evidence trails, and main application–RAG integration have been implemented.

Current priorities are validating imported records, evaluating multilingual retrieval and citation quality, and testing the complete application under realistic usage.

## Supporting Documentation

- `docs/REVIEW_AND_ROADMAP.md` — initial review and improvement priorities
- `docs/FULL_IMPROVEMENT_PROMPT.md` — broader implementation guidance
- `docs/MONGODB_HANDOFF.md` — structured-data handoff and normalization
- `docs/application-schema.json` — collection schema reference

Some documents describe the earlier prototype. Check them against the current code before applying older setup instructions or patches.