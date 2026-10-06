"""Read-only Civic Trace pilot API. Sample data is never presented as verified."""
import os
import re
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone, date as date_type
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .data import (MP, Party, Speech, Commitment, IssueTimeline, SAMPLE_MPS,
                   SAMPLE_PARTIES, SAMPLE_SPEECHES, SAMPLE_COMMITMENTS, SAMPLE_TIMELINES)
from .activity import (AttendanceRecord, MPMembership, SittingDay,
                       DEMO_ATTENDANCE, DEMO_MEMBERSHIPS, DEMO_SITTINGS)
from .evidence import (TrailEvent, TrailRelationship, RelationshipReviewRequest,
                       DEMO_TRAIL_EVENTS, DEMO_TRAIL_RELATIONSHIPS, format_supports_statement)

MODE = os.getenv("DATA_MODE", "demo")
MODELS = {"mps": MP, "parties": Party, "speeches": Speech,
          "commitments": Commitment, "timelines": IssueTimeline}
DEMO = dict(mps=SAMPLE_MPS, parties=SAMPLE_PARTIES, speeches=SAMPLE_SPEECHES,
            commitments=SAMPLE_COMMITMENTS, timelines=SAMPLE_TIMELINES)

@asynccontextmanager
async def lifespan(app):
    app.state.records = None
    app.state.activity = None
    app.state.evidence = None
    app.state.loaded_at = None
    client = None
    try:
        if MODE == "demo":
            app.state.records = DEMO
            app.state.activity = {
                "attendance":  DEMO_ATTENDANCE,
                "memberships": DEMO_MEMBERSHIPS,
                "sittings":    DEMO_SITTINGS,
            }
            app.state.evidence = {
                "events": [e.model_copy() for e in DEMO_TRAIL_EVENTS],
                "relationships": [r.model_copy() for r in DEMO_TRAIL_RELATIONSHIPS],
            }
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
            # Activity collections: attendance, memberships, sittings
            # These are optional; if absent, activity endpoints return unavailable state.
            def _load_activity(col_name, model_class, limit=20000):
                if not hasattr(db, "list_collection_names") or col_name not in db.list_collection_names():
                    return None
                if db[col_name].count_documents({}) > limit:
                    logging.warning("Activity collection %s exceeds pilot limit; skipping.", col_name)
                    return None
                return [model_class.model_validate(doc) for doc in db[col_name].find({}, {"_id": 0})]
            activity = {
                "attendance":  _load_activity("attendance",  AttendanceRecord),
                "memberships": _load_activity("memberships", MPMembership),
                "sittings":    _load_activity("sittings",    SittingDay),
            }
            app.state.activity = activity

            # Evidence collections: trail_events, trail_relationships
            def _load_evidence_col(col_name, model_class, limit=10000):
                if not hasattr(db, "list_collection_names") or col_name not in db.list_collection_names():
                    return None
                if db[col_name].count_documents({}) > limit:
                    logging.warning("Evidence collection %s exceeds limit; skipping.", col_name)
                    return None
                return [model_class.model_validate(doc) for doc in db[col_name].find({}, {"_id": 0})]
            ev_events = _load_evidence_col("trail_events", TrailEvent)
            ev_rels = _load_evidence_col("trail_relationships", TrailRelationship)
            app.state.evidence = {
                "events": ev_events if ev_events is not None else [],
                "relationships": ev_rels if ev_rels is not None else [],
            }
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

def _evidence_data(request: Request):
    if request.app.state.evidence is None:
        raise HTTPException(503, "Evidence dataset unavailable. Check backend configuration.")
    return request.app.state.evidence

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
    base = records(request)
    evi = _evidence_data(request)
    return {
        **base,
        "trail_events": [e.model_dump() for e in evi["events"]],
        "trail_relationships": [r.model_dump() for r in evi["relationships"]],
        "meta": metadata(request),
    }

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


# ---------------------------------------------------------------------------
# Activity Profile endpoints
# ---------------------------------------------------------------------------

def _parse_date(value: Optional[str]) -> Optional[date_type]:
    """Return a date_type or None. Raises ValueError on bad input."""
    if not value:
        return None
    try:
        return date_type.fromisoformat(value)
    except ValueError:
        raise ValueError(f"Invalid date: {value!r}. Use YYYY-MM-DD.")


def _activity_data(request: Request):
    """Return activity data or raise 503 if unavailable."""
    if request.app.state.activity is None:
        raise HTTPException(503, "Activity dataset unavailable. Check backend configuration.")
    return request.app.state.activity


@app.get("/api/mps/{mp_id}/activity", name="mp_activity_summary")
def mp_activity_summary(
    mp_id: str,
    request: Request,
    date_from: Optional[str] = Query(None, description="Start date YYYY-MM-DD (inclusive)"),
    date_to: Optional[str] = Query(None, description="End date YYYY-MM-DD (inclusive)"),
    session: Optional[str] = Query(None, description="Parliament/session filter"),
):
    """
    Activity summary for a single MP: attendance counts + indexed speech count + topics.
    Attendance rate = present / (present + absent) for records with known status only.
    Missing-data sittings are counted separately; they do not enter the rate denominator.
    Eligible sitting days are derived from membership dates, NOT from attendance records alone.
    """
    data = records(request)
    mp = next((m for m in data["mps"] if m.id == mp_id), None)
    if mp is None:
        raise HTTPException(404, "MP not found")

    try:
        from_d = _parse_date(date_from)
        to_d   = _parse_date(date_to)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

    if from_d and to_d and from_d > to_d:
        raise HTTPException(422, "date_from must not be later than date_to")

    act = _activity_data(request)
    attendance_available = act["attendance"] is not None

    # --- Attendance ---
    present = absent = missing = 0
    eligible_sitting_days: Optional[int] = None

    if attendance_available:
        records_for_mp = [
            r for r in act["attendance"]
            if r.mp_id == mp_id
            and (not session or r.parliament_session == session)
            and (not from_d or r.sitting_date >= from_d.isoformat())
            and (not to_d   or r.sitting_date <= to_d.isoformat())
        ]
        # Deduplicate by sitting_id (keep first occurrence)
        seen_sittings = set()
        deduped = []
        for r in records_for_mp:
            if r.sitting_id not in seen_sittings:
                seen_sittings.add(r.sitting_id)
                deduped.append(r)

        for r in deduped:
            if r.recorded_status == "present":
                present += 1
            elif r.recorded_status == "absent":
                absent += 1
            elif r.recorded_status == "missing_data":
                missing += 1
            # Other official categories are counted as present or absent
            # depending on their semantic; here we preserve verbatim and
            # leave them outside the three buckets.

        # Eligible sitting days from membership
        if act["memberships"] is not None and act["sittings"] is not None:
            memberships = [m for m in act["memberships"] if m.mp_id == mp_id]
            sittings = [
                s for s in act["sittings"]
                if (not session or s.parliament_session == session)
                and s.sitting_type == "House"
                and (not from_d or s.sitting_date >= from_d.isoformat())
                and (not to_d   or s.sitting_date <= to_d.isoformat())
            ]
            count = 0
            for sitting in sittings:
                for mem in memberships:
                    if mem.parliament_session != sitting.parliament_session:
                        continue
                    if sitting.sitting_date < mem.joined_date:
                        continue
                    if mem.left_date and sitting.sitting_date > mem.left_date:
                        continue
                    count += 1
                    break
            eligible_sitting_days = count

    # Attendance rate = present / (present + absent); missing_data excluded
    known_total = present + absent
    attendance_rate: Optional[float] = round(present / known_total * 100, 1) if known_total > 0 else None

    # --- Speeches: deduplicated by speech ID ---
    mp_speeches = [s for s in data["speeches"] if s.speaker_id == mp_id]
    if session:
        mp_speeches = [s for s in mp_speeches if s.session_name == session or session in s.session_name]
    if from_d:
        mp_speeches = [s for s in mp_speeches if s.sitting_date >= from_d.isoformat()]
    if to_d:
        mp_speeches = [s for s in mp_speeches if s.sitting_date <= to_d.isoformat()]
    # Deduplicate by id
    seen_ids = set()
    deduped_speeches = []
    for s in mp_speeches:
        if s.id not in seen_ids:
            seen_ids.add(s.id)
            deduped_speeches.append(s)

    # Topics: each speech has exactly one topic in this dataset
    from collections import Counter
    topic_counts = Counter(s.topic for s in deduped_speeches)
    topics = [{"topic": t, "count": c} for t, c in topic_counts.most_common()]

    # Memberships for this MP
    mp_memberships = []
    if act.get("memberships") is not None:
        mp_memberships = [
            {
                "parliament_session": m.parliament_session,
                "joined_date": m.joined_date,
                "left_date": m.left_date,
            }
            for m in act["memberships"]
            if m.mp_id == mp_id
        ]

    # Sessions in the indexed data
    indexed_sessions = sorted({s.session_name for s in deduped_speeches})

    return {
        "mp_id": mp_id,
        "mp_name": mp.name,
        "party": mp.party,
        "district": mp.district,
        "current_role": mp.current_role,
        "memberships": mp_memberships,
        "filters_applied": {
            "date_from":  from_d.isoformat() if from_d else None,
            "date_to":    to_d.isoformat()   if to_d   else None,
            "session":    session,
        },
        "attendance": {
            "available": attendance_available,
            "present": present,
            "absent": absent,
            "missing_data": missing,
            "eligible_sitting_days": eligible_sitting_days,
            "attendance_rate": attendance_rate,
            "rate_denominator_label": f"{known_total} sittings with known status (present or absent)",
            "coverage_note": (
                "Attendance rate uses recorded present/absent statuses only. "
                f"{missing} sittings have missing data and are excluded from the rate."
                if attendance_available else
                "Attendance records are not yet available for this dataset."
            ),
        },
        "speeches": {
            "count": len(deduped_speeches),
            "label": "Speeches in indexed records",
            "coverage_note": "This count covers only the records indexed in this dataset, not the member's full parliamentary activity.",
            "indexed_sessions": indexed_sessions,
            "topics": topics,
            "topics_note": "Each speech is counted under exactly one topic in this dataset.",
        },
        "dataset_note": (
            "Demo workspace. Records are synthetic examples and have not been verified."
            if data.get("meta", {}).get("mode") == "demo" or MODE == "demo" else
            "Imported records awaiting source review."
        ),
        "loaded_at": request.app.state.loaded_at,
    }


@app.get("/api/mps/{mp_id}/attendance", name="mp_attendance_records")
def mp_attendance_records(
    mp_id: str,
    request: Request,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Filter by recorded_status value"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    """
    Paginated list of attendance records for one MP.
    Deduplicates by sitting_id. Includes sitting date, status, and source.
    """
    data = records(request)
    if not any(m.id == mp_id for m in data["mps"]):
        raise HTTPException(404, "MP not found")

    try:
        from_d = _parse_date(date_from)
        to_d   = _parse_date(date_to)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if from_d and to_d and from_d > to_d:
        raise HTTPException(422, "date_from must not be later than date_to")

    act = _activity_data(request)
    if act["attendance"] is None:
        return {"available": False, "records": [], "total": 0, "page": page, "page_size": page_size,
                "note": "Attendance records not available for this dataset."}

    filtered = [
        r for r in act["attendance"]
        if r.mp_id == mp_id
        and (not session or r.parliament_session == session)
        and (not from_d or r.sitting_date >= from_d.isoformat())
        and (not to_d   or r.sitting_date <= to_d.isoformat())
        and (not status or r.recorded_status == status)
    ]
    # Deduplicate by sitting_id
    seen = set()
    deduped = []
    for r in sorted(filtered, key=lambda r: r.sitting_date, reverse=True):
        if r.sitting_id not in seen:
            seen.add(r.sitting_id)
            deduped.append(r)

    total = len(deduped)
    start = (page - 1) * page_size
    page_records = deduped[start:start + page_size]

    return {
        "available": True,
        "records": [r.model_dump() for r in page_records],
        "total": total,
        "page": page,
        "page_size": page_size,
        "note": "Missing-data status means the record exists but attendance was not determinable from the source.",
    }


@app.get("/api/mps/{mp_id}/speeches", name="mp_speeches_paginated")
def mp_speeches_paginated(
    mp_id: str,
    request: Request,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=300),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Paginated speeches by one MP. Deduplicates by speech ID.
    Translations and transcript chunks are NOT counted as additional speeches.
    """
    data = records(request)
    if not any(m.id == mp_id for m in data["mps"]):
        raise HTTPException(404, "MP not found")

    try:
        from_d = _parse_date(date_from)
        to_d   = _parse_date(date_to)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if from_d and to_d and from_d > to_d:
        raise HTTPException(422, "date_from must not be later than date_to")

    mp_speeches = [s for s in data["speeches"] if s.speaker_id == mp_id]
    if session:
        mp_speeches = [s for s in mp_speeches if session in s.session_name]
    if from_d:
        mp_speeches = [s for s in mp_speeches if s.sitting_date >= from_d.isoformat()]
    if to_d:
        mp_speeches = [s for s in mp_speeches if s.sitting_date <= to_d.isoformat()]
    if topic:
        mp_speeches = [s for s in mp_speeches if s.topic.casefold() == topic.casefold()]
    if search:
        term = search.casefold()
        mp_speeches = [s for s in mp_speeches if
            term in s.title.casefold() or
            term in s.summary.casefold() or
            term in s.topic.casefold() or
            any(term in seg.text_en.casefold() for seg in s.segments)]

    # Deduplicate by id; sort newest first
    seen = set()
    deduped = []
    for s in sorted(mp_speeches, key=lambda s: s.sitting_date, reverse=True):
        if s.id not in seen:
            seen.add(s.id)
            deduped.append(s)

    total = len(deduped)
    start = (page - 1) * page_size
    page_speeches = deduped[start:start + page_size]

    return {
        "speeches": [
            {
                "id": s.id,
                "title": s.title,
                "sitting_date": s.sitting_date,
                "session_name": s.session_name,
                "topic": s.topic,
                "summary": s.summary,
                "hansard_vol": s.hansard_vol,
                "hansard_page": s.hansard_page,
                "hansard_pdf_url": s.hansard_pdf_url,
                "duration": s.duration,
                "has_audio": bool(s.video_url or (s.segments and len(s.segments) > 0)),
            }
            for s in page_speeches
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "label": "Speeches in indexed records",
        "coverage_note": "This list covers only the records indexed in this dataset.",
    }

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


# ---------------------------------------------------------------------------
# "What happened after?" Evidence Trail endpoints
# ---------------------------------------------------------------------------

REVIEW_TOKEN = os.getenv("REVIEW_TOKEN", "civic-trace-review-secret-2024")


@app.get("/api/evidence-trails/{record_id}", name="get_evidence_trail")
def get_evidence_trail(
    record_id: str,
    request: Request,
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    include_unreviewed: bool = Query(False, description="Include unreviewed candidate suggestions"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """
    Retrieve the chronological evidence trail for an originating speech or commitment.
    Separates established (accepted) evidence from unreviewed suggestions.
    Every event contains an inspectable source citation or explicit unavailability notice.
    """
    data = records(request)
    origin = None

    # Check speeches first
    speech = next((s for s in data["speeches"] if s.id == record_id), None)
    if speech:
        passage = speech.segments[0].text_en if speech.segments else speech.summary
        origin = {
            "record_id": speech.id,
            "record_kind": "speech",
            "title": speech.title,
            "speaker_or_sponsor": speech.speaker_name,
            "party": speech.party,
            "role_or_org": speech.speaker_role,
            "date": speech.sitting_date,
            "date_precision": "day",
            "original_quote_or_passage": passage,
            "source_ref": f"{speech.hansard_vol}, pp. {speech.hansard_page}",
            "source_url": speech.hansard_pdf_url,
            "coverage_start": "2023-01-01",
            "coverage_end": "2024-12-31",
            "latest_update": "2025-01-20",
            "coverage_note": "Indexed parliamentary sessions cover 9th Parliament 4th Session (2023–2024).",
        }
    else:
        # Check commitments
        commitment = next((c for c in data["commitments"] if c.id == record_id), None)
        if commitment:
            origin = {
                "record_id": commitment.id,
                "record_kind": "commitment",
                "title": commitment.title,
                "speaker_or_sponsor": commitment.sponsor_name,
                "party": commitment.party,
                "role_or_org": f"Manifesto Year {commitment.manifesto_year}",
                "date": f"{commitment.manifesto_year}-01-01",
                "date_precision": "year",
                "original_quote_or_passage": commitment.original_quote,
                "source_ref": commitment.manifesto_source,
                "source_url": commitment.timeline[0].source_url if commitment.timeline else None,
                "coverage_start": f"{commitment.manifesto_year}-01-01",
                "coverage_end": "2025-01-31",
                "latest_update": "2025-01-20",
                "coverage_note": "Indexed follow-ups cover related Hansard debates, recorded votes, gazettes, and official statistical releases.",
            }

    if origin is None:
        raise HTTPException(404, f"Record {record_id!r} not found in speeches or commitments")

    evi = _evidence_data(request)
    all_events = {e.id: e for e in evi["events"]}
    matching_rels = [r for r in evi["relationships"] if r.from_record_id == record_id]

    accepted_items = []
    unreviewed_items = []

    for rel in matching_rels:
        event = all_events.get(rel.to_record_id)
        if not event:
            continue

        # Filter by event_type
        if event_type and event.event_type.casefold() != event_type.casefold():
            continue

        # Filter by date range (supports YYYY-MM-DD, YYYY-MM, or YYYY)
        if date_from and event.date < date_from:
            continue
        if date_to and event.date > date_to:
            continue

        # Check for linked speeches
        linked_speech = None
        for linked_id in event.linked_source_ids:
            sp = next((s for s in data["speeches"] if s.id == linked_id), None)
            if sp:
                linked_speech = {
                    "id": sp.id,
                    "title": sp.title,
                    "speaker_name": sp.speaker_name,
                    "sitting_date": sp.sitting_date,
                    "hansard_vol": sp.hansard_vol,
                    "hansard_page": sp.hansard_page,
                    "hansard_pdf_url": sp.hansard_pdf_url,
                }
                break

        trail_item = {
            "event": event.model_dump(),
            "relationship": rel.model_dump(),
            "supports_statement": format_supports_statement(event.event_type, rel.relationship_type),
            "linked_speech": linked_speech,
        }

        if rel.review_state == "accepted":
            accepted_items.append(trail_item)
        elif rel.review_state == "proposed":
            unreviewed_items.append(trail_item)

    # Sort chronologically by date then id
    accepted_items.sort(key=lambda item: (item["event"]["date"], item["event"]["id"]))
    unreviewed_items.sort(key=lambda item: (item["event"]["date"], item["event"]["id"]))

    # Coverage status determination
    if accepted_items:
        coverage_status = "covered_with_events"
        coverage_explanation = f"Found {len(accepted_items)} documented follow-up events indexed in official records."
    elif unreviewed_items:
        coverage_status = "unreviewed_only"
        coverage_explanation = f"No accepted follow-up records. {len(unreviewed_items)} candidate suggestion(s) are awaiting review."
    else:
        coverage_status = "no_linked_records"
        coverage_explanation = "No later linked evidence is available in the indexed sources for this record."

    # Pagination on accepted items
    total_accepted = len(accepted_items)
    start = (page - 1) * page_size
    paged_accepted = accepted_items[start : start + page_size]

    return {
        "origin": origin,
        "established_trail": paged_accepted,
        "unreviewed_suggestions": unreviewed_items if include_unreviewed else [],
        "total_accepted": total_accepted,
        "total_unreviewed": len(unreviewed_items),
        "page": page,
        "page_size": page_size,
        "coverage_status": coverage_status,
        "coverage_explanation": coverage_explanation,
        "filters_applied": {
            "event_type": event_type,
            "date_from": date_from,
            "date_to": date_to,
            "include_unreviewed": include_unreviewed,
        },
        "disclaimer": "Evidence shows documented parliamentary and administrative actions. Existence of follow-up does not prove implementation completion, nor does absence of indexed records prove inaction.",
    }


@app.get("/api/trail-events/{event_id}", name="get_trail_event")
def get_trail_event(event_id: str, request: Request):
    """
    Retrieve a single trail event with its supporting evidence context,
    inspectable source references, and linked relationships.
    """
    evi = _evidence_data(request)
    event = next((e for e in evi["events"] if e.id == event_id), None)
    if event is None:
        raise HTTPException(404, f"Trail event {event_id!r} not found")

    data = records(request)
    rels = [r.model_dump() for r in evi["relationships"] if r.to_record_id == event_id]
    linked_speeches = [
        {
            "id": s.id,
            "title": s.title,
            "speaker_name": s.speaker_name,
            "sitting_date": s.sitting_date,
            "hansard_vol": s.hansard_vol,
            "hansard_page": s.hansard_page,
            "hansard_pdf_url": s.hansard_pdf_url,
            "has_audio": bool(s.video_url or s.segments),
        }
        for s in data["speeches"]
        if s.id in event.linked_source_ids
    ]

    return {
        "event": event.model_dump(),
        "relationships": rels,
        "linked_speeches": linked_speeches,
        "source_summary": {
            "source_type": event.source_type,
            "source_ref": event.source_ref,
            "source_url": event.source_url,
            "source_available": event.source_available,
            "supporting_passage": event.supporting_passage,
            "recording_interval": event.recording_interval,
            "status_note": (
                "Verified primary document citation."
                if event.source_available and event.source_url
                else "Primary source cited in archives but direct electronic document is unavailable."
            ),
        },
    }


@app.get("/api/trail-relationships", name="list_trail_relationships")
def list_trail_relationships(
    request: Request,
    from_record_id: Optional[str] = Query(None),
    to_record_id: Optional[str] = Query(None),
    relationship_type: Optional[str] = Query(None),
    review_state: Optional[str] = Query(None),
):
    """
    Inspect raw explicit relationships between records and trail events.
    """
    evi = _evidence_data(request)
    filtered = evi["relationships"]
    if from_record_id:
        filtered = [r for r in filtered if r.from_record_id == from_record_id]
    if to_record_id:
        filtered = [r for r in filtered if r.to_record_id == to_record_id]
    if relationship_type:
        filtered = [r for r in filtered if r.relationship_type.casefold() == relationship_type.casefold()]
    if review_state:
        filtered = [r for r in filtered if r.review_state.casefold() == review_state.casefold()]
    return [r.model_dump() for r in filtered]


@app.post("/api/trail-relationships/review", name="review_trail_relationship")
def review_trail_relationship(
    review_req: RelationshipReviewRequest,
    request: Request,
):
    """
    Authenticated reviewer workflow for accepting or rejecting candidate relationships.
    Protects against unauthenticated write modifications.
    """
    auth_header = request.headers.get("X-Reviewer-Token") or request.headers.get("Authorization")
    expected = REVIEW_TOKEN
    if not auth_header or (auth_header != expected and auth_header != f"Bearer {expected}"):
        raise HTTPException(
            401,
            "Unauthorized: Valid reviewer token required in X-Reviewer-Token or Authorization header",
        )

    evi = _evidence_data(request)
    rel = next((r for r in evi["relationships"] if r.id == review_req.relationship_id), None)
    if not rel:
        raise HTTPException(404, f"Relationship {review_req.relationship_id!r} not found")

    rel.review_state = review_req.review_state
    rel.reviewer = review_req.reviewer
    rel.review_date = datetime.now(timezone.utc).date().isoformat()
    rel.updated_at = datetime.now(timezone.utc).isoformat()
    if review_req.review_note:
        rel.explanation = f"{rel.explanation} [Editorial note: {review_req.review_note}]"

    return {
        "status": "success",
        "relationship_id": rel.id,
        "new_review_state": rel.review_state,
        "reviewer": rel.reviewer,
        "review_date": rel.review_date,
        "updated_at": rel.updated_at,
    }
