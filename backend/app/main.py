"""Read-only Civic Trace pilot API. Sample data is never presented as verified."""
import os
import re
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .data import (MP, Party, Speech, Commitment, IssueTimeline, SAMPLE_MPS,
                   SAMPLE_PARTIES, SAMPLE_SPEECHES, SAMPLE_COMMITMENTS, SAMPLE_TIMELINES)

MODE = os.getenv("DATA_MODE", "demo")
MODELS = {"mps": MP, "parties": Party, "speeches": Speech,
          "commitments": Commitment, "timelines": IssueTimeline}
DEMO = dict(mps=SAMPLE_MPS, parties=SAMPLE_PARTIES, speeches=SAMPLE_SPEECHES,
            commitments=SAMPLE_COMMITMENTS, timelines=SAMPLE_TIMELINES)

@asynccontextmanager
async def lifespan(app):
    app.state.records = None
    app.state.loaded_at = None
    client = None
    try:
        if MODE == "demo":
            app.state.records = DEMO
        elif MODE == "mongodb":
            from pymongo import MongoClient
            uri, db_name = os.getenv("MONGODB_URI"), os.getenv("MONGODB_DATABASE")
            if not uri or not db_name:
                raise ValueError("MongoDB settings missing")
            client = MongoClient(uri, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000,
                                 socketTimeoutMS=10000)
            client.admin.command("ping")
            db = client[db_name]
            records = {}
            for name, model in MODELS.items():
                # This pilot is an immutable, bounded startup snapshot. Restart to refresh.
                if db[name].count_documents({}) > 5000:
                    raise ValueError("Pilot collection limit exceeded")
                records[name] = [model.model_validate(doc) for doc in db[name].find({}, {"_id": 0})]
                if len({item.id for item in records[name]}) != len(records[name]):
                    raise ValueError("Duplicate record IDs")
            mp_ids = {m.id for m in records["mps"]}
            if any(s.speaker_id not in mp_ids for s in records["speeches"]):
                raise ValueError("Unresolved speech speaker")
            if any(c.sponsor_mp_id not in mp_ids for c in records["commitments"]):
                raise ValueError("Unresolved commitment sponsor")
            app.state.records = records
        else:
            raise ValueError("Unknown DATA_MODE")
        app.state.loaded_at = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        # Never log database URIs or validation documents containing private data.
        logging.error("Data initialization failed (%s). Check server configuration and schema.", type(exc).__name__)
    yield
    if client is not None:
        client.close()

app = FastAPI(title="Civic Trace API", version="2.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=[x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if x.strip()],
    allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

def records(request: Request):
    if request.app.state.records is None:
        raise HTTPException(503, "Dataset unavailable. Check backend configuration and record schema.")
    return request.app.state.records

def metadata(request: Request):
    return {"mode": MODE, "loaded_at": request.app.state.loaded_at,
            "verification": "unreviewed", "snapshot": True}

@app.get("/api/health")
def health(request: Request):
    records(request)
    return {"status": "ok", **metadata(request)}

@app.get("/")
def root():
    return {"project": "Civic Trace", "version": "2.0.0", "docs": "/docs"}

@app.get("/api/workspace")
def workspace(request: Request):
    return {**records(request), "meta": metadata(request)}

@app.get("/api/stats")
def stats(request: Request):
    data = records(request)
    return {"total_mps_tracked": len(data["mps"]), "total_speeches_indexed": len(data["speeches"]),
            "total_commitments_tracked": len(data["commitments"]),
            "commitments_breakdown": {key: sum(c.current_status == label for c in data["commitments"])
                for key, label in [("kept", "Kept"), ("in_progress", "In Progress"),
                                   ("compromised", "Compromised"), ("broken", "Broken")]},
            "average_whisper_alignment_accuracy": None, "hansard_pages_indexed": None,
            "video_hours_synced": None, "active_pilot_sessions": sorted({s.session_name for s in data["speeches"]})}

def register_collection(name):
    @app.get(f"/api/{name}", name=f"list_{name}")
    def listing(request: Request, search: str = Query("", max_length=300),
                party: str = "", district: str = "", topic: str = "",
                speaker_id: str = "", status: str = "", category: str = ""):
        items = records(request)[name]
        filters = {"party": party, "district": district, "topic": topic,
                   "speaker_id": speaker_id, "current_status": status, "category": category}
        return [item for item in items
                if (not search or search.casefold() in item.model_dump_json().casefold())
                and all(not value or value.casefold() in str(getattr(item, key, "")).casefold()
                        for key, value in filters.items())]
    @app.get(f"/api/{name}/{{record_id}}", name=f"get_{name}")
    def detail(record_id: str, request: Request):
        for item in records(request)[name]:
            if item.id == record_id:
                return item
        raise HTTPException(404, "Record not found")
for collection in MODELS:
    register_collection(collection)

class CompareRequest(BaseModel):
    leader_ids: list[str] = Field(min_length=2, max_length=3)
    topics: list[str] | None = None

@app.post("/api/compare")
def compare(req: CompareRequest, request: Request):
    data = records(request)
    selected = [m for m in data["mps"] if m.id in req.leader_ids]
    if len(selected) != len(req.leader_ids):
        raise HTTPException(422, "Choose two or three different, existing leaders")
    topics = sorted({topic for m in selected for topic in m.stances})
    if req.topics is not None:
        topics = [t for t in topics if t in req.topics]
    return {"selected_mps": selected, "comparison_matrix": [
        {"topic": topic, "stances": {m.id: m.stances.get(topic, "No recorded position") for m in selected}}
        for topic in topics]}

class ChatRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    language: Literal["en", "si", "ta"] = "en"

@app.post("/api/chat")
def search_evidence(req: ChatRequest, request: Request):
    # Extractive search only. No LLM, no invented answers or confidence percentages.
    tokens = set(re.findall(r"\w+", req.query.casefold())) - {"what", "the", "about", "did", "and", "was", "who"}
    if not tokens:
        raise HTTPException(422, "Enter a topic, name, or phrase")
    scored = [(sum(t in (s.title + " " + s.summary + " " + s.speaker_name + " " +
                " ".join(seg.text_en + " " + (seg.text_si or "") + " " + (seg.text_ta or "")
                         for seg in s.segments)).casefold() for t in tokens), s)
              for s in records(request)["speeches"]]
    matches = [s for score, s in sorted(scored, key=lambda pair: pair[0], reverse=True) if score][:4]
    return {"answer": "Matching records are shown below. This is keyword retrieval, not an AI-generated answer."
            if matches else "No matching evidence in this dataset. Try a name or a shorter topic.",
            "citations": [{"title": s.title, "source_type": "Hansard", "ref_code": s.hansard_vol + ", p. " + s.hansard_page,
                           "url": s.hansard_pdf_url, "speech_id": s.id, "confidence_score": 0} for s in matches],
            "confidence_score": 0, "grounded_claim_count": 0,
            "missing_evidence_flags": ["Records and links have not been independently verified.",
                                       "Generative RAG is not connected."], "suggested_queries": []}
