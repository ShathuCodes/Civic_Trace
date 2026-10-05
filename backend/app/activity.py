"""
Civic Trace - MP Activity Profile data layer.

Attendance schema is evidence-backed: every record carries a sitting_id,
sitting_date, parliament_session, recorded_status, source_url, and a
fetch timestamp. Missing records remain unknown; they are never imputed
as absent from having no speech.

These demo records are synthetic examples illustrating the schema.
They do NOT represent verified official attendance for any actual MP.

Field contract (AttendanceRecord):
  mp_id             - matches MP.id
  sitting_id        - unique identifier for the parliamentary sitting
  sitting_date      - ISO-8601 date string  e.g. "2024-03-14"
  parliament_session- e.g. "9th Parliament 4th Session"
  recorded_status   - "present" | "absent" | "missing_data" | verbatim official category
  source_url        - URL to the official attendance register / Hansard page
  source_doc_id     - optional document or Hansard reference code
  fetched_at        - ISO-8601 datetime string (UTC) when this record was ingested

Membership record (MPMembership):
  mp_id, parliament_session, joined_date, left_date (None = still seated)
  Determines eligible sitting days for a chosen date range.

IMPORTANT: Absence is never inferred from having no speech in a sitting.
"""

from typing import Optional, List
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class AttendanceRecord(BaseModel):
    mp_id: str
    sitting_id: str
    sitting_date: str          # ISO-8601 e.g. "2024-03-14"
    parliament_session: str
    recorded_status: str       # "present"|"absent"|"missing_data"|verbatim
    source_url: Optional[str] = None
    source_doc_id: Optional[str] = None
    fetched_at: str            # ISO-8601 datetime UTC


class MPMembership(BaseModel):
    mp_id: str
    parliament_session: str
    joined_date: str           # ISO-8601 date
    left_date: Optional[str] = None   # None = still seated at snapshot


class SittingDay(BaseModel):
    sitting_id: str
    sitting_date: str
    parliament_session: str
    sitting_type: str = "House"   # "House" | "Committee"


# ---------------------------------------------------------------------------
# Demo dataset - labelled as unreviewed sample data
# ---------------------------------------------------------------------------

_DEMO_ATTENDANCE: List[AttendanceRecord] = [
    # mp-akd
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0314", sitting_date="2024-03-14",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        source_doc_id="Hansard Vol 308", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0307", sitting_date="2024-03-07",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240307.pdf",
        source_doc_id="Hansard Vol 307", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0221", sitting_date="2024-02-21",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240221.pdf",
        source_doc_id="Hansard Vol 306", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0207", sitting_date="2024-02-07",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240207.pdf",
        source_doc_id="Hansard Vol 306", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0124", sitting_date="2024-01-24",
        parliament_session="9th Parliament 4th Session", recorded_status="absent",
        source_url="https://parliament.lk/uploads/hansard/doc_20240124.pdf",
        source_doc_id="Hansard Vol 305", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0117", sitting_date="2024-01-17",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240117.pdf",
        source_doc_id="Hansard Vol 305", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2023-1214", sitting_date="2023-12-14",
        parliament_session="9th Parliament 3rd Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20231214.pdf",
        source_doc_id="Hansard Vol 302", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2023-1211", sitting_date="2023-12-11",
        parliament_session="9th Parliament 3rd Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20231211.pdf",
        source_doc_id="Hansard Vol 302", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2023-1130", sitting_date="2023-11-30",
        parliament_session="9th Parliament 3rd Session", recorded_status="missing_data",
        source_url=None, source_doc_id=None, fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-akd", sitting_id="sit-2024-0522", sitting_date="2024-05-22",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240522.pdf",
        source_doc_id="Hansard Vol 310", fetched_at="2026-01-10T09:00:00Z"),
    # mp-harsha
    AttendanceRecord(mp_id="mp-harsha", sitting_id="sit-2023-1211", sitting_date="2023-12-11",
        parliament_session="9th Parliament 3rd Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20231211.pdf",
        source_doc_id="Hansard Vol 302", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-harsha", sitting_id="sit-2024-0307", sitting_date="2024-03-07",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240307.pdf",
        source_doc_id="Hansard Vol 307", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-harsha", sitting_id="sit-2024-0314", sitting_date="2024-03-14",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        source_doc_id="Hansard Vol 308", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-harsha", sitting_id="sit-2024-0522", sitting_date="2024-05-22",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240522.pdf",
        source_doc_id="Hansard Vol 310", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-harsha", sitting_id="sit-2024-0124", sitting_date="2024-01-24",
        parliament_session="9th Parliament 4th Session", recorded_status="absent",
        source_url="https://parliament.lk/uploads/hansard/doc_20240124.pdf",
        source_doc_id="Hansard Vol 305", fetched_at="2026-01-10T09:00:00Z"),
    # mp-sajith
    AttendanceRecord(mp_id="mp-sajith", sitting_id="sit-2024-0522", sitting_date="2024-05-22",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240522.pdf",
        source_doc_id="Hansard Vol 310", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-sajith", sitting_id="sit-2024-0314", sitting_date="2024-03-14",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        source_doc_id="Hansard Vol 308", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-sajith", sitting_id="sit-2024-0207", sitting_date="2024-02-07",
        parliament_session="9th Parliament 4th Session", recorded_status="absent",
        source_url="https://parliament.lk/uploads/hansard/doc_20240207.pdf",
        source_doc_id="Hansard Vol 306", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-sajith", sitting_id="sit-2023-1211", sitting_date="2023-12-11",
        parliament_session="9th Parliament 3rd Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20231211.pdf",
        source_doc_id="Hansard Vol 302", fetched_at="2026-01-10T09:00:00Z"),
    # mp-ranil
    AttendanceRecord(mp_id="mp-ranil", sitting_id="sit-2024-0207", sitting_date="2024-02-07",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240207.pdf",
        source_doc_id="Hansard Vol 306", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-ranil", sitting_id="sit-2024-0314", sitting_date="2024-03-14",
        parliament_session="9th Parliament 4th Session", recorded_status="absent",
        source_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        source_doc_id="Hansard Vol 308", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-ranil", sitting_id="sit-2023-1211", sitting_date="2023-12-11",
        parliament_session="9th Parliament 3rd Session", recorded_status="missing_data",
        source_url=None, source_doc_id=None, fetched_at="2026-01-10T09:00:00Z"),
    # mp-sumanthiran
    AttendanceRecord(mp_id="mp-sumanthiran", sitting_id="sit-2024-0124", sitting_date="2024-01-24",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240124.pdf",
        source_doc_id="Hansard Vol 305", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-sumanthiran", sitting_id="sit-2024-0307", sitting_date="2024-03-07",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240307.pdf",
        source_doc_id="Hansard Vol 307", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-sumanthiran", sitting_id="sit-2024-0522", sitting_date="2024-05-22",
        parliament_session="9th Parliament 4th Session", recorded_status="missing_data",
        source_url=None, source_doc_id=None, fetched_at="2026-01-10T09:00:00Z"),
    # mp-alisabry
    AttendanceRecord(mp_id="mp-alisabry", sitting_id="sit-2024-0314", sitting_date="2024-03-14",
        parliament_session="9th Parliament 4th Session", recorded_status="present",
        source_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        source_doc_id="Hansard Vol 308", fetched_at="2026-01-10T09:00:00Z"),
    AttendanceRecord(mp_id="mp-alisabry", sitting_id="sit-2024-0522", sitting_date="2024-05-22",
        parliament_session="9th Parliament 4th Session", recorded_status="absent",
        source_url="https://parliament.lk/uploads/hansard/doc_20240522.pdf",
        source_doc_id="Hansard Vol 310", fetched_at="2026-01-10T09:00:00Z"),
]

_DEMO_MEMBERSHIPS: List[MPMembership] = [
    MPMembership(mp_id="mp-akd",         parliament_session="9th Parliament 3rd Session", joined_date="2023-10-02", left_date="2024-01-15"),
    MPMembership(mp_id="mp-akd",         parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date=None),
    MPMembership(mp_id="mp-sajith",      parliament_session="9th Parliament 3rd Session", joined_date="2023-10-02", left_date="2024-01-15"),
    MPMembership(mp_id="mp-sajith",      parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date=None),
    MPMembership(mp_id="mp-harsha",      parliament_session="9th Parliament 3rd Session", joined_date="2023-10-02", left_date="2024-01-15"),
    MPMembership(mp_id="mp-harsha",      parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date=None),
    MPMembership(mp_id="mp-ranil",       parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date="2024-09-30"),
    MPMembership(mp_id="mp-sumanthiran", parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date=None),
    MPMembership(mp_id="mp-alisabry",    parliament_session="9th Parliament 4th Session", joined_date="2024-01-16", left_date=None),
]

_DEMO_SITTINGS: List[SittingDay] = [
    SittingDay(sitting_id="sit-2023-1130", sitting_date="2023-11-30", parliament_session="9th Parliament 3rd Session"),
    SittingDay(sitting_id="sit-2023-1211", sitting_date="2023-12-11", parliament_session="9th Parliament 3rd Session"),
    SittingDay(sitting_id="sit-2023-1214", sitting_date="2023-12-14", parliament_session="9th Parliament 3rd Session"),
    SittingDay(sitting_id="sit-2024-0117", sitting_date="2024-01-17", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0124", sitting_date="2024-01-24", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0207", sitting_date="2024-02-07", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0221", sitting_date="2024-02-21", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0307", sitting_date="2024-03-07", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0314", sitting_date="2024-03-14", parliament_session="9th Parliament 4th Session"),
    SittingDay(sitting_id="sit-2024-0522", sitting_date="2024-05-22", parliament_session="9th Parliament 4th Session"),
]

DEMO_ATTENDANCE  = _DEMO_ATTENDANCE
DEMO_MEMBERSHIPS = _DEMO_MEMBERSHIPS
DEMO_SITTINGS    = _DEMO_SITTINGS

# ---------------------------------------------------------------------------
# MongoDB adapter boundary
# ---------------------------------------------------------------------------
# When DATA_MODE == "mongodb", replace demo collections with live queries.
# Map to these field names in your MongoDB collections:
#
#   Collection "attendance":
#     mp_id, sitting_id, sitting_date, parliament_session,
#     recorded_status, source_url, source_doc_id, fetched_at
#
#   Collection "memberships":
#     mp_id, parliament_session, joined_date, left_date
#
#   Collection "sittings":
#     sitting_id, sitting_date, parliament_session, sitting_type
#
# Recommended indexes:
#   attendance:  { mp_id: 1, sitting_date: 1 }
#                { sitting_id: 1 }
#   memberships: { mp_id: 1, parliament_session: 1 }
#   sittings:    { parliament_session: 1, sitting_date: 1 }
#
# Example query (per-MP attendance within a date range, without full scan):
#   db.attendance.find(
#       {"mp_id": mp_id, "sitting_date": {"$gte": date_from, "$lte": date_to}},
#       {"_id": 0}
#   )
