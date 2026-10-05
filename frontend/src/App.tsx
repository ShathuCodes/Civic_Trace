import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GitCompareArrows,
  Landmark,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  Users,
  X,
} from "lucide-react";
import { DEMO_WORKSPACE, loadWorkspace } from "./api";
import type { Workspace } from "./api";
import type { Commitment, MP, Speech } from "./types";

const STANDALONE_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

type Page =
  | "overview"
  | "speeches"
  | "commitments"
  | "compare"
  | "timelines"
  | "mps"
  | "saved";
type RecordKind = "speech" | "commitment" | "mp" | "timeline";
type Selection = { kind: RecordKind; id: string };
const pages: { id: Page; title: string; icon: typeof Search }[] = [
  { id: "overview", title: "Overview", icon: LayoutDashboard },
  { id: "speeches", title: "Speech explorer", icon: BookOpen },
  { id: "commitments", title: "Commitments", icon: FileText },
  { id: "compare", title: "Compare leaders", icon: GitCompareArrows },
  { id: "timelines", title: "Issue timelines", icon: Clock3 },
  { id: "mps", title: "People & profiles", icon: Users },
  { id: "saved", title: "Saved records", icon: Bookmark },
];
function readRoute() {
  const params = new URLSearchParams(location.hash.slice(1));
  const page = params.get("page") as Page;
  const kind = params.get("kind") as RecordKind;
  return {
    page: pages.some((p) => p.id === page) ? page : ("overview" as Page),
    query: params.get("q") || "",
    selection:
      ["speech", "commitment", "mp", "timeline"].includes(kind) &&
      params.get("id")
        ? { kind, id: params.get("id")! }
        : null,
  };
}
function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function safeUrl(value: string | undefined) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
function videoUrl(value: string, seconds = 0) {
  const safe = safeUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (["www.youtube.com", "youtube.com", "youtu.be"].includes(url.hostname))
    url.searchParams.set("t", `${Math.max(0, Math.floor(seconds))}s`);
  else url.hash = `t=${Math.max(0, Math.floor(seconds))}`;
  return url.href;
}
function date(value: string) {
  const d = new Date(value + "T00:00:00");
  return Number.isNaN(d.valueOf())
    ? value
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
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
function SourceLink({ url, children }: { url?: string; children: ReactNode }) {
  const href = safeUrl(url);
  return href ? (
    <a
      className="source-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={14} />
    </a>
  ) : (
    <span className="muted">Source link not supplied</span>
  );
}
function Empty({
  title = "No records found",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <Search size={25} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;
      const elements = Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ) || [],
      ).filter((el) => !el.hasAttribute("disabled"));
      const first = elements[0],
        last = elements.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`dialog ${wide ? "wide" : ""}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-head">
          <span className="eyebrow" id="dialog-title">
            {title}
          </span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="empty">
        <h1>This view could not load</h1>
        <p>
          The data may not match the expected format. Reload, then check the
          backend schema.
        </p>
        <button onClick={() => location.reload()}>Reload application</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <Boundary>
      <WorkspaceApp />
    </Boundary>
  );
}
function WorkspaceApp() {
  const [route, setRoute] = useState(readRoute);
  const [query, setQuery] = useState(route.query);
  const [data, setData] = useState<Workspace | null>(
    STANDALONE_DEMO ? DEMO_WORKSPACE : null,
  );
  const [loading, setLoading] = useState(!STANDALONE_DEMO);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState("All topics");
  const [status, setStatus] = useState("All statuses");
  const [sort, setSort] = useState("newest");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 850px)").matches,
  );
  useEffect(() => {
    const mq = matchMedia("(max-width: 850px)");
    const update = () => setMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [help, setHelp] = useState(false);
  const [theme, setTheme] = useState(() =>
    readLocal<string>("ct-theme", "light") === "dark" ? "dark" : "light",
  );
  const [saved, setSaved] = useState<string[]>(() => {
    const values = readLocal<unknown>("ct-saved", []);
    return Array.isArray(values)
      ? values.filter((v) => typeof v === "string")
      : [];
  });
  const [toast, setToast] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  const [language, setLanguage] = useState("en");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const change = () => {
      const r = readRoute();
      setRoute(r);
      setQuery(r.query);
      if (r.page !== route.page) {
        setTopic("All topics");
        setStatus("All statuses");
      }
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [route.page]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    persist("ct-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (STANDALONE_DEMO) return;
    const controller = new AbortController();
    loadWorkspace(controller.signal)
      .then((value) => {
        setData(value);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(
            "We couldn’t reach a compatible data service. Start the backend or retry the connection.",
          );
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timeout));
    const timeout = setTimeout(() => {
      controller.abort();
      setError("The data service took too long to respond. Please retry.");
      setLoading(false);
    }, 12000);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  const page = route.page;
  function navigate(next: Page, selection: Selection | null = null, q = "") {
    const params = new URLSearchParams({ page: next });
    if (q) params.set("q", q);
    if (selection) {
      params.set("kind", selection.kind);
      params.set("id", selection.id);
    }
    window.location.assign("#" + params.toString());
  }
  function open(kind: RecordKind, id: string) {
    navigate(page, { kind, id }, query);
  }
  function toggleSave(kind: RecordKind, id: string) {
    const key = `${kind}:${id}`;
    const next = saved.includes(key)
      ? saved.filter((s) => s !== key)
      : [...saved, key];
    setSaved(next);
    setToast(
      persist("ct-saved", next)
        ? next.includes(key)
          ? "Record saved to this browser"
          : "Record removed from saved"
        : "Saved for this session. Browser storage is unavailable.",
    );
  }
  const bookmark = (kind: RecordKind, id: string) => (
    <button
      className={`icon-button save ${saved.includes(`${kind}:${id}`) ? "is-saved" : ""}`}
      aria-label={
        saved.includes(`${kind}:${id}`) ? "Unsave record" : "Save record"
      }
      aria-pressed={saved.includes(`${kind}:${id}`)}
      onClick={() => toggleSave(kind, id)}
    >
      <Bookmark
        size={17}
        fill={saved.includes(`${kind}:${id}`) ? "currentColor" : "none"}
      />
    </button>
  );
  const term = query.trim().toLocaleLowerCase();
  const matches = (...values: string[]) =>
    !term || values.some((v) => v.toLocaleLowerCase().includes(term));
  const speeches = (data?.speeches || [])
    .filter(
      (s) =>
        matches(
          s.title,
          s.speaker_name,
          s.topic,
          s.summary,
          ...s.segments.flatMap((seg) => [
            seg.text_en,
            seg.text_si || "",
            seg.text_ta || "",
          ]),
        ) &&
        (topic === "All topics" || s.topic === topic),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.sitting_date.localeCompare(b.sitting_date)
        : b.sitting_date.localeCompare(a.sitting_date),
    );
  const commitments = (data?.commitments || []).filter(
    (c) =>
      matches(c.title, c.sponsor_name, c.category, c.original_quote) &&
      (status === "All statuses" || c.current_status === status),
  );
  const people = (data?.mps || []).filter((m) =>
    matches(m.name, m.sinhala_name, m.tamil_name, m.party, m.district),
  );
  const timelines = (data?.timelines || []).filter((t) =>
    matches(t.title, t.topic, t.description),
  );
  const selectedSpeech =
    route.selection?.kind === "speech"
      ? data?.speeches.find((s) => s.id === route.selection?.id)
      : undefined;
  const selectedCommitment =
    route.selection?.kind === "commitment"
      ? data?.commitments.find((s) => s.id === route.selection?.id)
      : undefined;
  const selectedMP =
    route.selection?.kind === "mp"
      ? data?.mps.find((s) => s.id === route.selection?.id)
      : undefined;
  const selectedTimeline =
    route.selection?.kind === "timeline"
      ? data?.timelines.find((s) => s.id === route.selection?.id)
      : undefined;
  const closeDetail = () => navigate(page, null, query);
  const selectedLeaders = compare
    .map((id) => data?.mps.find((m) => m.id === id))
    .filter((m): m is MP => !!m);
  const comparisonTopics = Array.from(
    new Set(selectedLeaders.flatMap((m) => Object.keys(m.stances))),
  );
  const current = pages.find((p) => p.id === page)!;
  function exportRecord() {
    const record =
      selectedSpeech || selectedCommitment || selectedMP || selectedTimeline;
    if (!record) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              notice: "Unreviewed record; verify against original sources.",
              data_mode: data?.meta.mode,
              record,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `civic-trace-${record.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function renderSpeech(speech: Speech) {
    return (
      <div key={speech.id} className="record-row">
        <div className="document-icon">
          <FileText size={19} />
        </div>
        <button className="row-main" onClick={() => open("speech", speech.id)}>
          <span className="meta">
            <span>{speech.topic}</span>
            <span>{date(speech.sitting_date)}</span>
          </span>
          <h3>{speech.title}</h3>
          <span className="muted">
            {speech.speaker_name} <span className="dot">·</span>{" "}
            {speech.duration}
          </span>
        </button>
        {bookmark("speech", speech.id)}
        <ChevronRight size={16} className="row-chevron" />
      </div>
    );
  }
  function renderCommitment(c: Commitment) {
    return (
      <article key={c.id} className="commitment-card">
        <div className="card-top">
          <span className="eyebrow">{c.category}</span>
          {bookmark("commitment", c.id)}
        </div>
        <button
          className="text-button"
          onClick={() => open("commitment", c.id)}
        >
          <h3>{c.title}</h3>
        </button>
        <p>{c.sponsor_name}</p>
        <div className="card-bottom">
          <span
            className={`status status-${c.current_status.toLowerCase().replaceAll(" ", "-")}`}
          >
            {c.current_status}
          </span>
          <span className="muted small">Unreviewed assessment</span>
        </div>
        <div className="card-divider" />
        <button className="text-link" onClick={() => open("commitment", c.id)}>
          {c.timeline.length} linked events <ArrowRight size={15} />
        </button>
      </article>
    );
  }
  function renderPerson(mp: MP) {
    return (
      <article key={mp.id} className="person-card">
        <div className="card-top">
          <span className="avatar">{initials(mp.name)}</span>
          {bookmark("mp", mp.id)}
        </div>
        <button className="text-button" onClick={() => open("mp", mp.id)}>
          <h3>{mp.name}</h3>
        </button>
        <p>{mp.party}</p>
        <div className="profile-foot">
          <span>{mp.district}</span>
          <button className="text-link" onClick={() => open("mp", mp.id)}>
            View profile <ArrowRight size={14} />
          </button>
        </div>
      </article>
    );
  }
  return (
    <div className="shell">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Main navigation"
        inert={mobile && !menuOpen}
      >
        <button className="brand" onClick={() => navigate("overview")}>
          <span className="brand-mark">
            <Landmark size={23} />
          </span>
          <span>
            Civic Trace<span className="brand-sub">THE PUBLIC RECORD</span>
          </span>
        </button>
        <div className="workspace-label">
          <span className="flag-mark" /> Sri Lanka{" "}
          <span className="pilot">PILOT</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {pages.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`nav-item ${page === id ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{title}</span>
              {id === "saved" && saved.length > 0 && (
                <span className="nav-count">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="principle">
            <BookOpen size={18} />
            <h4>Start with the source.</h4>
            <p>A clearer view of public life, one record at a time.</p>
            <button className="text-link" onClick={() => setHelp(true)}>
              How to read the evidence <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> About this pilot
          </button>
          <div className="sidebar-foot">
            Civic Trace <span>Team AI ACES</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{current.title}</strong>
          </div>
          <div className="top-actions">
            <span className="edition">SRI LANKA EDITION</span>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="data-notice">
            <span className="notice-dot" />
            <span>
              <strong>
                {data?.meta.mode === "mongodb"
                  ? "Connected dataset"
                  : "Demonstration workspace"}
              </strong>
              <span className="notice-detail">
                {data?.meta.mode === "mongodb"
                  ? " · Imported records awaiting source review."
                  : " · Sample records for exploring the product. Not verified public evidence."}
              </span>
            </span>
            <button onClick={() => setHelp(true)}>
              About the data <ArrowUpRight size={13} />
            </button>
          </div>
          <section className="page-heading">
            <div>
              <span className="eyebrow">
                {page === "overview"
                  ? "OPEN RECORDS. INFORMED CITIZENS."
                  : "CIVIC TRACE / EXPLORE"}{" "}
              </span>
              <h1>
                {page === "overview"
                  ? "The public record, connected."
                  : current.title}
              </h1>
              <p>
                {
                  {
                    overview:
                      "Follow the debate. Trace the commitment. See the evidence.",
                    speeches:
                      "Find what was said, by whom, and where to read it.",
                    commitments:
                      "Follow a promise from its original words to the available evidence.",
                    compare:
                      "Read policy positions side by side. Context before conclusions.",
                    timelines:
                      "Connect the debate, the decisions, and what followed.",
                    mps: "Explore the people behind the parliamentary record.",
                    saved:
                      "Your reading list, stored privately in this browser.",
                  }[page]
                }
              </p>
            </div>
            {page === "overview" && (
              <button
                className="button primary"
                onClick={() => navigate("speeches")}
              >
                Explore the records <ArrowRight size={16} />
              </button>
            )}
          </section>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(page === "overview" ? "speeches" : page, null, query);
            }}
          >
            <Search size={20} />
            <input
              ref={searchRef}
              aria-label="Search records"
              placeholder="Search a topic, a person, or a phrase…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="icon-button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  navigate(page);
                }}
              >
                <X size={17} />
              </button>
            ) : (
              <kbd>Ctrl K</kbd>
            )}
            <button className="search-submit" type="submit">
              Search <ArrowRight size={15} />
            </button>
          </form>
          {loading ? (
            <div
              className="skeleton-grid"
              role="status"
              aria-label="Loading records"
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <h2>Data service unavailable</h2>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setAttempt((a) => a + 1);
                }}
              >
                Retry connection
              </button>
              <button
                className="button"
                onClick={() => {
                  setData(DEMO_WORKSPACE);
                  setError("");
                }}
              >
                Explore labelled sample data
              </button>
            </div>
          ) : (
            data && (
              <div className="page-content" key={page}>
                {page === "overview" && (
                  <>
                    <div className="stats-strip">
                      {[
                        {
                          value: data.speeches.length,
                          label: "Speech records",
                          note: "In this dataset",
                          icon: BookOpen,
                        },
                        {
                          value: data.mps.length,
                          label: "Public figures",
                          note: "Profiles in the pilot",
                          icon: Users,
                        },
                        {
                          value: data.commitments.length,
                          label: "Commitments",
                          note: "Assessment requires review",
                          icon: FileText,
                        },
                        {
                          value: data.timelines.length,
                          label: "Issue timelines",
                          note: "Context across events",
                          icon: Clock3,
                        },
                      ].map(({ value, label, note, icon: Icon }) => (
                        <div className="stat" key={label}>
                          <span>
                            {label}
                            <Icon size={17} />
                          </span>
                          <strong>{String(value).padStart(2, "0")}</strong>
                          <small>{note}</small>
                        </div>
                      ))}
                    </div>
                    <div className="overview-grid">
                      <section className="panel">
                        <div className="section-head">
                          <div>
                            <span className="eyebrow">FROM THE CHAMBER</span>
                            <h2>Explore the debate</h2>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => navigate("speeches", null, query)}
                          >
                            All speeches <ArrowRight size={15} />
                          </button>
                        </div>
                        {speeches.slice(0, 4).map((s) => renderSpeech(s))}
                        {!speeches.length && (
                          <Empty>Try another name, topic, or phrase.</Empty>
                        )}
                      </section>
                      <aside className="issue-panel">
                        <span className="eyebrow">FOLLOW AN ISSUE</span>
                        <h2>See the bigger picture.</h2>
                        <p>
                          Move beyond a single speech. Follow a policy through
                          the public record.
                        </p>
                        {data.timelines.map((t, i) => (
                          <button
                            className="issue-link"
                            key={t.id}
                            onClick={() => open("timeline", t.id)}
                          >
                            <span className="issue-number">0{i + 1}</span>
                            <span>
                              {t.topic}
                              <small>{t.time_span}</small>
                            </span>
                            <ArrowUpRight size={18} />
                          </button>
                        ))}
                        <div className="issue-foot">
                          <span className="tiny-rule" /> Context connects
                          records.
                          <br />
                          It does not establish causation.
                        </div>
                      </aside>
                    </div>
                    <div className="section-head standalone">
                      <div>
                        <span className="eyebrow">FROM WORDS TO FOLLOW-UP</span>
                        <h2>Commitments in focus</h2>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate("commitments")}
                      >
                        View tracker <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className="card-grid">
                      {commitments.slice(0, 3).map((c) => renderCommitment(c))}
                    </div>
                  </>
                )}
                {page === "speeches" && (
                  <>
                    <div className="filter-bar">
                      <div className="filters">
                        <SlidersHorizontal size={16} />
                        <label className="sr-only" htmlFor="topic">
                          Topic
                        </label>
                        <select
                          id="topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                        >
                          <option>All topics</option>
                          {Array.from(
                            new Set(data.speeches.map((s) => s.topic)),
                          ).map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                        <span className="result-count">
                          {speeches.length} records
                        </span>
                      </div>
                      <label className="sort">
                        Sort by{" "}
                        <select
                          aria-label="Sort speeches"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="newest">Newest first</option>
                          <option value="oldest">Oldest first</option>
                        </select>
                      </label>
                    </div>
                    <section className="panel">
                      {speeches.map((s) => renderSpeech(s))}
                      {!speeches.length && (
                        <Empty>Try a broader query or choose all topics.</Empty>
                      )}
                    </section>
                  </>
                )}
                {page === "commitments" && (
                  <>
                    <div className="filter-bar">
                      <span className="result-count">
                        {commitments.length} commitments · Status labels are
                        unreviewed assessments
                      </span>
                      <select
                        aria-label="Filter commitment status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option>All statuses</option>
                        {Array.from(
                          new Set(
                            data.commitments.map((c) => c.current_status),
                          ),
                        ).map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="card-grid">
                      {commitments.map((c) => renderCommitment(c))}
                    </div>
                    {!commitments.length && (
                      <Empty>Try another topic or status.</Empty>
                    )}
                  </>
                )}
                {page === "mps" && (
                  <>
                    <div className="filter-bar">
                      <span className="result-count">
                        {people.length} profiles · Roles reflect the supplied
                        dataset, not a current officeholder register
                      </span>
                    </div>
                    <div className="card-grid">
                      {people.map((m) => renderPerson(m))}
                    </div>
                    {!people.length && (
                      <Empty>Try a name, party, or district.</Empty>
                    )}
                  </>
                )}
                {page === "timelines" && (
                  <div className="timeline-cards">
                    {timelines.map((t) => (
                      <article className="panel timeline-card" key={t.id}>
                        <div>
                          <span className="eyebrow">
                            {t.topic} · {t.time_span}
                          </span>
                          <h2>{t.title}</h2>
                          <p>{t.description}</p>
                          <div className="timeline-preview">
                            {t.events.slice(0, 4).map((e, i) => (
                              <span key={i}>
                                <i />
                                {e.stage}
                                <small>{date(e.date)}</small>
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          className="button"
                          onClick={() => open("timeline", t.id)}
                        >
                          Explore timeline <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                    {!timelines.length && (
                      <Empty>Try another policy topic.</Empty>
                    )}
                  </div>
                )}
                {page === "compare" && (
                  <>
                    <div className="comparison-picker">
                      <span className="eyebrow">CHOOSE 2–3 PEOPLE</span>
                      <div className="choice-list">
                        {people.map((m) => (
                          <button
                            key={m.id}
                            aria-pressed={compare.includes(m.id)}
                            className={`choice ${compare.includes(m.id) ? "chosen" : ""}`}
                            disabled={
                              compare.length >= 3 && !compare.includes(m.id)
                            }
                            onClick={() =>
                              setCompare(
                                compare.includes(m.id)
                                  ? compare.filter((id) => id !== m.id)
                                  : [...compare, m.id],
                              )
                            }
                          >
                            <span className="avatar small-avatar">
                              {initials(m.name)}
                            </span>
                            {m.name}
                            {compare.includes(m.id) && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedLeaders.length < 2 ? (
                      <Empty title="A fairer comparison starts with context">
                        Choose at least two people to compare the positions in
                        this dataset. No rankings or composite scores.
                      </Empty>
                    ) : (
                      <>
                        <div className="inline-note">
                          Positions below are supplied summaries without
                          claim-level citations. Treat them as unreviewed; open
                          related speeches for context.
                        </div>
                        <div className="table-scroll">
                          <table className="comparison-table">
                            <thead>
                              <tr>
                                <th>Policy topic</th>
                                {selectedLeaders.map((m) => (
                                  <th key={m.id}>
                                    <span className="avatar">
                                      {initials(m.name)}
                                    </span>
                                    <h3>{m.name}</h3>
                                    <span className="muted">
                                      {m.party_code}
                                    </span>
                                    <button
                                      className="text-link"
                                      onClick={() => open("mp", m.id)}
                                    >
                                      View records <ArrowUpRight size={13} />
                                    </button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonTopics.map((t) => (
                                <tr key={t}>
                                  <th scope="row">{t}</th>
                                  {selectedLeaders.map((m) => (
                                    <td key={m.id}>
                                      {m.stances[t] || (
                                        <span className="muted">
                                          No recorded position
                                        </span>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}
                {page === "saved" && (
                  <>
                    <div className="filter-bar">
                      <span className="result-count">
                        Saved on this device · No account required
                      </span>
                    </div>
                    <section className="panel">
                      {speeches
                        .filter((s) => saved.includes(`speech:${s.id}`))
                        .map((s) => renderSpeech(s))}
                    </section>
                    <div className="card-grid saved-grid">
                      {commitments
                        .filter((c) => saved.includes(`commitment:${c.id}`))
                        .map((c) => renderCommitment(c))}
                      {people
                        .filter((m) => saved.includes(`mp:${m.id}`))
                        .map((m) => renderPerson(m))}
                    </div>
                    {!saved.length && (
                      <Empty title="Keep the records that matter">
                        Use the bookmark beside a record to build your reading
                        list.
                      </Empty>
                    )}
                    {!!saved.length && (
                      <p className="muted small">
                        Only matching records in the current dataset are shown.
                        Clear search if a saved record is missing.
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          )}
          <footer className="footer">
            <span>
              <Landmark size={14} /> Civic Trace <span className="dot">/</span>{" "}
              Public information. Better understood.
            </span>
            <button onClick={() => setHelp(true)}>
              Sources & methodology <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {route.selection && data && (
        <Dialog title="RECORD DETAILS" onClose={closeDetail} wide>
          <div className="detail-body">
            <div className="detail-tools">
              <span className="status neutral">
                {data.meta.mode === "demo"
                  ? "Sample record"
                  : "Unreviewed record"}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Export record as JSON"
                  onClick={exportRecord}
                >
                  <ArrowDownToLine size={17} />
                </button>
                <button
                  className="button small-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.href);
                      setToast("Record link copied");
                    } catch {
                      setToast(
                        "Copy the record link from your browser address bar",
                      );
                    }
                  }}
                >
                  Copy link
                </button>
              </div>
            </div>
            {selectedSpeech && (
              <>
                <span className="eyebrow">
                  {selectedSpeech.topic} · {date(selectedSpeech.sitting_date)}
                </span>
                <h2 className="detail-title">{selectedSpeech.title}</h2>
                <div className="byline">
                  <span className="avatar">
                    {initials(selectedSpeech.speaker_name)}
                  </span>
                  <div>
                    <strong>{selectedSpeech.speaker_name}</strong>
                    <span>{selectedSpeech.session_name}</span>
                  </div>
                  {bookmark("speech", selectedSpeech.id)}
                </div>
                <p className="lead">{selectedSpeech.summary}</p>
                <div className="source-box">
                  <FileText size={21} />
                  <div>
                    <strong>Original parliamentary record</strong>
                    <p>
                      {selectedSpeech.hansard_vol} · Pages{" "}
                      {selectedSpeech.hansard_page}
                    </p>
                    <SourceLink url={selectedSpeech.hansard_pdf_url}>
                      Open Hansard
                    </SourceLink>
                  </div>
                  <span className="muted small">Link not checked</span>
                </div>
                <div className="section-head">
                  <h3>Transcript excerpts</h3>
                  <select
                    aria-label="Transcript language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="si">සිංහල</option>
                    <option value="ta">தமிழ்</option>
                  </select>
                </div>
                <p className="muted small">
                  Timestamps and text are supplied records, not verified
                  alignments. Links open the source recording; no simulated
                  playback.
                </p>
                <div className="transcript">
                  {selectedSpeech.segments.map((seg) => {
                    const translation =
                      language === "si"
                        ? seg.text_si
                        : language === "ta"
                          ? seg.text_ta
                          : seg.text_en;
                    return (
                      <div className="transcript-row" key={seg.id}>
                        <SourceLink
                          url={
                            videoUrl(
                              selectedSpeech.video_url,
                              seg.start_seconds,
                            ) || undefined
                          }
                        >
                          {seg.start_time}
                        </SourceLink>
                        <div>
                          {!translation && (
                            <span className="translation-note">
                              Translation unavailable · Showing English
                            </span>
                          )}
                          <p lang={translation ? language : "en"}>
                            {translation || seg.text_en}
                          </p>
                          <span className="muted small">{seg.claim_type}</span>
                        </div>
                      </div>
                    );
                  })}
                  {!selectedSpeech.segments.length && (
                    <Empty title="Transcript not available">
                      No transcript segments were supplied for this speech.
                    </Empty>
                  )}
                </div>
              </>
            )}
            {selectedCommitment && (
              <>
                <span className="eyebrow">{selectedCommitment.category}</span>
                <h2 className="detail-title">{selectedCommitment.title}</h2>
                <p className="muted">
                  {selectedCommitment.sponsor_name} ·{" "}
                  {selectedCommitment.manifesto_year}
                </p>
                <blockquote>{selectedCommitment.original_quote}</blockquote>
                <div className="inline-note">
                  Assessment: {selectedCommitment.current_status}. This label
                  has not been independently reviewed. It is not a fact-check
                  verdict.
                </div>
                <p>{selectedCommitment.verdict_summary}</p>
                <div className="target-grid">
                  <div>
                    <span className="eyebrow">STATED TARGET</span>
                    <p>{selectedCommitment.target_metric}</p>
                  </div>
                  <div>
                    <span className="eyebrow">REPORTED OUTCOME</span>
                    <p>{selectedCommitment.achieved_metric}</p>
                  </div>
                </div>
                <h3>Evidence trail</h3>
                <div className="event-list">
                  {selectedCommitment.timeline.map((event, i) => (
                    <article key={i}>
                      <span className="event-dot" />
                      <span className="eyebrow">
                        {date(event.date)} · {event.stage}
                      </span>
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                      <SourceLink url={event.source_url}>
                        {event.source_ref || event.source_type}
                      </SourceLink>
                    </article>
                  ))}
                </div>
              </>
            )}
            {selectedMP && (
              <>
                <span className="avatar profile-avatar">
                  {initials(selectedMP.name)}
                </span>
                <h2 className="detail-title">{selectedMP.name}</h2>
                <p className="muted">
                  {selectedMP.party} · {selectedMP.district}
                </p>
                <p>{selectedMP.bio}</p>
                <div className="inline-note">
                  Role listed in supplied dataset: {selectedMP.current_role}.
                  Effective dates and current officeholder status are not
                  verified.
                </div>
                <div className="chips">
                  {selectedMP.policy_focus.map((f) => (
                    <span key={f}>{f}</span>
                  ))}
                </div>
                <h3>Speeches in this dataset</h3>
                {data.speeches
                  .filter((s) => s.speaker_id === selectedMP.id)
                  .map((s) => renderSpeech(s))}
                {!data.speeches.some((s) => s.speaker_id === selectedMP.id) && (
                  <Empty>
                    No speech records are linked to this profile yet.
                  </Empty>
                )}
              </>
            )}
            {selectedTimeline && (
              <>
                <span className="eyebrow">
                  {selectedTimeline.topic} · {selectedTimeline.time_span}
                </span>
                <h2 className="detail-title">{selectedTimeline.title}</h2>
                <p className="lead">{selectedTimeline.description}</p>
                <div className="inline-note">
                  Events show chronology, not a proven causal relationship. The
                  dataset supplies reference text but no event-level source
                  URLs.
                </div>
                <div className="event-list">
                  {selectedTimeline.events.map((event, i) => (
                    <article key={i}>
                      <span className="event-dot" />
                      <span className="eyebrow">{date(event.date)}</span>
                      <h3>{event.stage}</h3>
                      <strong className="small">{event.speaker}</strong>
                      <p>{event.summary}</p>
                      <span className="reference-label">
                        <FileText size={14} />
                        {event.hansard_ref} · Link unavailable
                      </span>
                    </article>
                  ))}
                </div>
                <details className="indicator-details">
                  <summary>
                    View supplied indicator data <ChevronDown size={16} />
                  </summary>
                  <p className="muted small">
                    Unreviewed figures. Units, definitions, and source series
                    must be verified before comparison.
                  </p>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {Array.from(
                            new Set(
                              selectedTimeline.indicator_data.flatMap((row) =>
                                Object.keys(row),
                              ),
                            ),
                          ).map((k) => (
                            <th key={k}>{k.replaceAll("_", " ")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTimeline.indicator_data.map((row, i) => (
                          <tr key={i}>
                            {Array.from(
                              new Set(
                                selectedTimeline.indicator_data.flatMap((r) =>
                                  Object.keys(r),
                                ),
                              ),
                            ).map((k) => (
                              <td key={k}>{String(row[k] ?? "—")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
            {!selectedSpeech &&
              !selectedCommitment &&
              !selectedMP &&
              !selectedTimeline && (
                <Empty title="Record not found">
                  This link is not available in the current dataset.
                </Empty>
              )}
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog title="ABOUT THIS PILOT" onClose={() => setHelp(false)}>
          <div className="detail-body">
            <span className="brand-mark">
              <Landmark size={24} />
            </span>
            <h2 className="detail-title">
              Evidence first.
              <br />
              Conclusions with care.
            </h2>
            <p>
              Civic Trace connects parliamentary records, public commitments,
              and policy timelines in one reading workspace.
            </p>
            <h3>What you’re looking at</h3>
            <p>
              {data?.meta.mode === "mongodb"
                ? "Records loaded from the configured database. A database connection does not verify a claim."
                : "Bundled sample content from the original prototype. Names, quotes, status labels, numbers, and links require independent verification before publication."}
            </p>
            <h3>Our evidence rules</h3>
            <ul className="method-list">
              <li>
                Open the original record and read the surrounding context.
              </li>
              <li>
                A statement in Parliament is not proof that the statement is
                true.
              </li>
              <li>Missing evidence does not mean a promise was broken.</li>
              <li>
                Policy outcomes can have many causes; chronology is not
                attribution.
              </li>
            </ul>
            <h3>What is still being built</h3>
            <p>
              Reviewed source ingestion, claim-level citations, validated video
              alignment, full interface translations, and grounded AI answers.
              This patch does not claim these are live.
            </p>
            <p className="muted small">
              Saved items stay in this browser. Dataset mode:{" "}
              {data?.meta.mode || "not connected"}.
              {data?.meta.loaded_at &&
                ` Snapshot loaded ${new Date(data.meta.loaded_at).toLocaleString("en-GB")}.`}
            </p>
          </div>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
