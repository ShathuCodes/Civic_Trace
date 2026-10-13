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
  Mic,
  MicOff,
  Moon,
  Pause,
  Play,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Users,
  Volume2,
  VolumeX,
  X,
  Loader2,
} from "lucide-react";
import { CivicApi, DEMO_WORKSPACE, loadWorkspace } from "./api";
import type { Workspace } from "./api";
import type { ChatResponse, Commitment, MP, Speech } from "./types";
import { MPActivityProfile } from "./MPActivityProfile";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import type { Language } from "./i18n/types";
import { SUPPORTED_LANGUAGES } from "./i18n/types";
import { useVoiceInput } from "./hooks/useVoiceInput";
import { useSpeakText } from "./hooks/useSpeakText";
import { EvidenceTrailView } from "./EvidenceTrailView";
import { ElectionBroadcastHero } from "./ElectionBroadcastHero";

const STANDALONE_DEMO = import.meta.env.VITE_DEMO_MODE === "true";

type Page =
  | "overview"
  | "speeches"
  | "commitments"
  | "compare"
  | "timelines"
  | "mps"
  | "saved"
  | "trail";
type RecordKind = "speech" | "commitment" | "mp" | "timeline";
type Selection = { kind: RecordKind; id: string };
type TrailRoute = {
  id: string;
  kind: "speech" | "commitment";
  fromPage: Page;
  fromId: string;
};
const PAGE_IDS: Page[] = ["overview", "speeches", "commitments", "compare", "timelines", "mps", "saved"];
const PAGE_ICONS: Record<Page, typeof Search> = {
  overview: LayoutDashboard,
  speeches: BookOpen,
  commitments: FileText,
  compare: GitCompareArrows,
  timelines: Clock3,
  mps: Users,
  saved: Bookmark,
  trail: Clock3,
};
function readRoute(): {
  page: Page;
  query: string;
  selection: Selection | null;
  trail: TrailRoute | null;
} {
  const params = new URLSearchParams(location.hash.slice(1));
  const pageParam = params.get("page");
  const isTrail = pageParam === "trail";
  const page = isTrail
    ? ("trail" as Page)
    : PAGE_IDS.includes(pageParam as Page)
      ? (pageParam as Page)
      : ("overview" as Page);
  const kind = params.get("kind") as RecordKind;
  const trailId =
    params.get("trail_id") || (isTrail ? params.get("id") : "") || "";
  const trailKind =
    ((params.get("trail_kind") || (isTrail ? params.get("kind") : "")) as
      | "speech"
      | "commitment") || "speech";
  const fromPageParam = params.get("from_page") as Page;
  const fromPage =
    fromPageParam && PAGE_IDS.includes(fromPageParam)
      ? fromPageParam
      : trailKind === "commitment"
        ? "commitments"
        : "speeches";
  const fromId = params.get("from_id") || trailId;

  return {
    page,
    query: params.get("q") || "",
    selection:
      !isTrail &&
      ["speech", "commitment", "mp", "timeline"].includes(kind) &&
      params.get("id")
        ? { kind, id: params.get("id")! }
        : null,
    trail:
      isTrail && trailId
        ? { id: trailId, kind: trailKind, fromPage, fromId }
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
  const { t } = useLanguage();
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
    <span className="muted">{t.common.sourceNotSupplied}</span>
  );
}
function Empty({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <div className="empty">
      <Search size={25} />
      <h3>{title || t.common.noRecordsFound}</h3>
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
    <LanguageProvider>
      <Boundary>
        <WorkspaceApp />
      </Boundary>
    </LanguageProvider>
  );
}
function WorkspaceApp() {
  const { t, language, setLanguage } = useLanguage();
  const pages = PAGE_IDS.map((id) => ({
    id,
    title: t.nav[id as keyof typeof t.nav] as string,
    icon: PAGE_ICONS[id],
  }));
  const [route, setRoute] = useState(readRoute);
  const [query, setQuery] = useState(route.query);
  const [data, setData] = useState<Workspace | null>(
    STANDALONE_DEMO ? DEMO_WORKSPACE : null,
  );
  const [loading, setLoading] = useState(!STANDALONE_DEMO);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [topic, setTopic] = useState(""); // empty = "All topics" sentinel
  const [status, setStatus] = useState(""); // empty = "All statuses" sentinel
  const [sort, setSort] = useState("newest");
  const [mpParty, setMpParty] = useState("");
  const [mpDistrict, setMpDistrict] = useState("");
  const [mpDateFrom, setMpDateFrom] = useState("");
  const [mpDateTo, setMpDateTo] = useState("");
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
    readLocal<string>("ct-theme", "dark") === "light" ? "light" : "dark",
  );
  const [saved, setSaved] = useState<string[]>(() => {
    const values = readLocal<unknown>("ct-saved", []);
    return Array.isArray(values)
      ? values.filter((v) => typeof v === "string")
      : [];
  });
  const [toast, setToast] = useState("");
  const [compare, setCompare] = useState<string[]>([]);
  // transcript language (separate from UI language)
  const [transcriptLang, setTranscriptLang] = useState("en");
  const [showHansardPreview, setShowHansardPreview] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ChatResponse | null>(null);

  async function runAiQuery(q: string) {
    if (!q.trim()) return;
    setAiLoading(true);
    try {
      const res = await CivicApi.askAssistant(q);
      setAiResult(res);
    } catch {
      setToast("Unable to reach assistant. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }
  const searchRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput({
    language,
    onResult: (text) => {
      setQuery(text);
      searchRef.current?.focus();
    },
  });
  const tts = useSpeakText({
    onError: () => {
      setToast(t.voice.voiceUnavailable);
    },
  });
  useEffect(() => {
    const change = () => {
      const r = readRoute();
      setRoute(r);
      setQuery(r.query);
      if (r.page !== route.page) {
        setTopic("");
        setStatus("");
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
    if (STANDALONE_DEMO) {
      setData(DEMO_WORKSPACE);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    loadWorkspace(controller.signal)
      .then((value) => {
        setData(value);
        setBackendOffline(false);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // Gracefully fallback to demo workspace so data ALWAYS shows immediately
          setData(DEMO_WORKSPACE);
          setBackendOffline(true);
          setError("");
          setLoading(false);
        }
      })
      .finally(() => clearTimeout(timeout));
    const timeout = setTimeout(() => {
      controller.abort();
      setData(DEMO_WORKSPACE);
      setBackendOffline(true);
      setError("");
      setLoading(false);
    }, 4000);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  const page = route.page;
  function navigate(
    next: Page,
    selection: Selection | null = null,
    q = "",
    trailParams?: { id: string; kind: "speech" | "commitment"; fromPage?: string; fromId?: string } | null,
  ) {
    const params = new URLSearchParams({ page: next });
    if (q) params.set("q", q);
    if (selection) {
      params.set("kind", selection.kind);
      params.set("id", selection.id);
    }
    const t = trailParams || (next === "trail" ? route.trail : null);
    if (t) {
      params.set("trail_id", t.id);
      params.set("trail_kind", t.kind);
      if (t.fromPage) params.set("from_page", t.fromPage);
      if (t.fromId) params.set("from_id", t.fromId);
    }
    window.location.assign("#" + params.toString());
  }
  function open(kind: RecordKind, id: string) {
    navigate(page, { kind, id }, query);
  }
  function openEvidenceTrail(recordId: string, recordKind: "speech" | "commitment") {
    const fromPage = route.page === "trail" ? (route.trail?.fromPage || "speeches") : route.page;
    navigate("trail", null, query, {
      id: recordId,
      kind: recordKind,
      fromPage,
      fromId: recordId,
    });
  }
  function returnFromTrail() {
    const fromPage = route.trail?.fromPage || (route.trail?.kind === "commitment" ? "commitments" : "speeches");
    const fromId = route.trail?.fromId;
    const fromKind = route.trail?.kind;
    if (fromId && fromKind) {
      navigate(fromPage, { kind: fromKind, id: fromId }, query);
    } else {
      navigate(fromPage, null, query);
    }
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
        (!topic || s.topic === topic),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.sitting_date.localeCompare(b.sitting_date)
        : b.sitting_date.localeCompare(a.sitting_date),
    );
  const commitments = (data?.commitments || []).filter(
    (c) =>
      matches(c.title, c.sponsor_name, c.category, c.original_quote) &&
      (!status || c.current_status === status),
  );
  const mpParties = Array.from(new Set((data?.mps || []).map((m) => m.party))).sort();
  const mpDistricts = Array.from(new Set((data?.mps || []).map((m) => m.district))).sort();
  const people = (data?.mps || []).filter(
    (m) =>
      matches(m.name, m.sinhala_name, m.tamil_name, m.party, m.district) &&
      (!mpParty || m.party === mpParty) &&
      (!mpDistrict || m.district === mpDistrict),
  );

  const getMpStats = (mp: MP) => {
    const mpSpeeches = (data?.speeches || []).filter((s) => {
      const matchSpeaker =
        s.speaker_id === mp.id ||
        s.speaker_name.toLowerCase().includes(mp.name.toLowerCase()) ||
        mp.name.toLowerCase().includes(s.speaker_name.toLowerCase());
      if (!matchSpeaker) return false;
      if (mpDateFrom && s.sitting_date < mpDateFrom) return false;
      if (mpDateTo && s.sitting_date > mpDateTo) return false;
      return true;
    });

    const attendanceRecords = ((data as any)?.attendance || []).filter((a: any) => {
      if (a.mp_id !== mp.id) return false;
      if (mpDateFrom && a.sitting_date < mpDateFrom) return false;
      if (mpDateTo && a.sitting_date > mpDateTo) return false;
      return true;
    });

    const presentCount = attendanceRecords.filter((a: any) => a.recorded_status === "present").length;
    const totalSittings = attendanceRecords.length;

    return {
      speechesCount: mpSpeeches.length,
      presentCount,
      totalSittings,
      hasFilteredDate: Boolean(mpDateFrom || mpDateTo),
    };
  };
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
  const current = pages.find((p) => p.id === page) || {
    id: "trail" as Page,
    title: t.trail.whatHappenedAfter,
    icon: Clock3,
  };
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
        <button
          className="icon-button what-happened-after-icon-btn"
          title={t.trail.whatHappenedAfter}
          aria-label={t.trail.whatHappenedAfter}
          onClick={(e) => {
            e.stopPropagation();
            openEvidenceTrail(speech.id, "speech");
          }}
        >
          <Clock3 size={16} />
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
          <span className="muted small">{t.commitments.unreviewedAssessment}</span>
        </div>
        <div className="card-divider" />
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button className="text-link" onClick={() => open("commitment", c.id)}>
            {c.timeline.length} {t.commitments.linkedEvents} <ArrowRight size={15} />
          </button>
          <span className="dot">·</span>
          <button
            className="text-link"
            style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            onClick={(e) => {
              e.stopPropagation();
              openEvidenceTrail(c.id, "commitment");
            }}
          >
            <Clock3 size={14} /> {t.trail.whatHappenedAfter}
          </button>
        </div>
      </article>
    );
  }
  function renderPerson(mp: MP) {
    const stats = getMpStats(mp);
    return (
      <article key={mp.id} className="person-card">
        <div className="card-top">
          <span className="avatar">{initials(mp.name)}</span>
          <div className="person-top-actions">
            {stats.hasFilteredDate && (
              <span
                className={`mp-activity-indicator ${stats.speechesCount > 0 ? "has-activity" : "no-activity"}`}
                title={stats.speechesCount > 0 ? "Active debate records in selected date window" : "No speeches in selected date window"}
              >
                {stats.speechesCount > 0 ? "Active in period" : "No speeches"}
              </span>
            )}
            {bookmark("mp", mp.id)}
          </div>
        </div>
        <button className="text-button" onClick={() => open("mp", mp.id)}>
          <h3>{mp.name}</h3>
        </button>
        <div className="person-meta-line">
          <span className="party-badge">{mp.party}</span>
          <span className="district-tag">{mp.district}</span>
        </div>

        {/* Dynamic Activity Stats (reacts immediately to date selection) */}
        <div className="mp-card-stats-box">
          <div className="mp-stat-pill">
            <span className="mp-stat-count">{stats.speechesCount}</span>
            <span className="mp-stat-label">
              {stats.hasFilteredDate ? t.nav.speechesRecorded.toLowerCase() : t.mps.totalSpeeches.toLowerCase()}
            </span>
          </div>
          {stats.totalSittings > 0 && (
            <div className="mp-stat-pill">
              <span className="mp-stat-count">{stats.presentCount}/{stats.totalSittings}</span>
              <span className="mp-stat-label">{t.mps.sittingsAttended.toLowerCase()}</span>
            </div>
          )}
        </div>

        <div className="profile-foot">
          <span className="mp-role-text">{mp.current_role}</span>
          <button className="text-link" onClick={() => open("mp", mp.id)}>
            {t.mps.viewProfile} <ArrowRight size={14} />
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
        {t.nav.skipToContent}
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
            {t.brand.title}<span className="brand-sub">{t.brand.subtitle}</span>
          </span>
        </button>
        <div className="workspace-label">
          <span className="flag-mark" /> Sri Lanka{" "}
          <span className="pilot">{t.brand.pilot}</span>
        </div>
        <span className="nav-label">{t.brand.workspace}</span>
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
            <h4>{t.nav.startWithSource}</h4>
            <p>{t.nav.startWithSourceSub}</p>
            <button className="text-link" onClick={() => setHelp(true)}>
              {t.nav.howToReadEvidence} <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} /> {t.nav.aboutPilot}
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
              aria-label={t.nav.openNav}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={20} />
            </button>
            <span>{t.brand.workspace}</span>
            <ChevronRight size={14} />
            <strong>{current.title}</strong>
          </div>
          <div className="top-actions">
            <span className="edition">{t.brand.edition}</span>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={theme === "light" ? t.nav.switchToDark : t.nav.switchToLight}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {/* Language switcher – segmented on desktop, select on mobile */}
            {mobile ? (
              <select
                className="lang-select"
                aria-label={t.nav.selectLanguage}
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.nativeLabel}</option>
                ))}
              </select>
            ) : (
              <div className="lang-seg" role="group" aria-label={t.nav.selectLanguage}>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`lang-seg-btn ${language === l.code ? "active" : ""}`}
                    onClick={() => setLanguage(l.code)}
                    aria-pressed={language === l.code}
                  >
                    {l.nativeLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="data-notice">
            <span className={`notice-dot ${backendOffline ? "notice-dot-offline" : ""}`} />
            <span>
              <strong>
                {backendOffline
                  ? t.nav.offlineDataset
                  : data?.meta.mode === "mongodb"
                    ? t.overview.connectedDataset
                    : t.overview.demoWorkspace}
              </strong>
              <span className="notice-detail">
                {backendOffline
                  ? ` · ${t.nav.offlineBackendPort}`
                  : data?.meta.mode === "mongodb"
                    ? ` · ${t.overview.connectedNotice}`
                    : ` · ${t.overview.demoNotice}`}
              </span>
              {!backendOffline && data?.meta?.gemini_connected && (
                <span className="badge badge-verified" style={{ marginLeft: 8 }}>
                  <Sparkles size={12} /> {t.nav.geminiReady}
                </span>
              )}
            </span>
            {backendOffline ? (
              <button
                className="button small-button"
                style={{ marginLeft: "auto" }}
                onClick={() => setAttempt((a) => a + 1)}
              >
                {t.nav.connectBackend}
              </button>
            ) : (
              <button onClick={() => setHelp(true)}>
                {t.overview.aboutData} <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          {page !== "trail" && (
            <>
              <section className="page-heading">
                <div>
                  <span className="eyebrow">
                    {page === "overview" ? t.overview.eyebrow : t.speeches.eyebrow}{" "}
                  </span>
                  <h1>
                    {page === "overview" ? t.overview.heroTitle : current.title}
                  </h1>
                  <p>
                    {{
                      overview: t.overview.heroDesc,
                      speeches: t.speeches.desc,
                      commitments: t.commitments.desc,
                      compare: t.compare.desc,
                      timelines: t.timelines.desc,
                      mps: t.mps.desc,
                      saved: t.saved.desc,
                    }[page]}
                  </p>
                </div>
                {page === "overview" && (
                  <button
                    className="button primary"
                    onClick={() => navigate("speeches")}
                  >
                    {t.overview.exploreBtn} <ArrowRight size={16} />
                  </button>
                )}
              </section>
              <div className="search-section">
                <form
                  className="search-bar"
                  onSubmit={(e) => {
                    e.preventDefault();
                    voice.stop();
                    navigate(page === "overview" ? "speeches" : page, null, query);
                  }}
                >
                  <Search size={20} />
                  <input
                    ref={searchRef}
                    aria-label={t.nav.searchPlaceholder}
                    placeholder={
                      voice.status === "listening"
                        ? `${t.voice.micRecording} (${SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeLabel})`
                        : t.nav.searchPlaceholder
                    }
                    value={voice.status === "listening" ? (voice.interimTranscript || query) : query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {voice.isSupported && (
                    <button
                      type="button"
                      className={`icon-button voice-btn ${voice.status === "listening" ? "is-recording" : ""}`}
                      aria-label={voice.status === "listening" ? t.voice.micStop : t.voice.micBtn}
                      title={voice.status === "listening" ? t.voice.micStop : t.voice.micBtn}
                      onClick={() => {
                        if (voice.status === "listening") {
                          voice.stop();
                        } else {
                          voice.start();
                        }
                      }}
                    >
                      {voice.status === "listening" ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                  {query ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t.nav.clearSearch}
                      onClick={() => {
                        setQuery("");
                        voice.reset();
                        navigate(page);
                      }}
                    >
                      <X size={17} />
                    </button>
                  ) : (
                    <kbd>Ctrl K</kbd>
                  )}
                  <button className="search-submit" type="submit">
                    {t.nav.searchBtn} <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    className="ai-ask-btn"
                    onClick={() => {
                      setAiQuestion(query || "");
                      setAiModalOpen(true);
                      if (query.trim()) runAiQuery(query);
                    }}
                    title={t.nav.askAI}
                  >
                    <Sparkles size={15} />
                    <span>{t.nav.askAI}</span>
                  </button>
                </form>

                {voice.status === "listening" && (
                  <div className="voice-status listening">
                    <span className="pulse-dot" />
                    <span>{t.voice.micRecording} ({SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeLabel})</span>
                    <button type="button" className="text-link small" onClick={voice.stop}>
                      {t.voice.micStop}
                    </button>
                    <button type="button" className="text-link small muted" onClick={voice.cancel}>
                      {t.voice.micCancel}
                    </button>
                  </div>
                )}
                {voice.status === "ready" && voice.transcript && (
                  <div className="voice-status ready">
                    <span>{t.voice.readyToSubmit}</span>
                    <button
                      type="button"
                      className="button small-button primary"
                      onClick={() => {
                        voice.reset();
                        navigate(page === "overview" ? "speeches" : page, null, query);
                      }}
                    >
                      {t.nav.searchBtn} <ArrowRight size={14} />
                    </button>
                    <button type="button" className="text-link small muted" onClick={voice.reset}>
                      {t.voice.micCancel}
                    </button>
                  </div>
                )}
                {voice.status === "error" && voice.error && (
                  <div className="voice-status error">
                    <span>
                      {voice.error.type === "permission_denied"
                        ? t.voice.micDenied
                        : voice.error.type === "no_speech"
                          ? t.voice.noSpeechDetected
                          : voice.error.type === "unsupported"
                            ? t.voice.unsupportedBrowser
                            : voice.error.type === "network"
                              ? t.voice.networkError
                              : t.voice.serviceUnavailable}
                    </span>
                    <button type="button" className="text-link small" onClick={voice.start}>
                      {t.voice.micRetry}
                    </button>
                    <button type="button" className="text-link small muted" onClick={voice.reset}>
                      {t.voice.useFallback}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {loading ? (
            <div
              className="skeleton-grid"
              role="status"
              aria-label={t.common.loading}
            >
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="error-state" role="alert">
              <h2>{t.common.errorTitle}</h2>
              <p>{error}</p>
              <button
                className="button primary"
                onClick={() => {
                  setLoading(true);
                  setError("");
                  setAttempt((a) => a + 1);
                }}
              >
                {t.common.retry}
              </button>
              <button
                className="button"
                onClick={() => {
                  setData(DEMO_WORKSPACE);
                  setError("");
                }}
              >
                {t.common.exploreSample}
              </button>
            </div>
          ) : (
            data && (
              <div className="page-content" key={page}>
                {page === "overview" && (
                  <>
                    <ElectionBroadcastHero
                      mps={data.mps}
                      onOpenMP={(mpId) => open("mp", mpId)}
                      onExploreCompare={() => navigate("compare")}
                    />
                    <div className="stats-strip">
                      {[
                        {
                          value: data.speeches.length,
                          label: t.overview.statSpeeches,
                          note: t.overview.statSpeechesSub,
                          icon: BookOpen,
                        },
                        {
                          value: data.mps.length,
                          label: t.overview.statMps,
                          note: t.overview.statMpsSub,
                          icon: Users,
                        },
                        {
                          value: data.commitments.length,
                          label: t.overview.statCommitments,
                          note: t.overview.statCommitmentsSub,
                          icon: FileText,
                        },
                        {
                          value: data.timelines.length,
                          label: t.overview.statTimelines,
                          note: t.overview.statTimelinesSub,
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
                            <span className="eyebrow">{t.nav.fromTheChamber}</span>
                            <h2>{t.overview.recentHeading}</h2>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => navigate("speeches", null, query)}
                          >
                            {t.overview.viewAll} <ArrowRight size={15} />
                          </button>
                        </div>
                        {speeches.slice(0, 4).map((s) => renderSpeech(s))}
                        {!speeches.length && (
                          <Empty>{t.speeches.noSpeechesDesc}</Empty>
                        )}
                      </section>
                      <aside className="issue-panel">
                        <span className="eyebrow">{t.nav.followAnIssue}</span>
                        <h2>{t.overview.recentSub}</h2>
                        <p>{t.overview.featuredCommitmentsSub}</p>
                        {data.timelines.map((tl, i) => (
                          <button
                            className="issue-link"
                            key={tl.id}
                            onClick={() => open("timeline", tl.id)}
                          >
                            <span className="issue-number">0{i + 1}</span>
                            <span>
                              {tl.topic}
                              <small>{tl.time_span}</small>
                            </span>
                            <ArrowUpRight size={18} />
                          </button>
                        ))}
                        <div className="issue-foot">
                          <span className="tiny-rule" /> {t.nav.contextConnects}
                          <br />
                          {t.nav.contextNotCausation}
                        </div>
                      </aside>
                    </div>
                    <div className="section-head standalone">
                      <div>
                        <span className="eyebrow">{t.nav.fromWordsToFollowUp}</span>
                        <h2>{t.overview.featuredCommitments}</h2>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate("commitments")}
                      >
                        {t.overview.viewAll} <ArrowRight size={15} />
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
                          {t.speeches.filterTopic}
                        </label>
                        <select
                          id="topic"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                        >
                          <option value="">{t.speeches.allTopics}</option>
                          {Array.from(
                            new Set(data.speeches.map((s) => s.topic)),
                          ).map((tp) => (
                            <option key={tp}>{tp}</option>
                          ))}
                        </select>
                        <span className="result-count">
                          {speeches.length} {t.common.records}
                        </span>
                      </div>
                      <label className="sort">
                        {t.speeches.sortBy}{" "}
                        <select
                          aria-label={t.speeches.sortBy}
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="newest">{t.speeches.newest}</option>
                          <option value="oldest">{t.speeches.oldest}</option>
                        </select>
                      </label>
                    </div>
                    <section className="panel">
                      {speeches.map((s) => renderSpeech(s))}
                      {!speeches.length && (
                        <Empty title={t.speeches.noSpeechesFound}>{t.speeches.noSpeechesDesc}</Empty>
                      )}
                    </section>
                  </>
                )}
                {page === "commitments" && (
                  <>
                    <div className="filter-bar">
                      <span className="result-count">
                        {commitments.length} {t.nav.commitments} · {t.commitments.unreviewedAssessment}
                      </span>
                      <select
                        aria-label={t.commitments.filterStatus}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">{t.commitments.allStatuses}</option>
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
                      <Empty>{t.commitments.noCommitmentsFound}</Empty>
                    )}
                  </>
                )}
                {page === "mps" && (
                  <>
                    <div className="mp-directory-controls panel">
                      <div className="mp-filter-top">
                        <div className="mp-counts">
                          <Users size={20} className="mp-icon" />
                          <div>
                            <h3>{t.mps.title}</h3>
                            <span className="result-count">
                              {people.length} / {data?.mps.length || 0} {t.mps.desc}
                              {(mpParty || mpDistrict || mpDateFrom || mpDateTo || query) && " · filtered"}
                            </span>
                          </div>
                        </div>
                        <div className="mp-dropdown-group">
                          <select
                            value={mpParty}
                            onChange={(e) => setMpParty(e.target.value)}
                            aria-label="Filter by political party"
                          >
                            <option value="">{t.mps.party} ({mpParties.length})</option>
                            {mpParties.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                          <select
                            value={mpDistrict}
                            onChange={(e) => setMpDistrict(e.target.value)}
                            aria-label="Filter by electoral district"
                          >
                            <option value="">{t.mps.district} ({mpDistricts.length})</option>
                            {mpDistricts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Date Range & Dynamic Activity Filter */}
                      <div className="mp-date-filter-section">
                        <div className="mp-date-header">
                          <Clock3 size={15} />
                          <strong>{t.nav.filterByDate}:</strong>
                        </div>
                        <div className="mp-date-inputs-row">
                          <div className="mp-date-field">
                            <label htmlFor="mp-filter-date-from">From:</label>
                            <input
                              id="mp-filter-date-from"
                              type="date"
                              value={mpDateFrom}
                              onChange={(e) => setMpDateFrom(e.target.value)}
                            />
                          </div>
                          <div className="mp-date-field">
                            <label htmlFor="mp-filter-date-to">To:</label>
                            <input
                              id="mp-filter-date-to"
                              type="date"
                              value={mpDateTo}
                              onChange={(e) => setMpDateTo(e.target.value)}
                            />
                          </div>
                          <div className="mp-quick-presets" role="group" aria-label="Quick date presets">
                            <button
                              type="button"
                              className={`preset-pill ${!mpDateFrom && !mpDateTo ? "active" : ""}`}
                              onClick={() => {
                                setMpDateFrom("");
                                setMpDateTo("");
                              }}
                            >
                              All Time
                            </button>
                            <button
                              type="button"
                              className={`preset-pill ${mpDateFrom === "2024-01-01" && mpDateTo === "2024-12-31" ? "active" : ""}`}
                              onClick={() => {
                                setMpDateFrom("2024-01-01");
                                setMpDateTo("2024-12-31");
                              }}
                            >
                              {t.nav.sessionsShort}
                            </button>
                            <button
                              type="button"
                              className={`preset-pill ${mpDateFrom === "2024-07-01" && mpDateTo === "2024-12-31" ? "active" : ""}`}
                              onClick={() => {
                                setMpDateFrom("2024-07-01");
                                setMpDateTo("2024-12-31");
                              }}
                            >
                              Late 2024
                            </button>
                            <button
                              type="button"
                              className={`preset-pill ${mpDateFrom === "2024-01-01" && mpDateTo === "2024-06-30" ? "active" : ""}`}
                              onClick={() => {
                                setMpDateFrom("2024-01-01");
                                setMpDateTo("2024-06-30");
                              }}
                            >
                              Early 2024
                            </button>
                            <button
                              type="button"
                              className={`preset-pill ${mpDateFrom === "2023-01-01" && mpDateTo === "2023-12-31" ? "active" : ""}`}
                              onClick={() => {
                                setMpDateFrom("2023-01-01");
                                setMpDateTo("2023-12-31");
                              }}
                            >
                              2023
                            </button>
                            {(mpDateFrom || mpDateTo || mpParty || mpDistrict) && (
                              <button
                                type="button"
                                className="preset-pill reset"
                                onClick={() => {
                                  setMpDateFrom("");
                                  setMpDateTo("");
                                  setMpParty("");
                                  setMpDistrict("");
                                }}
                              >
                                {t.nav.clearDate}
                              </button>
                            )}
                          </div>
                        </div>

                        {(mpDateFrom || mpDateTo) && (
                          <div className="mp-active-date-banner">
                            <span className="pulse-dot-green" />
                            <span>
                              Active Date Window: <strong>{mpDateFrom || "Earliest"}</strong> to <strong>{mpDateTo || "Latest"}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="card-grid">
                      {people.map((m) => renderPerson(m))}
                    </div>
                    {!people.length && (
                      <Empty>{t.mps.noMpsFound}</Empty>
                    )}
                  </>
                )}
                {page === "timelines" && (
                  <div className="timeline-cards">
                    {timelines.map((tl) => (
                      <article className="panel timeline-card" key={tl.id}>
                        <div>
                          <span className="eyebrow">
                            {tl.topic} · {tl.time_span}
                          </span>
                          <h2>{tl.title}</h2>
                          <p>{tl.description}</p>
                          <div className="timeline-preview">
                            {tl.events.slice(0, 4).map((e, i) => (
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
                          onClick={() => open("timeline", tl.id)}
                        >
                          {t.timelines.eventsPipeline} <ArrowRight size={16} />
                        </button>
                      </article>
                    ))}
                    {!timelines.length && (
                      <Empty>{t.timelines.desc}</Empty>
                    )}
                  </div>
                )}
                {page === "compare" && (
                  <>
                    <div className="comparison-picker">
                      <span className="eyebrow">{t.compare.selectPrompt}</span>
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
                      <Empty title={t.compare.desc}>
                        {t.compare.selectPrompt}
                      </Empty>
                    ) : (
                      <>
                        {selectedLeaders.length >= 2 && (() => {
                          const leaderA = selectedLeaders[0];
                          const leaderB = selectedLeaders[1];
                          const totalSpeeches = (leaderA.total_speeches || 1) + (leaderB.total_speeches || 1);
                          const shareA = Math.round(((leaderA.total_speeches || 1) / totalSpeeches) * 100);
                          const shareB = 100 - shareA;
                          const diff = (leaderA.total_speeches || 0) - (leaderB.total_speeches || 0);

                          return (
                            <div className="broadcast-card" style={{ marginBottom: 24, padding: "24px 28px" }}>
                              <div className="broadcast-card-top-tag">
                                <span className="live-bracket-tag">{t.nav.headToHead}</span>
                                <div className="broadcast-live-badge">
                                  <span className="broadcast-pulse-dot" />
                                  <span>{t.nav.liveMatchup}</span>
                                </div>
                              </div>
                              <div className="matchup-stage" style={{ marginBottom: 20 }}>
                                <div
                                  className="candidate-column candidate-left"
                                  onClick={() => open("mp", leaderA.id)}
                                  style={{ cursor: "pointer" }}
                                  title={`View profile for ${leaderA.name}`}
                                >
                                  <div className="candidate-avatar-wrapper ring-red">
                                    <div className="candidate-avatar">
                                      <span className="candidate-initials">{initials(leaderA.name)}</span>
                                    </div>
                                    <span className="candidate-badge-party red-bg">{leaderA.party_code}</span>
                                  </div>
                                  <div className="candidate-details">
                                    <h3 className="candidate-name">{leaderA.name}</h3>
                                    <span className="candidate-role-sub">{leaderA.current_role || leaderA.party}</span>
                                    <div className="candidate-metric red-metric">
                                      <span className="metric-number">{leaderA.attendance_rate}%</span>
                                      <span className="metric-label">{t.nav.attendance}</span>
                                    </div>
                                    <div className="candidate-votes-total">
                                      <strong>{leaderA.total_speeches}</strong>
                                      <span>{t.nav.recordedSpeeches}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="matchup-center-nexus">
                                  <div className="vs-neon-orb">
                                    <span>VS</span>
                                  </div>
                                  <div className="lead-pill-badge">
                                    <span className="lead-indicator-dot" />
                                    <span>
                                      {diff >= 0
                                        ? `${leaderA.party_code} LEAD · +${diff} SPEECHES`
                                        : `${leaderB.party_code} LEAD · +${Math.abs(diff)} SPEECHES`}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className="candidate-column candidate-right"
                                  onClick={() => open("mp", leaderB.id)}
                                  style={{ cursor: "pointer" }}
                                  title={`View profile for ${leaderB.name}`}
                                >
                                  <div className="candidate-details align-right">
                                    <h3 className="candidate-name">{leaderB.name}</h3>
                                    <span className="candidate-role-sub">{leaderB.current_role || leaderB.party}</span>
                                    <div className="candidate-metric blue-metric">
                                      <span className="metric-number">{leaderB.attendance_rate}%</span>
                                      <span className="metric-label">{t.nav.attendance}</span>
                                    </div>
                                    <div className="candidate-votes-total align-right">
                                      <strong>{leaderB.total_speeches}</strong>
                                      <span>{t.nav.recordedSpeeches}</span>
                                    </div>
                                  </div>
                                  <div className="candidate-avatar-wrapper ring-blue">
                                    <div className="candidate-avatar">
                                      <span className="candidate-initials">{initials(leaderB.name)}</span>
                                    </div>
                                    <span className="candidate-badge-party blue-bg">{leaderB.party_code}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="broadcast-progress-container">
                                <div className="progress-top-labels">
                                  <span><strong className="neon-red-text">{leaderA.party_code}</strong> {leaderA.total_speeches} speeches</span>
                                  <span className="label-center-meta">{t.nav.speechVolumeProportion}</span>
                                  <span><strong className="neon-blue-text">{leaderB.party_code}</strong> {leaderB.total_speeches} speeches</span>
                                </div>
                                <div className="progress-dual-bar">
                                  <div className="bar-segment bar-segment-red" style={{ width: `${shareA}%` }} />
                                  <div className="bar-segment bar-segment-divider" style={{ width: "2%" }} />
                                  <div className="bar-segment bar-segment-blue" style={{ width: `${shareB}%` }} />
                                </div>
                                <div className="progress-bottom-labels">
                                  <span className="neon-red-text">{shareA}%</span>
                                  <span className="muted-share">{leaderA.district} vs {leaderB.district}</span>
                                  <span className="neon-blue-text">{shareB}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="inline-note">
                          {t.compare.noStance}
                        </div>
                        <div className="table-scroll">
                          <table className="comparison-table">
                            <thead>
                              <tr>
                                <th>{t.compare.stanceMatrix}</th>
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
                                      {t.mps.viewProfile} <ArrowUpRight size={13} />
                                    </button>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {comparisonTopics.map((topic) => (
                                <tr key={topic}>
                                  <th scope="row">{topic}</th>
                                  {selectedLeaders.map((m) => (
                                    <td key={m.id}>
                                      {m.stances[topic] || (
                                        <span className="muted">
                                          {t.compare.noStance}
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
                        {t.saved.desc}
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
                      <Empty title={t.saved.noSavedTitle}>
                        {t.saved.noSavedDesc}
                      </Empty>
                    )}
                    {!!saved.length && (
                      <p className="muted small">
                        {t.saved.storageUnavailable}
                      </p>
                    )}
                  </>
                )}
                {page === "trail" && route.trail && (
                  <EvidenceTrailView
                    recordId={route.trail.id}
                    recordKind={route.trail.kind}
                    onBack={returnFromTrail}
                    onOpenSpeech={(speechId) => open("speech", speechId)}
                    onOpenCommitment={(commitmentId) => open("commitment", commitmentId)}
                  />
                )}
              </div>
            )
          )}
          <footer className="footer">
            <span>
              <Landmark size={14} /> {t.brand.title} <span className="dot">/</span>{" "}
              Public information. Better understood.
            </span>
            <button onClick={() => setHelp(true)}>
              {t.dialogs.aboutTitle} <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {route.selection && data && (
        <Dialog title={t.nav.recordDetails} onClose={closeDetail} wide>
          <div className="detail-body">
            <div className="detail-tools">
              <span className="status neutral">
                {data.meta.mode === "demo"
                  ? t.dialogs.aboutIntro
                  : t.common.verified}
              </span>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {(selectedSpeech || selectedCommitment) && (
                  <button
                    type="button"
                    className="what-happened-after-btn"
                    title={t.trail.whatHappenedAfter}
                    onClick={() => {
                      if (selectedSpeech) openEvidenceTrail(selectedSpeech.id, "speech");
                      if (selectedCommitment) openEvidenceTrail(selectedCommitment.id, "commitment");
                    }}
                  >
                    <Clock3 size={15} /> {t.trail.whatHappenedAfter}
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={t.dialogs.exportJson}
                  onClick={exportRecord}
                >
                  <ArrowDownToLine size={17} />
                </button>
                <button
                  className="button small-button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.href);
                      setToast(t.nav.recordLinkCopied);
                    } catch {
                      setToast(
                        "Copy the record link from your browser address bar",
                      );
                    }
                  }}
                >
                  {t.nav.copyLink}
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
                  <div style={{ flex: 1 }}>
                    <strong>{t.nav.officialHansardRecord}</strong>
                    <p>
                      {selectedSpeech.hansard_vol} · Pages {selectedSpeech.hansard_page}
                    </p>
                    <div className="source-box-actions">
                      <SourceLink url={selectedSpeech.hansard_pdf_url}>
                        {t.nav.openOfficialHansard}
                      </SourceLink>
                      <button
                        type="button"
                        className="button small-button hansard-preview-btn"
                        onClick={() => setShowHansardPreview(!showHansardPreview)}
                      >
                        {showHansardPreview ? t.nav.hideHansardPreview : t.nav.previewHansard}
                      </button>
                      <button
                        type="button"
                        className="button small-button primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                        onClick={() => openEvidenceTrail(selectedSpeech.id, "speech")}
                      >
                        <Clock3 size={14} /> {t.trail.whatHappenedAfter}
                      </button>
                    </div>
                  </div>
                  <span className="muted small">{t.nav.officialArchive}</span>
                </div>

                {showHansardPreview && (
                  <div className="hansard-document-preview">
                    <div className="hansard-doc-head">
                      <div>
                        <span className="hansard-seal">{t.nav.originalHansardLabel}</span>
                        <h3>OFFICIAL REPORT (HANSARD)</h3>
                        <p className="hansard-doc-meta">
                          <strong>{selectedSpeech.hansard_vol}</strong> · Sitting Date: <strong>{date(selectedSpeech.sitting_date)}</strong> · Pages: <strong>{selectedSpeech.hansard_page}</strong>
                        </p>
                      </div>
                      <span className="hansard-badge">{t.common.verified}</span>
                    </div>
                    <div className="hansard-doc-body">
                      <div className="hansard-speaker-tag">
                        <strong>SPEAKER:</strong> {selectedSpeech.speaker_name} ({selectedSpeech.session_name})
                      </div>
                      <div className="hansard-subject-tag">
                        <strong>TOPIC:</strong> {selectedSpeech.topic} — {selectedSpeech.title}
                      </div>
                      <div className="hansard-text-block">
                        <p className="hansard-quote">
                          {transcriptLang === "si" && selectedSpeech.segments.some((s) => s.text_si)
                            ? selectedSpeech.segments.map((s) => s.text_si || s.text_en).join(" ")
                            : transcriptLang === "ta" && selectedSpeech.segments.some((s) => s.text_ta)
                              ? selectedSpeech.segments.map((s) => s.text_ta || s.text_en).join(" ")
                              : selectedSpeech.segments.map((s) => s.text_en).join(" ") || selectedSpeech.summary}
                        </p>
                      </div>
                      <div className="hansard-footer-note">
                        <span>{t.nav.officialArchiveCitation}: <code>{selectedSpeech.hansard_vol.replace(/\s+/g, '_')}_p{selectedSpeech.hansard_page}</code></span>
                        <span className="muted">{t.nav.parliamentPdfNote}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="section-head">
                  <h3>{t.speeches.transcriptHeading}</h3>
                  <select
                    aria-label={t.speeches.selectTranscriptLang}
                    value={transcriptLang}
                    onChange={(e) => setTranscriptLang(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="si">සිංහල</option>
                    <option value="ta">தமிழ்</option>
                  </select>
                </div>
                <p className="muted small">
                  {t.nav.timestampsNote}
                </p>
                <div className="speech-narration-bar">
                  <div className="narration-info">
                    <Volume2 size={16} />
                    <span>{t.voice.generatedNarration}</span>
                  </div>
                  <div className="narration-actions">
                    {tts.status === "playing" ? (
                      <>
                        <button
                          type="button"
                          className="button small-button"
                          onClick={tts.pause}
                          title={t.voice.pauseReading}
                        >
                          <Pause size={14} /> {t.voice.pauseReading}
                        </button>
                        <button
                          type="button"
                          className="button small-button"
                          onClick={tts.stop}
                          title={t.voice.stopReading}
                        >
                          <Square size={14} /> {t.voice.stopReading}
                        </button>
                      </>
                    ) : tts.status === "paused" ? (
                      <>
                        <button
                          type="button"
                          className="button small-button primary"
                          onClick={tts.resume}
                          title={t.voice.resumeReading}
                        >
                          <Play size={14} /> {t.voice.resumeReading}
                        </button>
                        <button
                          type="button"
                          className="button small-button"
                          onClick={tts.stop}
                          title={t.voice.stopReading}
                        >
                          <Square size={14} /> {t.voice.stopReading}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="button small-button"
                        onClick={() => {
                          const fullText = selectedSpeech.segments
                            .map((seg) => {
                              if (transcriptLang === "si") return seg.text_si || seg.text_en;
                              if (transcriptLang === "ta") return seg.text_ta || seg.text_en;
                              return seg.text_en;
                            })
                            .join(". ");
                          tts.speak(fullText || selectedSpeech.summary, transcriptLang as Language);
                        }}
                      >
                        <Volume2 size={14} /> {t.voice.readAloud}
                      </button>
                    )}
                  </div>
                </div>
                <div className="transcript">
                  {selectedSpeech.segments.map((seg) => {
                    const translation =
                      transcriptLang === "si"
                        ? seg.text_si
                        : transcriptLang === "ta"
                          ? seg.text_ta
                          : seg.text_en;
                    const segmentText = translation || seg.text_en;
                    const isPlayingThis = tts.status === "playing" && tts.currentText === segmentText;
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
                              {t.nav.translationUnavailable}
                            </span>
                          )}
                          <p lang={translation ? transcriptLang : "en"}>
                            {translation || seg.text_en}
                          </p>
                          <span className="muted small">{seg.claim_type}</span>
                        </div>
                        <button
                          type="button"
                          className={`speech-row-speak ${isPlayingThis ? "is-active" : ""}`}
                          title={isPlayingThis ? t.voice.stopReading : t.voice.readAloud}
                          aria-label={isPlayingThis ? t.voice.stopReading : t.voice.readAloud}
                          onClick={() => {
                            if (isPlayingThis) {
                              tts.stop();
                            } else {
                              tts.speak(segmentText, (translation ? transcriptLang : "en") as Language);
                            }
                          }}
                        >
                          {isPlayingThis ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                      </div>
                    );
                  })}
                  {!selectedSpeech.segments.length && (
                    <Empty title={t.nav.transcriptUnavailable}>
                      {t.speeches.noSpeechesDesc}
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
                  {t.commitments.auditVerdict}: {selectedCommitment.current_status}. {t.commitments.unreviewedAssessment}.
                </div>
                <p>{selectedCommitment.verdict_summary}</p>
                <div className="target-grid">
                  <div>
                    <span className="eyebrow">{t.commitments.targetMetric.toUpperCase()}</span>
                    <p>{selectedCommitment.target_metric}</p>
                  </div>
                  <div>
                    <span className="eyebrow">{t.commitments.latestMetric.toUpperCase()}</span>
                    <p>{selectedCommitment.achieved_metric}</p>
                  </div>
                </div>
                <div style={{ margin: "18px 0 20px" }}>
                  <button
                    type="button"
                    className="what-happened-after-btn"
                    onClick={() => openEvidenceTrail(selectedCommitment.id, "commitment")}
                  >
                    <Clock3 size={15} /> {t.trail.whatHappenedAfter}
                  </button>
                </div>
                <h3>{t.commitments.verificationTrail}</h3>
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
              <MPActivityProfile
                mp={selectedMP}
                initialFilters={{ dateFrom: mpDateFrom, dateTo: mpDateTo }}
                onClose={closeDetail}
                onOpenSpeech={(speechId) => open("speech", speechId)}
              />
            )}
            {selectedTimeline && (
              <>
                <span className="eyebrow">
                  {selectedTimeline.topic} · {selectedTimeline.time_span}
                </span>
                <h2 className="detail-title">{selectedTimeline.title}</h2>
                <p className="lead">{selectedTimeline.description}</p>
                <div className="inline-note">
                  {t.nav.eventsShowChronology}
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
                    {t.nav.viewIndicatorData} <ChevronDown size={16} />
                  </summary>
                  <p className="muted small">
                    {t.timelines.verifiedCitation}
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
                <Empty title={t.nav.recordNotFound}>
                  {t.nav.recordNotFoundDesc}
                </Empty>
              )}
          </div>
        </Dialog>
      )}
      {help && (
        <Dialog title={t.nav.aboutPilot.toUpperCase()} onClose={() => setHelp(false)}>
          <div className="detail-body">
            <span className="brand-mark">
              <Landmark size={24} />
            </span>
            <h2 className="detail-title">
              {t.dialogs.aboutIntro}
            </h2>
            <p>{t.dialogs.aboutP1}</p>
            <h3>{t.overview.whatYoureLookingAt}</h3>
            <p>
              {data?.meta.mode === "mongodb"
                ? t.dialogs.aboutP2
                : t.dialogs.aboutP3}
            </p>
            <h3>{t.overview.ourEvidenceRules}</h3>
            <ul className="method-list">
              <li>{t.nav.readOriginalRecord}</li>
              <li>{t.nav.statementNotProof}</li>
              <li>{t.nav.missingEvidenceNote}</li>
              <li>{t.nav.policyOutcomes}</li>
            </ul>
            <h3>{t.nav.stillBeingBuilt}</h3>
            <p>{t.nav.stillBeingBuiltDesc}</p>
            <p className="muted small">
              {t.nav.savedItemsNote} {data?.meta.mode || t.nav.datasetMode}.
              {data?.meta.loaded_at &&
                ` ${t.nav.snapshotLoaded} ${new Date(data.meta.loaded_at).toLocaleString("en-GB")}.`}
            </p>
          </div>
        </Dialog>
      )}
      {aiModalOpen && (
        <Dialog title={t.nav.aiModalTitle} onClose={() => setAiModalOpen(false)} wide>
          <div className="ai-modal-content">
            <div className="ai-modal-intro">
              <p className="muted" style={{ margin: 0 }}>
                {t.nav.aiModalDesc}
              </p>
            </div>

            <form
              className="ai-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (aiQuestion.trim()) runAiQuery(aiQuestion);
              }}
            >
              <div className="ai-input-wrap">
                <input
                  type="text"
                  className="ai-input"
                  placeholder="e.g., What did Dr. Harsha de Silva say about VAT exemptions?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  disabled={aiLoading}
                  autoFocus
                />
                <button type="submit" className="button primary" disabled={aiLoading || !aiQuestion.trim()}>
                  {aiLoading ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  <span>{aiLoading ? t.nav.aiThinking : t.nav.aiAsk}</span>
                </button>
              </div>
            </form>

            <div className="ai-quick-prompts">
              <span className="eyebrow">{t.nav.aiSuggestedInquiries}</span>
              <div className="choice-list">
                {[
                  "What did Dr. Harsha de Silva say about VAT exemptions?",
                  "What are the recorded commitments on public debt?",
                  "Summarize Hansard records on free healthcare funding",
                  "What did Anura Kumara Dissanayake state on procurement?",
                ].map((promptText) => (
                  <button
                    key={promptText}
                    type="button"
                    className="choice"
                    onClick={() => {
                      setAiQuestion(promptText);
                      runAiQuery(promptText);
                    }}
                    disabled={aiLoading}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>

            {aiLoading && (
              <div className="ai-loading-state">
                <Loader2 size={28} className="spin" />
                <p>Retrieving parliamentary records and synthesizing grounded response...</p>
              </div>
            )}

            {aiResult && !aiLoading && (
              <div className="ai-result-card">
                <div className="ai-result-head">
                  <div className="ai-badge-group">
                    <span className="badge badge-verified">
                      <Sparkles size={13} /> {aiResult.confidence_score > 0 ? `${aiResult.confidence_score}% ${t.nav.aiGrounded}` : t.nav.aiExtractiveRecord}
                    </span>
                    <span className="badge">
                      {aiResult.citations.length} Citation{aiResult.citations.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {aiResult.answer && (
                    <button
                      type="button"
                      className="icon-button"
                      title="Listen to answer"
                      onClick={() => tts.speak(aiResult.answer)}
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>

                <div className="ai-answer-text">
                  <p style={{ margin: 0 }}>{aiResult.answer}</p>
                </div>

                {aiResult.citations.length > 0 && (
                  <div className="ai-citations-section">
                    <span className="eyebrow">{t.nav.aiCitations}</span>
                    <div className="ai-citations-list">
                      {aiResult.citations.map((c, idx) => (
                        <div key={idx} className="ai-citation-item">
                          <div className="ai-citation-info">
                            <strong>{c.title}</strong>
                            <span className="muted">{c.source_type} · {c.ref_code}</span>
                          </div>
                          <div className="ai-citation-actions">
                            {c.speech_id && (
                              <button
                                type="button"
                                className="button small-button"
                                onClick={() => {
                                  setAiModalOpen(false);
                                  open("speech", c.speech_id!);
                                }}
                              >
                                {t.nav.viewSpeech}
                              </button>
                            )}
                            {c.url && (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="source-link"
                              >
                                {t.nav.hansardPdf} <ArrowUpRight size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiResult.missing_evidence_flags && aiResult.missing_evidence_flags.length > 0 && (
                  <div className="inline-note">
                    {aiResult.missing_evidence_flags.join(" ")}
                  </div>
                )}
              </div>
            )}
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
