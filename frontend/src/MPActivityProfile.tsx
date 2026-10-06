/**
 * MPActivityProfile – evidence-backed activity profile for a single MP.
 *
 * Design rules enforced here:
 *  - Attendance rate denominator is labelled explicitly (present / (present+absent)).
 *  - Missing-data sittings are shown as a distinct count, never as absent.
 *  - Absence is never inferred from having no speech.
 *  - Speech count is deduplicated by speech ID (no transcript chunks, no translations).
 *  - Duration is not shown – no reliable timestamps exist in this dataset.
 *  - No overall quality score or effectiveness interpretation.
 *  - All counts that promise drill-down open the corresponding records.
 *  - Filters are kept in component state (URL persistence is managed by the parent via
 *    the existing hash-router convention; parent passes initialSession prop).
 *  - Stale requests cancelled via AbortController on filter change.
 *  - Trilingual transcript controls are preserved in speech detail (handed back to parent).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Search,
  SlidersHorizontal,
  Volume2,
  X,
} from "lucide-react";
import { CivicApi } from "./api";
import type {
  MP,
  ActivitySummary,
  AttendancePage,
  AttendanceRecord,
  SpeechPage,
  SpeechSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(value: string) {
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.valueOf())
    ? value
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name
    .replace(/^(Dr\.|Hon\.)\s*/, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function safeUrl(value: string | null | undefined) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

// Status label text and accessible symbol (not colour-only)
function statusLabel(status: string): { label: string; symbol: string; className: string } {
  if (status === "present") return { label: "Present", symbol: "✓", className: "att-present" };
  if (status === "absent") return { label: "Absent", symbol: "✗", className: "att-absent" };
  if (status === "missing_data") return { label: "Missing data", symbol: "?", className: "att-missing" };
  // verbatim official category
  return { label: status, symbol: "·", className: "att-other" };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AttendanceBadge({ status }: { status: string }) {
  const { label, symbol, className } = statusLabel(status);
  return (
    <span className={`att-badge ${className}`} aria-label={label} title={label}>
      <span aria-hidden="true">{symbol}</span> {label}
    </span>
  );
}

function CoverageNote({ children }: { children: ReactNode }) {
  return <p className="ap-coverage-note">{children}</p>;
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="inline-note" role="note">
      {children}
    </div>
  );
}

function LoadingRows({ n = 3 }: { n?: number }) {
  return (
    <div className="ap-loading" role="status" aria-label="Loading records">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton ap-skeleton-row" />
      ))}
    </div>
  );
}

function ErrorRow({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="ap-error-row" role="alert">
      <AlertCircle size={16} />
      <span>{message}</span>
      <button className="text-link" onClick={onRetry}>
        Retry <ArrowRight size={13} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attendance tab
// ---------------------------------------------------------------------------

function AttendanceTab({
  mpId,
  filters,
}: {
  mpId: string;
  filters: ProfileFilters;
}) {
  const [data, setData] = useState<AttendancePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    CivicApi.getMPAttendance(
      mpId,
      {
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        session: filters.session || undefined,
        status: statusFilter || undefined,
        page,
      },
      ctrl.signal,
    )
      .then((d) => {
        if (!ctrl.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setError(e?.message || "Failed to load attendance records.");
          setLoading(false);
        }
      });
  }, [mpId, filters, page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [filters, statusFilter]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  if (loading) return <LoadingRows n={4} />;
  if (error) return <ErrorRow message={error} onRetry={load} />;
  if (!data) return null;

  if (!data.available) {
    return (
      <InfoBox>
        Attendance records are not yet available for this dataset. When attendance
        data is connected, this tab will show sitting-by-sitting records with
        source links.
      </InfoBox>
    );
  }

  const totalPages = Math.ceil(data.total / data.page_size);

  return (
    <div className="ap-tab-content">
      <div className="ap-sub-filter">
        <label htmlFor="att-status-filter" className="sr-only">
          Filter by status
        </label>
        <SlidersHorizontal size={14} />
        <select
          id="att-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="missing_data">Missing data</option>
        </select>
        <span className="result-count">{data.total} sittings</span>
      </div>
      <CoverageNote>{data.note}</CoverageNote>

      {data.records.length === 0 ? (
        <div className="empty">
          <Search size={22} />
          <h3>No attendance records</h3>
          <p>
            No records match the current filters. Try clearing the date range or
            status filter.
          </p>
        </div>
      ) : (
        <div className="ap-att-list" role="list">
          {data.records.map((r) => (
            <AttendanceRow key={r.sitting_id} record={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="ap-pagination">
          <button
            className="button small-button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ArrowLeft size={14} /> Prev
          </button>
          <span className="ap-page-label">
            Page {page} of {totalPages}
          </span>
          <button
            className="button small-button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            Next <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  const href = safeUrl(record.source_url);
  return (
    <div className="ap-att-row" role="listitem">
      <div className="ap-att-meta">
        <CalendarDays size={13} />
        <span>{fmtDate(record.sitting_date)}</span>
        <span className="muted ap-session-label">{record.parliament_session}</span>
      </div>
      <div className="ap-att-detail">
        <AttendanceBadge status={record.recorded_status} />
        {record.source_doc_id && (
          <span className="ap-source-ref">
            <FileText size={12} /> {record.source_doc_id}
          </span>
        )}
        {href ? (
          <a
            href={href}
            className="source-link ap-source-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source <ArrowUpRight size={12} />
          </a>
        ) : (
          <span className="muted ap-no-source">Source not recorded</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Speeches tab
// ---------------------------------------------------------------------------

function SpeechesTab({
  mpId,
  filters,
  onOpenSpeech,
  activeTopic,
  onTopicClear,
}: {
  mpId: string;
  filters: ProfileFilters;
  onOpenSpeech: (speechId: string) => void;
  activeTopic: string;
  onTopicClear: () => void;
}) {
  const [data, setData] = useState<SpeechPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError("");
    CivicApi.getMPSpeeches(
      mpId,
      {
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        session: filters.session || undefined,
        topic: activeTopic || undefined,
        search: search || undefined,
        page,
      },
      ctrl.signal,
    )
      .then((d) => {
        if (!ctrl.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setError(e?.message || "Failed to load speeches.");
          setLoading(false);
        }
      });
  }, [mpId, filters, page, search, activeTopic]);

  useEffect(() => {
    setPage(1);
  }, [filters, search, activeTopic]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

  return (
    <div className="ap-tab-content">
      <form
        className="ap-speech-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput);
        }}
      >
        <Search size={15} />
        <input
          aria-label="Search speeches"
          placeholder="Search titles, topics, summaries…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            type="button"
            className="icon-button"
            aria-label="Clear speech search"
            onClick={() => {
              setSearchInput("");
              setSearch("");
            }}
          >
            <X size={14} />
          </button>
        )}
        <button type="submit" className="button small-button">
          Search
        </button>
      </form>

      {activeTopic && (
        <div className="ap-topic-chip">
          <span>
            Filtered by topic: <strong>{activeTopic}</strong>
          </span>
          <button
            className="icon-button"
            aria-label="Clear topic filter"
            onClick={onTopicClear}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loading ? (
        <LoadingRows n={3} />
      ) : error ? (
        <ErrorRow message={error} onRetry={load} />
      ) : !data || data.speeches.length === 0 ? (
        <div className="empty">
          <Search size={22} />
          <h3>No speeches found</h3>
          <p>Try clearing the search or topic filter, or widen the date range.</p>
        </div>
      ) : (
        <>
          <div className="ap-speech-meta">
            <span className="result-count">
              {data.total} {data.label}
            </span>
            <CoverageNote>{data.coverage_note}</CoverageNote>
          </div>
          <div className="ap-speech-list">
            {data.speeches.map((s) => (
              <SpeechRow key={s.id} speech={s} onOpen={onOpenSpeech} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="ap-pagination">
              <button
                className="button small-button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ArrowLeft size={14} /> Prev
              </button>
              <span className="ap-page-label">
                Page {page} of {totalPages}
              </span>
              <button
                className="button small-button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SpeechRow({
  speech,
  onOpen,
}: {
  speech: SpeechSummary;
  onOpen: (id: string) => void;
}) {
  const href = safeUrl(speech.hansard_pdf_url);
  return (
    <div className="ap-speech-row record-row">
      <div className="document-icon">
        <FileText size={17} />
      </div>
      <button className="row-main" onClick={() => onOpen(speech.id)}>
        <span className="meta">
          <span>{speech.topic}</span>
          <span>{fmtDate(speech.sitting_date)}</span>
          {speech.has_audio && (
            <span className="ap-audio-pill" title="Audio recording available (timestamps are supplied records, unverified alignment)">
              <Volume2 size={11} /> Audio available
            </span>
          )}
        </span>
        <h3 className="ap-speech-title">{speech.title}</h3>
        {speech.summary && (
          <p className="ap-speech-excerpt muted small">{speech.summary}</p>
        )}
        <span className="muted small">{speech.session_name}</span>
      </button>
      {href && (
        <a
          href={href}
          className="source-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open Hansard source for: ${speech.title}`}
        >
          Hansard <ArrowUpRight size={12} />
        </a>
      )}
      <ChevronRight size={15} className="row-chevron" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topics section
// ---------------------------------------------------------------------------

function TopicsSection({
  topics,
  topicsNote,
  activeTopic,
  onTopicClick,
}: {
  topics: Array<{ topic: string; count: number }>;
  topicsNote: string;
  activeTopic: string;
  onTopicClick: (topic: string) => void;
}) {
  if (topics.length === 0) return null;
  const max = topics[0].count;
  return (
    <div className="ap-topics">
      <h3 className="ap-section-title">Topics discussed</h3>
      <p className="muted small">{topicsNote}</p>
      <ul className="ap-topic-list" aria-label="Topics discussed – click to filter speeches">
        {topics.map(({ topic, count }) => (
          <li key={topic}>
            <button
              className={`ap-topic-btn ${activeTopic === topic ? "ap-topic-active" : ""}`}
              onClick={() => onTopicClick(topic === activeTopic ? "" : topic)}
              aria-pressed={activeTopic === topic}
            >
              <span className="ap-topic-name">{topic}</span>
              <span className="ap-topic-bar-wrap" aria-hidden="true">
                <span
                  className="ap-topic-bar"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </span>
              <span className="ap-topic-count">{count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main profile component
// ---------------------------------------------------------------------------

export type ProfileFilters = {
  dateFrom: string;
  dateTo: string;
  session: string;
};

type Tab = "attendance" | "speeches";

interface MPActivityProfileProps {
  mp: MP;
  initialFilters?: Partial<ProfileFilters>;
  onClose: () => void;
  onOpenSpeech: (speechId: string) => void;
}

export function MPActivityProfile({
  mp,
  initialFilters = {},
  onClose,
  onOpenSpeech,
}: MPActivityProfileProps) {
  const [filters, setFilters] = useState<ProfileFilters>({
    dateFrom: initialFilters.dateFrom ?? "",
    dateTo: initialFilters.dateTo ?? "",
    session: initialFilters.session ?? "",
  });
  const [pendingFilters, setPendingFilters] = useState(filters);
  const [tab, setTab] = useState<Tab>("attendance");
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const summaryAbortRef = useRef<AbortController | null>(null);

  // Validate date range client-side
  const dateRangeError =
    pendingFilters.dateFrom &&
    pendingFilters.dateTo &&
    pendingFilters.dateFrom > pendingFilters.dateTo
      ? "Start date must not be later than end date."
      : "";

  const applyFilters = () => {
    if (dateRangeError) return;
    setFilters(pendingFilters);
    setActiveTopic("");
  };

  const clearFilters = () => {
    const blank = { dateFrom: "", dateTo: "", session: "" };
    setPendingFilters(blank);
    setFilters(blank);
    setActiveTopic("");
  };

  // Load summary when filters change
  useEffect(() => {
    summaryAbortRef.current?.abort();
    const ctrl = new AbortController();
    summaryAbortRef.current = ctrl;
    setSummaryLoading(true);
    setSummaryError("");
    CivicApi.getMPActivity(
      mp.id,
      {
        date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined,
        session: filters.session || undefined,
      },
      ctrl.signal,
    )
      .then((d) => {
        if (!ctrl.signal.aborted) {
          setSummary(d);
          setSummaryLoading(false);
        }
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) {
          setSummaryError(e?.message || "Could not load activity summary.");
          setSummaryLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [mp.id, filters]);

  const att = summary?.attendance;
  const spe = summary?.speeches;

  return (
    <div className="ap-profile">
      {/* Header */}
      <div className="ap-header">
        <button
          className="icon-button ap-back"
          onClick={onClose}
          aria-label="Return to People & profiles"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ap-identity">
          <span className="avatar profile-avatar">{initials(mp.name)}</span>
          <div>
            <h2 className="ap-name">{mp.name}</h2>
            <p className="ap-meta">
              {mp.party} · {mp.district}
            </p>
            <p className="ap-role muted">{mp.current_role}</p>
            {summary?.memberships && summary.memberships.length > 0 && (
              <div className="ap-memberships" aria-label="Parliamentary membership terms">
                {summary.memberships.map((m) => (
                  <span key={m.parliament_session} className="ap-membership-badge">
                    {m.parliament_session}: {fmtDate(m.joined_date)} – {m.left_date ? fmtDate(m.left_date) : "Present"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dataset notice */}
      {summary && (
        <p className="ap-dataset-note muted small">{summary.dataset_note}</p>
      )}

      {/* Filters */}
      <details className="ap-filters">
        <summary className="ap-filter-summary">
          <SlidersHorizontal size={14} />
          <span>Filters</span>
          {(filters.dateFrom || filters.dateTo || filters.session) && (
            <span className="ap-filter-active-dot" aria-label="Filters active" />
          )}
          <ChevronDown size={14} className="ap-filter-chevron" />
        </summary>
        <div className="ap-filter-body">
          {/* Quick presets */}
          <div className="ap-presets-row" role="group" aria-label="Date range quick presets">
            <span className="muted small">Quick range:</span>
            <button
              type="button"
              className="ap-preset-btn"
              onClick={() => {
                const blank = { dateFrom: "", dateTo: "", session: "" };
                setPendingFilters(blank);
                setFilters(blank);
              }}
            >
              All time
            </button>
            <button
              type="button"
              className="ap-preset-btn"
              onClick={() => {
                const s = "9th Parliament 4th Session";
                setPendingFilters({ dateFrom: "", dateTo: "", session: s });
                setFilters({ dateFrom: "", dateTo: "", session: s });
              }}
            >
              This session
            </button>
            <button
              type="button"
              className="ap-preset-btn"
              onClick={() => {
                const oneYearAgo = "2023-05-01";
                setPendingFilters((f) => ({ ...f, dateFrom: oneYearAgo, dateTo: "" }));
                setFilters((f) => ({ ...f, dateFrom: oneYearAgo, dateTo: "" }));
              }}
            >
              Past year
            </button>
          </div>
          <div className="ap-filter-row">
            <label htmlFor="ap-date-from">From</label>
            <input
              id="ap-date-from"
              type="date"
              value={pendingFilters.dateFrom}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, dateFrom: e.target.value }))
              }
            />
            <label htmlFor="ap-date-to">To</label>
            <input
              id="ap-date-to"
              type="date"
              value={pendingFilters.dateTo}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, dateTo: e.target.value }))
              }
            />
          </div>
          <div className="ap-filter-row">
            <label htmlFor="ap-session">Parliament / Session</label>
            <input
              id="ap-session"
              type="text"
              placeholder="e.g. 9th Parliament 4th Session"
              value={pendingFilters.session}
              onChange={(e) =>
                setPendingFilters((f) => ({ ...f, session: e.target.value }))
              }
            />
          </div>
          {dateRangeError && (
            <p className="ap-filter-error" role="alert">
              {dateRangeError}
            </p>
          )}
          <div className="ap-filter-actions">
            <button
              className="button primary small-button"
              onClick={applyFilters}
              disabled={!!dateRangeError}
            >
              Apply
            </button>
            <button className="button small-button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </div>
      </details>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="skeleton-grid ap-summary-skeletons" role="status" aria-label="Loading summary">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      ) : summaryError ? (
        <div className="ap-error-row" role="alert">
          <AlertCircle size={16} />
          <span>{summaryError}</span>
          <button
            className="text-link"
            onClick={() => {
              setSummaryLoading(true);
              setSummaryError("");
              setFilters({ ...filters });
            }}
          >
            Retry <ArrowRight size={13} />
          </button>
        </div>
      ) : summary && att && spe ? (
        <>
          <div className="ap-summary-cards">
            {/* Attendance card */}
            <div className="ap-card">
              <span className="eyebrow">ATTENDANCE</span>
              {att.available ? (
                <>
                  <div className="ap-card-stats">
                    <div className="ap-stat">
                      <strong>{att.present}</strong>
                      <span>Present</span>
                    </div>
                    <div className="ap-stat">
                      <strong>{att.absent}</strong>
                      <span>Absent</span>
                    </div>
                    <div className="ap-stat ap-stat-missing">
                      <strong>{att.missing_data}</strong>
                      <span>Missing records</span>
                    </div>
                    {att.eligible_sitting_days !== null && (
                      <div className="ap-stat">
                        <strong>{att.eligible_sitting_days}</strong>
                        <span>Eligible days</span>
                      </div>
                    )}
                  </div>
                  {att.attendance_rate !== null ? (
                    <div className="ap-rate">
                      <span className="ap-rate-value">{att.attendance_rate}%</span>
                      <span className="ap-rate-label">
                        recorded rate · {att.rate_denominator_label}
                      </span>
                    </div>
                  ) : (
                    <p className="muted small">
                      Rate cannot be calculated (no present/absent records found).
                    </p>
                  )}
                  <p className="ap-coverage-note">{att.coverage_note}</p>
                </>
              ) : (
                <p className="muted small">{att.coverage_note}</p>
              )}
            </div>

            {/* Speeches card */}
            <div className="ap-card">
              <span className="eyebrow">{spe.label.toUpperCase()}</span>
              <div className="ap-card-stats">
                <div className="ap-stat">
                  <strong>{spe.count}</strong>
                  <span>Indexed speeches</span>
                </div>
              </div>
              <p className="ap-coverage-note">{spe.coverage_note}</p>
              {spe.indexed_sessions.length > 0 && (
                <div className="ap-sessions">
                  {spe.indexed_sessions.map((s) => (
                    <span key={s} className="ap-session-chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Dataset coverage card */}
            {summary.loaded_at && (
              <div className="ap-card">
                <span className="eyebrow">DATASET COVERAGE</span>
                <p className="muted small" style={{ marginTop: 10 }}>
                  Snapshot loaded{" "}
                  {new Date(summary.loaded_at).toLocaleString("en-GB")}.
                </p>
                <p className="muted small">
                  Showing records within:{" "}
                  {filters.dateFrom || filters.dateTo
                    ? `${filters.dateFrom || "any"} – ${filters.dateTo || "any"}`
                    : "All available dates"}
                  .
                </p>
                <p className="muted small">
                  {summary.dataset_note}
                </p>
              </div>
            )}
          </div>

          {/* Topics */}
          {spe.topics.length > 0 && (
            <TopicsSection
              topics={spe.topics}
              topicsNote={spe.topics_note}
              activeTopic={activeTopic}
              onTopicClick={(t) => {
                setActiveTopic(t);
                setTab("speeches");
              }}
            />
          )}
        </>
      ) : null}

      {/* Tabs */}
      <div className="ap-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "attendance"}
          className={`ap-tab ${tab === "attendance" ? "ap-tab-active" : ""}`}
          onClick={() => setTab("attendance")}
          id="tab-attendance"
          aria-controls="panel-attendance"
        >
          <CalendarDays size={15} /> Attendance
          {att?.available && att.present + att.absent + att.missing_data > 0 && (
            <span className="ap-tab-count">
              {att.present + att.absent + att.missing_data}
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={tab === "speeches"}
          className={`ap-tab ${tab === "speeches" ? "ap-tab-active" : ""}`}
          onClick={() => setTab("speeches")}
          id="tab-speeches"
          aria-controls="panel-speeches"
        >
          <FileText size={15} /> Speeches
          {spe && spe.count > 0 && (
            <span className="ap-tab-count">{spe.count}</span>
          )}
        </button>
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id="panel-attendance"
        aria-labelledby="tab-attendance"
        hidden={tab !== "attendance"}
      >
        {tab === "attendance" && (
          <AttendanceTab mpId={mp.id} filters={filters} />
        )}
      </div>
      <div
        role="tabpanel"
        id="panel-speeches"
        aria-labelledby="tab-speeches"
        hidden={tab !== "speeches"}
      >
        {tab === "speeches" && (
          <SpeechesTab
            mpId={mp.id}
            filters={filters}
            onOpenSpeech={onOpenSpeech}
            activeTopic={activeTopic}
            onTopicClear={() => setActiveTopic("")}
          />
        )}
      </div>

      {/* Footer note */}
      <div className="ap-footer-note">
        <Circle size={8} />
        Attendance rate = present ÷ (present + absent). Missing-data records
        are excluded from the rate and from the absent count. Do not interpret
        speech volume as expertise, effectiveness, or quality.
      </div>
    </div>
  );
}

export default MPActivityProfile;
