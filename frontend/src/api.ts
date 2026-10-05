import type {
  DashboardStats,
  MP,
  Speech,
  Commitment,
  IssueTimeline,
  ChatResponse,
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
export const CivicApi = {
  getStats: () => request<DashboardStats>("/stats"),
  getMPs: () => request<MP[]>("/mps"),
  getSpeeches: () => request<Speech[]>("/speeches"),
  getCommitments: () => request<Commitment[]>("/commitments"),
  getTimelines: () => request<IssueTimeline[]>("/timelines"),
  askChat: (query: string, language = "en") =>
    request<ChatResponse>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, language }),
    }),
};
