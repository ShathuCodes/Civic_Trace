import React, { useMemo, useState, useEffect } from "react";
import { ArrowUpRight, ChevronRight, Pause, Play } from "lucide-react";
import type { MP } from "./types";
import { useLanguage } from "./i18n/LanguageContext";

const BROADCAST_I18N = {
  en: {
    tab1: "01 · LEADERS REPLAY",
    tab2: "02 · CHAMBER VERDICT",
    tagRecord: "[ 2024 GENERAL ELECTIONS — LIVE CHAMBER RECORD ]",
    liveReplay: "LIVE REPLAY",
    titleMain: "Parliamentary Mandate — ",
    titleReplayed: "Replayed",
    subtitle: "The night the parliamentary majority was secured — verified Hansard records, chamber attendance reliability, and speech volume between the key parliamentary leaders.",
    chamberAttendance: "CHAMBER ATTENDANCE",
    hansardSpeeches: "HANSARD SPEECHES",
    compareStances: "Compare Stances",
    speechesShare: "SPEECH VOLUME SHARE IN PARLIAMENT",
    share: "Share",
    speechesCount: "Speeches",
    verdictTag: "[ OFFICIAL DECLARATION · 10TH PARLIAMENT OF SRI LANKA ]",
    theVerdictPrefix: "The ",
    theVerdictGlow: "Verdict",
    verdictSubtitle: "225 Seats · 10th Parliament · Constitutional Two-Thirds Supermajority Secured",
    nppPartyName: "National People's Power",
    sjbPartyName: "Samagi Jana Balawegaya",
    seatsWon: "SEATS WON",
    shareUpper: "SHARE",
    votesUpper: "VOTES",
    majority113: "MAJORITY 113",
    supermajority: "NPP SUPERMAJORITY",
    seatsOverSjb: "SEATS OVER SJB",
    breaking: "BREAKING",
    estNpp: "EST. NPP",
    turnout: "TURNOUT",
    turnoutSub: "VERIFIED NATIONAL",
    confirmedSeats: "225 SEATS CONFIRMED",
    supermajorityDeclared: "CONSTITUTIONAL SUPERMAJORITY DECLARED"
  },
  si: {
    tab1: "01 · නායකයන්ගේ වාර්තාව",
    tab2: "02 · සභා තීන්දුව",
    tagRecord: "[ 2024 මහ මැතිවරණය — සභා වාර්තාව ]",
    liveReplay: "සජීවී වාර්තාව",
    titleMain: "පාර්ලිමේන්තු ජනවරම — ",
    titleReplayed: "සමාලෝචනය",
    subtitle: "පාර්ලිමේන්තු බහුතරය තහවුරු කළ රාත්‍රිය — තහවුරු කළ හැන්සාඩ් වාර්තා, සභා පැමිණීමේ විශ්වාසනීයත්වය, සහ ප්‍රධාන නායකයන්ගේ කථන ප්‍රමාණය.",
    chamberAttendance: "සභා පැමිණීම",
    hansardSpeeches: "හැන්සාඩ් කතා",
    compareStances: "ස්ථාවරයන් සංසන්දනය",
    speechesShare: "පාර්ලිමේන්තුවේ කථන ප්‍රමාණයේ ප්‍රතිශතය",
    share: "ප්‍රතිශතය",
    speechesCount: "කතා",
    verdictTag: "[ නිල ප්‍රකාශය · 10 වන ශ්‍රී ලංකා පාර්ලිමේන්තුව ]",
    theVerdictPrefix: "සභා ",
    theVerdictGlow: "තීන්දුව",
    verdictSubtitle: "ආසන 225 · 10 වන පාර්ලිමේන්තුව · ව්‍යවස්ථාදායක 2/3 ක බහුතරය තහවුරු විය",
    nppPartyName: "ජාතික ජන බලවේගය",
    sjbPartyName: "සමගි ජන බලවේගය",
    seatsWon: "දිනූ ආසන",
    shareUpper: "ප්‍රතිශතය",
    votesUpper: "ඡන්ද",
    majority113: "බහුතරය 113",
    supermajority: "ජාජබ සුපිරි බහුතරය",
    seatsOverSjb: "සජබ ට වඩා ආසන",
    breaking: "විශේෂ පුවත්",
    estNpp: "ජාජබ ඇස්තමේන්තුව",
    turnout: "ප්‍රකාශිත ඡන්ද",
    turnoutSub: "ජාතික තහවුරු කළ",
    confirmedSeats: "ආසන 225 තහවුරු විය",
    supermajorityDeclared: "ව්‍යවස්ථාදායක සුපිරි බහුතරය ප්‍රකාශයට පත් කෙරිණි"
  },
  ta: {
    tab1: "01 · தலைவர்கள் பதிவு",
    tab2: "02 · சபை தீர்ப்பு",
    tagRecord: "[ 2024 பொதுத் தேர்தல் — நேரடி சபை பதிவு ]",
    liveReplay: "நேரடி மறுபதிவு",
    titleMain: "நாடாளுமன்ற ஆணை — ",
    titleReplayed: "மீளாய்வு",
    subtitle: "நாடாளுமன்ற பெரும்பான்மை உறுதிசெய்யப்பட்ட இரவு — சரிபார்க்கப்பட்ட ஹன்சார்ட் பதிவுகள், சபை வருகை நம்பகத்தன்மை மற்றும் முக்கிய தலைவர்களின் உரை அளவு.",
    chamberAttendance: "சபை வருகை",
    hansardSpeeches: "ஹன்சார்ட் உரைகள்",
    compareStances: "நிலைகளை ஒப்பிடுக",
    speechesShare: "நாடாளுமன்றத்தில் உரை அளவு பங்கு",
    share: "பங்கு",
    speechesCount: "உரைகள்",
    verdictTag: "[ உத்தியோகபூர்வ அறிவிப்பு · 10வது இலங்கை நாடாளுமன்றம் ]",
    theVerdictPrefix: "",
    theVerdictGlow: "தீர்ப்பு",
    verdictSubtitle: "225 இடங்கள் · 10வது நாடாளுமன்றம் · மூன்றில் இரண்டு பங்கு பெரும்பான்மை உறுதி செய்யப்பட்டது",
    nppPartyName: "தேசிய மக்கள் சக்தி",
    sjbPartyName: "ஐக்கிய மக்கள் சக்தி",
    seatsWon: "வென்ற இடங்கள்",
    shareUpper: "பங்கு",
    votesUpper: "வாக்குகள்",
    majority113: "பெரும்பான்மை 113",
    supermajority: "NPP பெரும்பான்மை",
    seatsOverSjb: "SJB ஐ விட கூடுதல் இடங்கள்",
    breaking: "முக்கிய செய்தி",
    estNpp: "மதிப்பீடு NPP",
    turnout: "வாக்களிப்பு",
    turnoutSub: "தேசிய சரிபார்க்கப்பட்டது",
    confirmedSeats: "225 இடங்கள் உறுதி செய்யப்பட்டன",
    supermajorityDeclared: "அரசியலமைப்பு மூன்றில் இரண்டு பெரும்பான்மை அறிவிக்கப்பட்டது"
  }
};

interface ElectionBroadcastHeroProps {
  mps?: MP[];
  onOpenMP?: (id: string) => void;
  onExploreCompare?: () => void;
}

export function ElectionBroadcastHero({
  mps = [],
  onOpenMP,
  onExploreCompare,
}: ElectionBroadcastHeroProps) {
  const { language } = useLanguage();
  const bt = BROADCAST_I18N[language as keyof typeof BROADCAST_I18N] || BROADCAST_I18N.en;
  // Resolve real MP records from dataset
  const leaderA = useMemo(() => {
    return (
      mps.find((m) => m.id === "mp-akd") ||
      mps[0] || {
        id: "mp-akd",
        name: "Anura Kumara Dissanayake",
        role: "President of Sri Lanka / NPP Leader",
        party: "National People's Power (NPP)",
        party_code: "NPP",
        attendance_rate: 94.2,
        total_speeches: 148,
        votes_attended: 212,
      }
    );
  }, [mps]);

  const leaderB = useMemo(() => {
    return (
      mps.find((m) => m.id === "mp-sajith") ||
      mps[1] || {
        id: "mp-sajith",
        name: "Sajith Premadasa",
        role: "Leader of the Opposition",
        party: "Samagi Jana Balawegaya (SJB)",
        party_code: "SJB",
        attendance_rate: 91.8,
        total_speeches: 192,
        votes_attended: 230,
      }
    );
  }, [mps]);

  // Reliable calculations from dataset
  const totalSpeeches = (leaderA.total_speeches || 1) + (leaderB.total_speeches || 1);
  const speechShareA = Math.round(((leaderA.total_speeches || 1) / totalSpeeches) * 100);
  const speechShareB = 100 - speechShareA;

  // Real 10th Parliament seats
  const nppSeats = 159;
  const sjbSeats = 40;
  const itakSeats = 8;
  const otherSeats = 18;
  const totalChamberSeats = 225;
  const seatLead = nppSeats - sjbSeats; // +119

  // Continuous timer / carousel rotation
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const SLIDE_DURATION_MS = 6500;

  useEffect(() => {
    if (isPaused) return;

    const intervalStep = 50; // update progress bar every 50ms
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveSlide((curr) => (curr === 0 ? 1 : 0));
          return 0;
        }
        return prev + (intervalStep / SLIDE_DURATION_MS) * 100;
      });
    }, intervalStep);

    return () => clearInterval(timer);
  }, [isPaused, activeSlide]);

  const handleSelectSlide = (idx: 0 | 1) => {
    setActiveSlide(idx);
    setProgress(0);
  };

  const [hoveredSeat, setHoveredSeat] = useState<number | null>(null);

  // Generate 225 parliamentary seats arranged in a realistic hemicycle arc (5 concentric rows)
  const hemicycleSeats = useMemo(() => {
    const seats: Array<{
      id: number;
      x: number;
      y: number;
      party: "NPP" | "SJB" | "OTHER";
      color: string;
      row: number;
    }> = [];

    const rows = [
      { radius: 95, count: 28 },
      { radius: 120, count: 38 },
      { radius: 145, count: 46 },
      { radius: 170, count: 54 },
      { radius: 195, count: 59 },
    ];

    let seatIndex = 0;
    rows.forEach((row, rowIndex) => {
      const startAngle = Math.PI - 0.15;
      const endAngle = 0.15;
      const step = (startAngle - endAngle) / (row.count - 1);

      for (let i = 0; i < row.count; i++) {
        const angle = startAngle - i * step;
        const x = 250 + row.radius * Math.cos(angle);
        const y = 230 - row.radius * Math.sin(angle);

        let party: "NPP" | "SJB" | "OTHER" = "NPP";
        let color = "#16a34a";

        if (seatIndex < nppSeats) {
          party = "NPP";
          color = "#16a34a";
        } else if (seatIndex < nppSeats + sjbSeats) {
          party = "SJB";
          color = "#0d9488";
        } else {
          party = "OTHER";
          color = seatIndex % 2 === 0 ? "#10b981" : "#d97706";
        }

        seats.push({
          id: seatIndex,
          x,
          y,
          party,
          color,
          row: rowIndex,
        });

        seatIndex++;
      }
    });

    return seats;
  }, [nppSeats, sjbSeats]);

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

  return (
    <div
      className="broadcast-suite"
      aria-label="Parliamentary Broadcast Control Room"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── BROADCAST CONTROL HEADER & TIMED TABS ─────────────── */}
      <div className="broadcast-tab-controller">
        <div className="broadcast-tabs-left">
          <button
            type="button"
            className={`broadcast-tab-pill ${activeSlide === 0 ? "active" : ""}`}
            onClick={() => handleSelectSlide(0)}
          >
            <span className="pill-dot red-dot" />
            <span>{bt.tab1}</span>
          </button>
          <button
            type="button"
            className={`broadcast-tab-pill ${activeSlide === 1 ? "active" : ""}`}
            onClick={() => handleSelectSlide(1)}
          >
            <span className="pill-dot blue-dot" />
            <span>{bt.tab2}</span>
          </button>
        </div>

        <div className="broadcast-timer-controls">
          <div className="timer-progress-track" title="Slide timer progress">
            <div
              className="timer-progress-fill"
              style={{ width: `${isPaused ? progress : progress}%` }}
            />
          </div>
          <button
            type="button"
            className="broadcast-control-icon-btn"
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume auto-rotation" : "Pause auto-rotation"}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button
            type="button"
            className="broadcast-control-icon-btn"
            onClick={() => handleSelectSlide(activeSlide === 0 ? 1 : 0)}
            title="Toggle view"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── SLIDE 0: ELECTION NIGHT LEADERS REPLAY ─────────────── */}
      {activeSlide === 0 && (
        <section className="broadcast-card broadcast-card-matchup animate-fade">
          <div className="broadcast-card-top-tag">
            <span className="live-bracket-tag">
              {bt.tagRecord}
            </span>
            <div className="broadcast-live-badge">
              <span className="broadcast-pulse-dot" />
              <span>{bt.liveReplay}</span>
            </div>
          </div>

          <div className="broadcast-header-block">
            <h2 className="broadcast-title">
              {bt.titleMain}<span className="neon-red-text">{bt.titleReplayed}</span>
            </h2>
            <p className="broadcast-subtitle">
              {bt.subtitle}
            </p>
          </div>

          <div className="matchup-stage">
            {/* Left Candidate (Red) */}
            <div
              className="candidate-column candidate-left"
              onClick={() => onOpenMP?.(leaderA.id)}
              role="button"
              tabIndex={0}
              title={`View verified record for ${leaderA.name}`}
            >
              <div className="candidate-avatar-wrapper ring-red">
                <div className="candidate-avatar">
                  <span className="candidate-initials">{initials(leaderA.name)}</span>
                </div>
                <span className="candidate-badge-party red-bg">
                  {leaderA.party_code || "NPP"}
                </span>
              </div>

              <div className="candidate-details">
                <h3 className="candidate-name">{leaderA.name}</h3>
                <span className="candidate-role-sub">
                  {(leaderA as any).current_role || leaderA.party}
                </span>
                <div className="candidate-metric red-metric">
                  <span className="metric-number">
                    {leaderA.attendance_rate || 94.2}%
                  </span>
                  <span className="metric-label">{bt.chamberAttendance}</span>
                </div>
                <div className="candidate-votes-total">
                  <strong>{leaderA.total_speeches || 148}</strong>
                  <span>{bt.hansardSpeeches}</span>
                </div>
              </div>
            </div>

            {/* Center VS & Lead Pill */}
            <div className="matchup-center-nexus">
              <div className="vs-neon-orb">
                <span>VS</span>
              </div>
              <div className="lead-pill-badge">
                <span className="lead-indicator-dot" />
                <span>
                  {leaderA.attendance_rate >= leaderB.attendance_rate
                    ? `${leaderA.party_code || "NPP"} +${(leaderA.attendance_rate - leaderB.attendance_rate).toFixed(1)}% ${bt.chamberAttendance}`
                    : `${leaderB.party_code || "SJB"} +${(leaderB.attendance_rate - leaderA.attendance_rate).toFixed(1)}% ${bt.chamberAttendance}`}
                </span>
              </div>
              {onExploreCompare && (
                <button
                  type="button"
                  className="vs-compare-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExploreCompare();
                  }}
                >
                  {bt.compareStances} <ArrowUpRight size={13} />
                </button>
              )}
            </div>

            {/* Right Candidate (Blue) */}
            <div
              className="candidate-column candidate-right"
              onClick={() => onOpenMP?.(leaderB.id)}
              role="button"
              tabIndex={0}
              title={`View verified record for ${leaderB.name}`}
            >
              <div className="candidate-details align-right">
                <h3 className="candidate-name">{leaderB.name}</h3>
                <span className="candidate-role-sub">
                  {(leaderB as any).current_role || leaderB.party}
                </span>
                <div className="candidate-metric blue-metric">
                  <span className="metric-number">
                    {leaderB.attendance_rate || 91.8}%
                  </span>
                  <span className="metric-label">{bt.chamberAttendance}</span>
                </div>
                <div className="candidate-votes-total align-right">
                  <strong>{leaderB.total_speeches || 192}</strong>
                  <span>{bt.hansardSpeeches}</span>
                </div>
              </div>

              <div className="candidate-avatar-wrapper ring-blue">
                <div className="candidate-avatar">
                  <span className="candidate-initials">{initials(leaderB.name)}</span>
                </div>
                <span className="candidate-badge-party blue-bg">
                  {leaderB.party_code || "SJB"}
                </span>
              </div>
            </div>
          </div>

          {/* Dual-Tone Glowing Horizontal Bar */}
          <div className="broadcast-progress-container">
            <div className="progress-top-labels">
              <span className="label-left-votes">
                <strong className="neon-red-text">{leaderA.party_code || "NPP"}</strong>{" "}
                {leaderA.total_speeches} {bt.speechesCount}
              </span>
              <span className="label-center-meta">
                {bt.speechesShare}
              </span>
              <span className="label-right-votes">
                <strong className="neon-blue-text">{leaderB.party_code || "SJB"}</strong>{" "}
                {leaderB.total_speeches} {bt.speechesCount}
              </span>
            </div>

            <div className="progress-dual-bar">
              <div
                className="bar-segment bar-segment-red"
                style={{ width: `${speechShareA}%` }}
              />
              <div
                className="bar-segment bar-segment-divider"
                style={{ width: "2%" }}
              />
              <div
                className="bar-segment bar-segment-blue"
                style={{ width: `${speechShareB}%` }}
              />
            </div>

            <div className="progress-bottom-labels">
              <span className="neon-red-text">{speechShareA}% {bt.share}</span>
              <span className="muted-share">
                {(leaderA as any).district || "Colombo"} vs {(leaderB as any).district || "Colombo"}
              </span>
              <span className="neon-blue-text">{speechShareB}% {bt.share}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── SLIDE 1: THE VERDICT & HEMICYCLE SEATING ─────────────── */}
      {activeSlide === 1 && (
        <section className="broadcast-card broadcast-card-verdict animate-fade">
          <div className="broadcast-card-top-tag center-tag">
            <span className="live-bracket-tag">
              {bt.verdictTag}
            </span>
          </div>

          <div className="verdict-header-block">
            <h2 className="verdict-title">
              {bt.theVerdictPrefix}<span className="neon-verdict-gradient">{bt.theVerdictGlow}</span>
            </h2>
            <p className="verdict-subtitle">
              {bt.verdictSubtitle}
            </p>
          </div>

          <div className="verdict-main-stage">
            {/* Left: NPP Seat Box */}
            <div className="party-stat-card card-npp">
              <div className="stat-card-badge red-tag">NPP</div>
              <div className="stat-card-party-name">{bt.nppPartyName}</div>
              <div className="stat-card-seats-won red-glow-text">{nppSeats}</div>
              <div className="stat-card-seats-label">{bt.seatsWon}</div>
              <div className="stat-card-mini-breakdown">
                <div className="mini-item">
                  <span className="mini-label">{bt.shareUpper}</span>
                  <span className="mini-val">61.6%</span>
                </div>
                <div className="mini-item">
                  <span className="mini-label">{bt.votesUpper}</span>
                  <span className="mini-val">6,863,186</span>
                </div>
              </div>
            </div>

            {/* Center: Parliamentary Hemicycle Graphic */}
            <div className="chamber-hemicycle-wrapper">
              <div className="chamber-majority-line">
                <div className="majority-pin">
                  <span>{bt.majority113}</span>
                </div>
              </div>

              <svg
                className="chamber-hemicycle-svg"
                viewBox="0 0 500 250"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Parliamentary Hemicycle 225 Seats Arc"
              >
                <defs>
                  <filter id="glow-red-seat" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#16a34a" floodOpacity="0.75" />
                  </filter>
                  <filter id="glow-blue-seat" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0d9488" floodOpacity="0.75" />
                  </filter>
                  <filter id="glow-cyan-seat" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#d97706" floodOpacity="0.75" />
                  </filter>
                </defs>

                <line
                  x1="250"
                  y1="30"
                  x2="250"
                  y2="225"
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />

                {hemicycleSeats.map((seat) => {
                  const isHovered = hoveredSeat === seat.id;
                  const filterId =
                    seat.party === "NPP"
                      ? "url(#glow-red-seat)"
                      : seat.party === "SJB"
                        ? "url(#glow-blue-seat)"
                        : "url(#glow-cyan-seat)";

                  return (
                    <circle
                      key={seat.id}
                      cx={seat.x}
                      cy={seat.y}
                      r={isHovered ? 4.8 : 3.4}
                      fill={seat.color}
                      filter={filterId}
                      opacity={hoveredSeat !== null && !isHovered ? 0.45 : 0.95}
                      onMouseEnter={() => setHoveredSeat(seat.id)}
                      onMouseLeave={() => setHoveredSeat(null)}
                      style={{
                        transition: "transform 0.15s, r 0.15s, opacity 0.15s",
                        cursor: "pointer",
                      }}
                    />
                  );
                })}
              </svg>

              <div className="chamber-center-badge">
                <span className="badge-party-lead">{bt.supermajority}</span>
                <span className="badge-seat-count">+{seatLead}</span>
                <span className="badge-comparison">{bt.seatsOverSjb}</span>
              </div>
            </div>

            {/* Right: SJB Seat Box */}
            <div className="party-stat-card card-sjb">
              <div className="stat-card-badge blue-tag">SJB</div>
              <div className="stat-card-party-name">{bt.sjbPartyName}</div>
              <div className="stat-card-seats-won blue-glow-text">{sjbSeats}</div>
              <div className="stat-card-seats-label">{bt.seatsWon}</div>
              <div className="stat-card-mini-breakdown">
                <div className="mini-item">
                  <span className="mini-label">{bt.shareUpper}</span>
                  <span className="mini-val">17.7%</span>
                </div>
                <div className="mini-item">
                  <span className="mini-label">{bt.votesUpper}</span>
                  <span className="mini-val">1,968,716</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Breaking Telemetry Ticker Strip */}
          <div className="broadcast-ticker-strip">
            <div className="ticker-badge-breaking">
              <span className="ticker-pulse-bullet" />
              <span>{bt.breaking}</span>
            </div>

            <div className="ticker-scroller">
              <div className="ticker-item">
                <span className="ticker-label">{bt.estNpp}</span>
                <span className="ticker-highlight red">61.6%</span>
                <span className="ticker-delta">(+{seatLead} SEATS)</span>
              </div>
              <span className="ticker-divider">/</span>
              <div className="ticker-item">
                <span className="ticker-label">{bt.turnout}</span>
                <span className="ticker-highlight">68.9%</span>
                <span className="ticker-sub">{bt.turnoutSub}</span>
              </div>
              <span className="ticker-divider">/</span>
              <div className="ticker-item">
                <span className="ticker-label">{bt.confirmedSeats}</span>
                <span className="ticker-highlight red">NPP 159</span>
                <span className="ticker-highlight blue">SJB 40</span>
                <span className="ticker-highlight cyan">ITAK 8</span>
                <span className="ticker-highlight amber">OTHER 18</span>
              </div>
              <span className="ticker-divider">/</span>
              <div className="ticker-item">
                <span className="ticker-sub">{bt.supermajorityDeclared}</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
