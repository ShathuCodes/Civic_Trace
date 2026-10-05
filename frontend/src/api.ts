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
export interface Workspace {
  mps: MP[];
  speeches: Speech[];
  commitments: Commitment[];
  timelines: IssueTimeline[];
  meta: {
    mode: "demo" | "mongodb";
    loaded_at: string | null;
    verification: string;
    snapshot: boolean;
  };
}
export const DEMO_WORKSPACE: Workspace = {
  mps: LOCAL_MPS,
  speeches: LOCAL_SPEECHES,
  commitments: LOCAL_COMMITMENTS,
  timelines: LOCAL_TIMELINES,
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
  askAssistant: (question: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
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
};
