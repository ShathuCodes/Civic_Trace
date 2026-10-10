import type {
  DashboardStats,
  MP,
  Speech,
  Commitment,
  IssueTimeline,
  ChatResponse,
  ActivitySummary,
  AttendancePage,
  AttendanceRecord,
  SpeechPage,
  TrailEvent,
  TrailRelationship,
  EvidenceTrailResponse,
  TrailItem,
  EvidenceTrailSummary,
} from "./types";
import fixtures from "./fixtures/demo.json";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
// Explicit demo snapshot exported from the backend. These records are unreviewed.
export const LOCAL_MPS = fixtures.mps as MP[];
export const LOCAL_SPEECHES = fixtures.speeches as Speech[];
export const LOCAL_COMMITMENTS = fixtures.commitments as Commitment[];
export const LOCAL_TIMELINES = fixtures.timelines as IssueTimeline[];
export const LOCAL_TRAIL_EVENTS = ((fixtures as any).trail_events || []) as TrailEvent[];
export const LOCAL_TRAIL_RELATIONSHIPS = ((fixtures as any).trail_relationships || []) as TrailRelationship[];

export interface Workspace {
  mps: MP[];
  speeches: Speech[];
  commitments: Commitment[];
  timelines: IssueTimeline[];
  trail_events?: TrailEvent[];
  trail_relationships?: TrailRelationship[];
  meta: {
    mode: "demo" | "mongodb";
    loaded_at: string | null;
    verification: string;
    snapshot: boolean;
    gemini_connected?: boolean;
    qdrant_configured?: boolean;
  };
}
export const DEMO_WORKSPACE: Workspace = {
  mps: LOCAL_MPS,
  speeches: LOCAL_SPEECHES,
  commitments: LOCAL_COMMITMENTS,
  timelines: LOCAL_TIMELINES,
  trail_events: LOCAL_TRAIL_EVENTS,
  trail_relationships: LOCAL_TRAIL_RELATIONSHIPS,
  meta: {
    mode: "demo",
    loaded_at: null,
    verification: "unreviewed",
    snapshot: true,
  },
};
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(
      `Request failed (${response.status}). Check the backend and try again.`,
    );
  return response.json();
}
export async function loadWorkspace(signal?: AbortSignal): Promise<Workspace> {
  const result = await request<Workspace>("/workspace", { signal });
  if (
    !result.meta ||
    !["demo", "mongodb"].includes(result.meta.mode) ||
    !["mps", "speeches", "commitments", "timelines"].every((k) =>
      Array.isArray(result[k as keyof Workspace]),
    )
  ) {
    throw new Error(
      "The API returned an incompatible dataset. Check the API version.",
    );
  }
  return result;
}

export const LOCAL_ATTENDANCE = ((fixtures as any).attendance || []) as AttendanceRecord[];
export const LOCAL_MEMBERSHIPS = ((fixtures as any).memberships || []) as Array<{
  mp_id: string;
  parliament_session: string;
  joined_date: string;
  left_date: string | null;
}>;
export const LOCAL_SITTINGS = ((fixtures as any).sittings || []) as Array<{
  sitting_id: string;
  sitting_date: string;
  parliament_session: string;
  sitting_type: string;
}>;

function computeLocalActivity(
  mpId: string,
  params: { date_from?: string; date_to?: string; session?: string },
): ActivitySummary {
  const mp = LOCAL_MPS.find((m) => m.id === mpId);
  if (!mp) throw new Error("MP not found");

  const fromD = params.date_from;
  const toD = params.date_to;
  const session = params.session;

  const filteredAtt = LOCAL_ATTENDANCE.filter(
    (r) =>
      r.mp_id === mpId &&
      (!session || r.parliament_session === session) &&
      (!fromD || r.sitting_date >= fromD) &&
      (!toD || r.sitting_date <= toD),
  );

  const seenSittings = new Set<string>();
  let present = 0;
  let absent = 0;
  let missing = 0;
  for (const r of filteredAtt) {
    if (!seenSittings.has(r.sitting_id)) {
      seenSittings.add(r.sitting_id);
      if (r.recorded_status === "present") present++;
      else if (r.recorded_status === "absent") absent++;
      else if (r.recorded_status === "missing_data") missing++;
    }
  }

  let eligibleSittingDays: number | null = null;
  if (LOCAL_MEMBERSHIPS.length > 0 && LOCAL_SITTINGS.length > 0) {
    const mems = LOCAL_MEMBERSHIPS.filter((m) => m.mp_id === mpId);
    const sittings = LOCAL_SITTINGS.filter(
      (s) =>
        (!session || s.parliament_session === session) &&
        s.sitting_type === "House" &&
        (!fromD || s.sitting_date >= fromD) &&
        (!toD || s.sitting_date <= toD),
    );
    let count = 0;
    for (const sit of sittings) {
      for (const mem of mems) {
        if (mem.parliament_session !== sit.parliament_session) continue;
        if (sit.sitting_date < mem.joined_date) continue;
        if (mem.left_date && sit.sitting_date > mem.left_date) continue;
        count++;
        break;
      }
    }
    eligibleSittingDays = count;
  }

  const knownTotal = present + absent;
  const attendanceRate = knownTotal > 0 ? Math.round((present / knownTotal) * 1000) / 10 : null;

  let speeches = LOCAL_SPEECHES.filter((s) => s.speaker_id === mpId);
  if (session) {
    speeches = speeches.filter((s) => s.session_name === session || s.session_name.includes(session));
  }
  if (fromD) speeches = speeches.filter((s) => s.sitting_date >= fromD);
  if (toD) speeches = speeches.filter((s) => s.sitting_date <= toD);

  const seenSpeechIds = new Set<string>();
  const dedupedSpeeches = [];
  for (const s of speeches) {
    if (!seenSpeechIds.has(s.id)) {
      seenSpeechIds.add(s.id);
      dedupedSpeeches.push(s);
    }
  }

  const topicCounts: Record<string, number> = {};
  for (const s of dedupedSpeeches) {
    topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
  }
  const topics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));

  const indexedSessions = Array.from(new Set(dedupedSpeeches.map((s) => s.session_name))).sort();

  return {
    mp_id: mpId,
    mp_name: mp.name,
    party: mp.party,
    district: mp.district,
    current_role: mp.current_role,
    memberships: LOCAL_MEMBERSHIPS.filter((m) => m.mp_id === mpId).map((m) => ({
      parliament_session: m.parliament_session,
      joined_date: m.joined_date,
      left_date: m.left_date,
    })),
    filters_applied: {
      date_from: fromD || null,
      date_to: toD || null,
      session: session || null,
    },
    attendance: {
      available: LOCAL_ATTENDANCE.length > 0,
      present,
      absent,
      missing_data: missing,
      eligible_sitting_days: eligibleSittingDays,
      attendance_rate: attendanceRate,
      rate_denominator_label: `${knownTotal} sittings with known status (present or absent)`,
      coverage_note:
        LOCAL_ATTENDANCE.length > 0
          ? `Attendance rate uses recorded present/absent statuses only. ${missing} sittings have missing data and are excluded from the rate.`
          : "Attendance records are not yet available for this dataset.",
    },
    speeches: {
      count: dedupedSpeeches.length,
      label: "Speeches in indexed records",
      coverage_note: "This count covers only the records indexed in this dataset, not the member's full parliamentary activity.",
      indexed_sessions: indexedSessions,
      topics,
      topics_note: "Each speech is counted under exactly one topic in this dataset.",
    },
    dataset_note: "Demo workspace. Records are synthetic examples and have not been verified.",
    loaded_at: null,
  };
}

function computeLocalAttendance(
  mpId: string,
  params: { date_from?: string; date_to?: string; session?: string; status?: string; page?: number },
): AttendancePage {
  const fromD = params.date_from;
  const toD = params.date_to;
  const session = params.session;
  const status = params.status;
  const page = Math.max(1, params.page || 1);
  const pageSize = 50;

  const filtered = LOCAL_ATTENDANCE.filter(
    (r) =>
      r.mp_id === mpId &&
      (!session || r.parliament_session === session) &&
      (!fromD || r.sitting_date >= fromD) &&
      (!toD || r.sitting_date <= toD) &&
      (!status || r.recorded_status === status),
  );

  const seen = new Set<string>();
  const deduped = [];
  const sorted = [...filtered].sort((a, b) => b.sitting_date.localeCompare(a.sitting_date));
  for (const r of sorted) {
    if (!seen.has(r.sitting_id)) {
      seen.add(r.sitting_id);
      deduped.push(r);
    }
  }

  const start = (page - 1) * pageSize;
  const pageRecords = deduped.slice(start, start + pageSize);

  return {
    available: LOCAL_ATTENDANCE.length > 0,
    records: pageRecords,
    total: deduped.length,
    page,
    page_size: pageSize,
    note: "Missing-data status means the record exists but attendance was not determinable from the source.",
  };
}

function computeLocalSpeeches(
  mpId: string,
  params: { date_from?: string; date_to?: string; session?: string; topic?: string; search?: string; page?: number },
): SpeechPage {
  const fromD = params.date_from;
  const toD = params.date_to;
  const session = params.session;
  const topic = params.topic;
  const search = params.search ? params.search.toLowerCase() : "";
  const page = Math.max(1, params.page || 1);
  const pageSize = 20;

  let speeches = LOCAL_SPEECHES.filter((s) => s.speaker_id === mpId);
  if (session) speeches = speeches.filter((s) => s.session_name.includes(session));
  if (fromD) speeches = speeches.filter((s) => s.sitting_date >= fromD);
  if (toD) speeches = speeches.filter((s) => s.sitting_date <= toD);
  if (topic) speeches = speeches.filter((s) => s.topic.toLowerCase() === topic.toLowerCase());
  if (search) {
    speeches = speeches.filter(
      (s) =>
        s.title.toLowerCase().includes(search) ||
        s.summary.toLowerCase().includes(search) ||
        s.topic.toLowerCase().includes(search) ||
        s.segments.some((seg) => seg.text_en.toLowerCase().includes(search)),
    );
  }

  const seen = new Set<string>();
  const deduped = [];
  const sorted = [...speeches].sort((a, b) => b.sitting_date.localeCompare(a.sitting_date));
  for (const s of sorted) {
    if (!seen.has(s.id)) {
      seen.add(s.id);
      deduped.push({
        id: s.id,
        title: s.title,
        sitting_date: s.sitting_date,
        session_name: s.session_name,
        topic: s.topic,
        summary: s.summary,
        hansard_vol: s.hansard_vol,
        hansard_page: s.hansard_page,
        hansard_pdf_url: s.hansard_pdf_url,
        duration: s.duration,
        has_audio: Boolean(s.video_url || (s.segments && s.segments.length > 0)),
      });
    }
  }

  const start = (page - 1) * pageSize;
  const pageSpeeches = deduped.slice(start, start + pageSize);

  return {
    speeches: pageSpeeches,
    total: deduped.length,
    page,
    page_size: pageSize,
    label: "Speeches in indexed records",
    coverage_note: "This list covers only the records indexed in this dataset.",
  };
}

export const CivicApi = {
  getStats: () => request<DashboardStats>("/stats"),
  getMPs: () => request<MP[]>("/mps"),
  getSpeeches: () => request<Speech[]>("/speeches"),
  getCommitments: () => request<Commitment[]>("/commitments"),
  getTimelines: () => request<IssueTimeline[]>("/timelines"),
  compareLeaders: (leaderIds: string[], topics?: string[]) =>
    request<{
      leaders: MP[];
      criteria: Array<{ topic: string; speeches: Record<string, number> }>;
    }>("/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leader_ids: leaderIds, topics }),
    }),
  askAssistant: async (question: string): Promise<ChatResponse> => {
    try {
      return await request<ChatResponse>("/rag/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question, question }),
      });
    } catch {
      try {
        return await request<ChatResponse>("/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: question, question }),
        });
      } catch {
        // Local fallback when running offline
        const qLower = question.toLowerCase();
        const matches = LOCAL_SPEECHES.filter(
          (s) =>
            s.title.toLowerCase().includes(qLower) ||
            s.topic.toLowerCase().includes(qLower) ||
            s.speaker_name.toLowerCase().includes(qLower) ||
            s.summary.toLowerCase().includes(qLower),
        ).slice(0, 3);

        const answer = matches.length
          ? `Indexed parliamentary records show ${matches.map((m) => `${m.speaker_name} on ${m.sitting_date} (${m.topic})`).join("; ")}.`
          : `No matching records found in this dataset for "${question}". Try an MP name like "Dr. Harsha de Silva" or a policy topic like "Taxation".`;

        return {
          answer,
          citations: matches.map((m) => ({
            title: m.title,
            source_type: "Hansard",
            ref_code: `${m.hansard_vol}, p. ${m.hansard_page}`,
            url: m.hansard_pdf_url,
            speech_id: m.id,
            confidence_score: 75,
          })),
          confidence_score: matches.length ? 75 : 0,
          grounded_claim_count: matches.length,
          missing_evidence_flags: ["Local offline demonstration mode."],
          suggested_queries: matches.map((m) => `What did ${m.speaker_name} say about ${m.topic}?`),
        };
      }
    }
  },
  searchParliament: (query: string, language: "en" | "si" | "ta" = "en") =>
    request<{ results: Array<{ type: string; title: string; snippet: string; link: string }> }>("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language }),
    }),
  getMPActivity: async (
    mpId: string,
    params: { date_from?: string; date_to?: string; session?: string },
    signal?: AbortSignal,
  ): Promise<ActivitySummary> => {
    const q = new URLSearchParams();
    if (params.date_from) q.set("date_from", params.date_from);
    if (params.date_to) q.set("date_to", params.date_to);
    if (params.session) q.set("session", params.session);
    const qs = q.toString();
    try {
      return await request<ActivitySummary>(`/mps/${mpId}/activity${qs ? "?" + qs : ""}`, { signal });
    } catch (err: any) {
      if (signal?.aborted) throw err;
      return computeLocalActivity(mpId, params);
    }
  },
  getMPAttendance: async (
    mpId: string,
    params: { date_from?: string; date_to?: string; session?: string; status?: string; page?: number },
    signal?: AbortSignal,
  ): Promise<AttendancePage> => {
    const q = new URLSearchParams();
    if (params.date_from) q.set("date_from", params.date_from);
    if (params.date_to) q.set("date_to", params.date_to);
    if (params.session) q.set("session", params.session);
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    try {
      return await request<AttendancePage>(`/mps/${mpId}/attendance${qs ? "?" + qs : ""}`, { signal });
    } catch (err: any) {
      if (signal?.aborted) throw err;
      return computeLocalAttendance(mpId, params);
    }
  },
  getMPSpeeches: async (
    mpId: string,
    params: { date_from?: string; date_to?: string; session?: string; topic?: string; search?: string; page?: number },
    signal?: AbortSignal,
  ): Promise<SpeechPage> => {
    const q = new URLSearchParams();
    if (params.date_from) q.set("date_from", params.date_from);
    if (params.date_to) q.set("date_to", params.date_to);
    if (params.session) q.set("session", params.session);
    if (params.topic) q.set("topic", params.topic);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", String(params.page));
    const qs = q.toString();
    try {
      return await request<SpeechPage>(`/mps/${mpId}/speeches${qs ? "?" + qs : ""}`, { signal });
    } catch (err: any) {
      if (signal?.aborted) throw err;
      return computeLocalSpeeches(mpId, params);
    }
  },
  getEvidenceTrail: async (
    recordId: string,
    params: {
      event_type?: string;
      date_from?: string;
      date_to?: string;
      include_unreviewed?: boolean;
      page?: number;
      page_size?: number;
    } = {},
    signal?: AbortSignal,
  ): Promise<EvidenceTrailResponse> => {
    const q = new URLSearchParams();
    if (params.event_type) q.set("event_type", params.event_type);
    if (params.date_from) q.set("date_from", params.date_from);
    if (params.date_to) q.set("date_to", params.date_to);
    if (params.include_unreviewed) q.set("include_unreviewed", "true");
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString();
    try {
      return await request<EvidenceTrailResponse>(
        `/evidence-trails/${encodeURIComponent(recordId)}${qs ? "?" + qs : ""}`,
        { signal },
      );
    } catch (err: any) {
      if (signal?.aborted) throw err;
      return computeLocalEvidenceTrail(recordId, params);
    }
  },
  getTrailEvent: async (
    eventId: string,
    signal?: AbortSignal,
  ): Promise<{
    event: TrailEvent;
    relationships: TrailRelationship[];
    linked_speeches: any[];
    source_summary: any;
  }> => {
    try {
      return await request(`/trail-events/${encodeURIComponent(eventId)}`, { signal });
    } catch (err: any) {
      if (signal?.aborted) throw err;
      const event = LOCAL_TRAIL_EVENTS.find((e) => e.id === eventId);
      if (!event) throw new Error("Event not found");
      const rels = LOCAL_TRAIL_RELATIONSHIPS.filter((r) => r.to_record_id === eventId);
      const speeches = LOCAL_SPEECHES.filter((s) => event.linked_source_ids.includes(s.id));
      return {
        event,
        relationships: rels,
        linked_speeches: speeches.map((s) => ({
          id: s.id,
          title: s.title,
          speaker_name: s.speaker_name,
          sitting_date: s.sitting_date,
          hansard_vol: s.hansard_vol,
          hansard_page: s.hansard_page,
          hansard_pdf_url: s.hansard_pdf_url,
          has_audio: Boolean(s.video_url || s.segments?.length),
        })),
        source_summary: {
          source_type: event.source_type,
          source_ref: event.source_ref,
          source_url: event.source_url,
          source_available: event.source_available,
          supporting_passage: event.supporting_passage,
          recording_interval: event.recording_interval,
          status_note: event.source_available && event.source_url
            ? "Verified primary document citation."
            : "Primary source cited in archives but direct electronic document is unavailable.",
        },
      };
    }
  },
};

export const api = CivicApi;

function formatLocalSupports(eventType: string): string {
  const map: Record<string, string> = {
    parliamentary_question: "A formal parliamentary question was tabled and recorded in Hansard.",
    ministry_response: "A government or ministry response was officially recorded.",
    further_debate: "Subsequent parliamentary debate was documented on the official record.",
    bill_amendment: "A legislative bill or amendment was officially tabled. Note: Introduction does not imply passage.",
    recorded_vote: "A recorded division vote was taken in Parliament.",
    budget_allocation: "A budget allocation was approved. Note: Allocation authorizes funding but does not verify disbursement.",
    implementation_report: "An official implementation report or gazette was published.",
    outcome_indicator: "A published socio-economic outcome indicator was recorded. Note: Macro indicators reflect multiple systemic factors and cannot be attributed to a single actor.",
    correction_withdrawal: "A formal correction or withdrawal was submitted on the parliamentary record.",
  };
  return map[eventType] || "A follow-up event was recorded in indexed sources.";
}

export function computeLocalEvidenceTrail(
  recordId: string,
  params: {
    event_type?: string;
    date_from?: string;
    date_to?: string;
    include_unreviewed?: boolean;
    page?: number;
    page_size?: number;
  } = {},
): EvidenceTrailResponse {
  const speech = LOCAL_SPEECHES.find((s) => s.id === recordId);
  const commitment = LOCAL_COMMITMENTS.find((c) => c.id === recordId);

  let origin: EvidenceTrailSummary;
  if (speech) {
    const passage = speech.segments?.[0]?.text_en || speech.summary;
    origin = {
      record_id: speech.id,
      record_kind: "speech",
      title: speech.title,
      speaker_or_sponsor: speech.speaker_name,
      party: speech.party,
      role_or_org: speech.speaker_role,
      date: speech.sitting_date,
      date_precision: "day",
      original_quote_or_passage: passage,
      source_ref: `${speech.hansard_vol}, pp. ${speech.hansard_page}`,
      source_url: speech.hansard_pdf_url,
      coverage_start: "2023-01-01",
      coverage_end: "2024-12-31",
      latest_update: "2025-01-20",
      coverage_note: "Indexed parliamentary sessions cover 9th Parliament 4th Session (2023–2024).",
    };
  } else if (commitment) {
    origin = {
      record_id: commitment.id,
      record_kind: "commitment",
      title: commitment.title,
      speaker_or_sponsor: commitment.sponsor_name,
      party: commitment.party,
      role_or_org: `Manifesto Year ${commitment.manifesto_year}`,
      date: `${commitment.manifesto_year}-01-01`,
      date_precision: "year",
      original_quote_or_passage: commitment.original_quote,
      source_ref: commitment.manifesto_source,
      source_url: commitment.timeline?.[0]?.source_url || null,
      coverage_start: `${commitment.manifesto_year}-01-01`,
      coverage_end: "2025-01-31",
      latest_update: "2025-01-20",
      coverage_note: "Indexed follow-ups cover related Hansard debates, recorded votes, gazettes, and official statistical releases.",
    };
  } else {
    throw new Error(`Record ${recordId} not found in speeches or commitments`);
  }

  const matchingRels = LOCAL_TRAIL_RELATIONSHIPS.filter(
    (r) => r.from_record_id === recordId,
  );

  const acceptedItems: TrailItem[] = [];
  const unreviewedItems: TrailItem[] = [];

  for (const rel of matchingRels) {
    const event = LOCAL_TRAIL_EVENTS.find((e) => e.id === rel.to_record_id);
    if (!event) continue;

    if (params.event_type && event.event_type.toLowerCase() !== params.event_type.toLowerCase()) {
      continue;
    }
    if (params.date_from && event.date < params.date_from) {
      continue;
    }
    if (params.date_to && event.date > params.date_to) {
      continue;
    }

    const linkedSpeechObj = event.linked_source_ids.length
      ? LOCAL_SPEECHES.find((s) => event.linked_source_ids.includes(s.id))
      : null;

    const trailItem: TrailItem = {
      event,
      relationship: rel,
      supports_statement: formatLocalSupports(event.event_type),
      linked_speech: linkedSpeechObj
        ? {
            id: linkedSpeechObj.id,
            title: linkedSpeechObj.title,
            speaker_name: linkedSpeechObj.speaker_name,
            sitting_date: linkedSpeechObj.sitting_date,
            hansard_vol: linkedSpeechObj.hansard_vol,
            hansard_page: linkedSpeechObj.hansard_page,
            hansard_pdf_url: linkedSpeechObj.hansard_pdf_url,
            has_audio: Boolean(linkedSpeechObj.video_url || linkedSpeechObj.segments?.length),
          }
        : null,
    };

    if (rel.review_state === "accepted") {
      acceptedItems.push(trailItem);
    } else if (rel.review_state === "proposed") {
      unreviewedItems.push(trailItem);
    }
  }

  acceptedItems.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.event.id.localeCompare(b.event.id));
  unreviewedItems.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.event.id.localeCompare(b.event.id));

  let coverageStatus: EvidenceTrailResponse["coverage_status"] = "no_linked_records";
  let coverageExplanation = "No later linked evidence is available in the indexed sources for this record.";

  if (acceptedItems.length > 0) {
    coverageStatus = "covered_with_events";
    coverageExplanation = `Found ${acceptedItems.length} documented follow-up events indexed in official records.`;
  } else if (unreviewedItems.length > 0) {
    coverageStatus = "unreviewed_only";
    coverageExplanation = `No accepted follow-up records. ${unreviewedItems.length} candidate suggestion(s) are awaiting review.`;
  }

  const page = params.page || 1;
  const pageSize = params.page_size || 50;
  const start = (page - 1) * pageSize;
  const pagedAccepted = acceptedItems.slice(start, start + pageSize);

  return {
    origin,
    established_trail: pagedAccepted,
    unreviewed_suggestions: params.include_unreviewed ? unreviewedItems : [],
    total_accepted: acceptedItems.length,
    total_unreviewed: unreviewedItems.length,
    page,
    page_size: pageSize,
    coverage_status: coverageStatus,
    coverage_explanation: coverageExplanation,
    filters_applied: {
      event_type: params.event_type || null,
      date_from: params.date_from || null,
      date_to: params.date_to || null,
      include_unreviewed: Boolean(params.include_unreviewed),
    },
    disclaimer:
      "Evidence shows documented parliamentary and administrative actions. Existence of follow-up does not prove implementation completion, nor does absence of indexed records prove inaction.",
  };
}

