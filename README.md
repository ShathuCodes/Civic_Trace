# 🏛️ Civic Trace
### Unified Legislative Intelligence & Democratic Accountability Platform

**Civic Trace** connects parliamentary debates (Hansards), Whisper-aligned speech intervals, political party manifestos, recorded division votes, and official Department of Census & Statistics socio-economic indicators into an open, verifiable public audit portal.

---

## ⚡ Quick Start: How to Run the Application

### 🟢 Method 1: One-Click Startup (Windows)
Double-click the **`start_all.bat`** file in the root directory.  
It will automatically launch both the **FastAPI Backend** and the **Vite + React Frontend** in separate terminal windows.

---

### 🔵 Method 2: Manual Step-by-Step (Terminal)

#### Step 1: Start the Backend API (FastAPI)
Open a new Terminal or PowerShell window in the project root:
```bash
# 1. Install backend dependencies (first time only)
pip install -r backend/requirements.txt

# 2. Launch the FastAPI server
python -m uvicorn backend.app.main:app --reload --port 8000
```
- **Backend API:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

#### Step 2: Start the Frontend Application (React + Vite)
Open a second Terminal or PowerShell window:
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Launch the Vite development server
npm run dev
```
- **Web Application URL:** `http://localhost:5173`

---

## 🧭 Live Endpoints & Application URLs

| Component | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [`http://localhost:5173`](http://localhost:5173) | Full Civic Trace Dashboard (Light & Dark Themes) |
| **Backend API** | [`http://localhost:8000`](http://localhost:8000) | FastAPI REST Endpoints |
| **Swagger UI Docs** | [`http://localhost:8000/docs`](http://localhost:8000/docs) | Interactive API Explorer & Schema |

---

## 🚀 Key Features

1. **🌓 Switchable Light & Dark Themes**: Fully supported theme switcher in the navigation bar with instant smooth transition.
2. **📊 Executive Overview**: Verified speech volume, promise fulfillment indices, and quick-filter civic issues.
3. **🎙️ Speeches & Synced Video Transcripts**: Interactive player with clickable Whisper timestamp intervals and multi-lingual subtitles (English, Sinhala, Tamil).
4. **📋 Promise vs Reality Tracker**: Trace documented promises through Hansard debates, votes, and verified Census/Central Bank statistics.
5. **⚖️ Leader & Party Comparison**: Side-by-side policy matrix comparing key leaders across taxation, IMF, anti-corruption, and education.
6. **📈 Policy Timelines & Stats**: Interactive charts connecting parliamentary debates with inflation (CCPI) and fiscal revenue data.
7. **🤖 Cited AI Assistant**: Natural language civic Q&A backed by primary Hansard volume citations and video timestamp clips.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Lucide Icons, Recharts, Responsive Light/Dark CSS Tokens |
| **Backend API** | Python 3.12, FastAPI, Pydantic v2, Uvicorn |
| **Speech Processing** | OpenAI Whisper (speech segmentation and timestamp alignment) |
| **Text AI / RAG** | Gemini API + Semantic RAG (structured claim extraction and citation grounding) |
| **Database & Vector Search** | PostgreSQL + `pgvector` architecture, in-memory pilot datastore |
