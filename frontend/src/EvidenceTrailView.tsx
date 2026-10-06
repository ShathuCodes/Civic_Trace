import { useState, useEffect, useId, useCallback } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  FileQuestion,
  FileText,
  Filter,
  Info,
  Pause,
  Play,
  RotateCcw,
  Share2,
  Square,
  Users,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import type {
  EvidenceTrailResponse,
  TrailItem,
  EventType,
} from "./types";
import { api } from "./api";
import { useLanguage } from "./i18n/LanguageContext";
import { useSpeakText } from "./hooks/useSpeakText";
import type { Language } from "./i18n/types";

interface EvidenceTrailViewProps {
  recordId: string;
  recordKind: "speech" | "commitment";
  onBack: () => void;
  onOpenSpeech: (speechId: string) => void;
  onOpenCommitment?: (commitmentId: string) => void;
}

export function EvidenceTrailView({
  recordId,
  recordKind,
  onBack,
  onOpenSpeech,
}: EvidenceTrailViewProps) {
  const { t, language } = useLanguage();
  const filterTypeSelectId = useId();
  const dateFromInputId = useId();
  const dateToInputId = useId();

  const [trailData, setTrailData] = useState<EvidenceTrailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"established" | "unreviewed">("established");
  const [toastMessage, setToastMessage] = useState<string>("");

  const tts = useSpeakText({
    onError: () => setToastMessage(t.voice.voiceUnavailable),
  });

  const loadTrail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getEvidenceTrail(recordId, {
        event_type: eventTypeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        include_unreviewed: true,
      });
      setTrailData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load evidence trail.");
    } finally {
      setLoading(false);
    }
  }, [recordId, eventTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadTrail();
  }, [loadTrail]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage("Evidence trail link copied");
      setTimeout(() => setToastMessage(""), 3000);
    } catch {
      setToastMessage("Copy URL from address bar");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const formatDateByPrecision = (dateStr: string, precision: "day" | "month" | "year") => {
    if (!dateStr) return "";
    if (precision === "year") {
      return dateStr.slice(0, 4);
    }
    if (precision === "month") {
      const parts = dateStr.split("-");
      if (parts.length >= 2) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        if (!Number.isNaN(d.valueOf())) {
          return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        }
      }
      return dateStr;
    }
    const d = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(d.valueOf())) return dateStr;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const getEventTypeLabel = (type: EventType | string) => {
    switch (type) {
      case "parliamentary_question":
        return t.trail.eventParliamentaryQuestion;
      case "ministry_response":
        return t.trail.eventMinistryResponse;
      case "further_debate":
        return t.trail.eventFurtherDebate;
      case "bill_amendment":
        return t.trail.eventBillAmendment;
      case "recorded_vote":
        return t.trail.eventRecordedVote;
      case "budget_allocation":
        return t.trail.eventBudgetAllocation;
      case "implementation_report":
        return t.trail.eventImplementationReport;
      case "outcome_indicator":
        return t.trail.eventOutcomeIndicator;
      case "correction_withdrawal":
        return t.trail.eventCorrectionWithdrawal;
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getRelationshipLabel = (type: string) => {
    switch (type) {
      case "responds_to":
        return t.trail.relRespondsTo;
      case "refers_to":
        return t.trail.relRefersTo;
      case "amends":
        return t.trail.relAmends;
      case "allocates_funding_for":
        return t.trail.relAllocatesFunding;
      case "reports_implementation_of":
        return t.trail.relReportsImplementation;
      case "reports_outcomes_related_to":
        return t.trail.relReportsOutcomes;
      case "corrects_or_withdraws":
        return t.trail.relCorrectsOrWithdraws;
      default:
        return type.replace(/_/g, " ");
    }
  };

  const getIdentificationMethodLabel = (method: string) => {
    switch (method) {
      case "explicit_reference":
        return t.trail.methodExplicit;
      case "manual_review":
        return t.trail.methodManual;
      case "automated_suggestion":
        return t.trail.methodAutomated;
      default:
        return method;
    }
  };

  const getReviewStateLabel = (state: string) => {
    switch (state) {
      case "accepted":
        return t.trail.reviewAccepted;
      case "proposed":
        return t.trail.reviewProposed;
      case "rejected":
        return t.trail.reviewRejected;
      default:
        return state;
    }
  };

  const resetFilters = () => {
    setEventTypeFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const displayedItems: TrailItem[] =
    activeTab === "established"
      ? trailData?.established_trail || []
      : trailData?.unreviewed_suggestions || [];

  const handleReadAloudTrail = () => {
    if (!trailData) return;
    const originText = `${trailData.origin.title}. ${trailData.origin.original_quote_or_passage}.`;
    const eventsText = displayedItems
      .map(
        (it) =>
          `${it.event.title}. ${it.event.description}. ${it.supports_statement}`,
      )
      .join(" ");
    const fullText = `${originText} ${eventsText}`;
    tts.speak(fullText, language as Language);
  };

  return (
    <div className="evidence-trail-page" tabIndex={-1}>
      {/* Toast Notice */}
      {toastMessage && (
        <div className="toast-notification" role="status">
          {toastMessage}
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="trail-top-bar">
        <button
          type="button"
          className="button secondary-button trail-back-btn"
          onClick={onBack}
          aria-label={
            recordKind === "speech"
              ? t.trail.returnToSpeeches
              : t.trail.returnToCommitments
          }
        >
          <ArrowLeft size={16} />
          <span>
            {recordKind === "speech"
              ? t.trail.returnToSpeeches
              : t.trail.returnToCommitments}
          </span>
        </button>

        <div className="trail-top-actions">
          {/* Narration Button */}
          {tts.status === "playing" ? (
            <button
              type="button"
              className="button small-button"
              onClick={tts.pause}
              title={t.voice.pauseReading}
            >
              <Pause size={14} /> {t.voice.pauseReading}
            </button>
          ) : tts.status === "paused" ? (
            <button
              type="button"
              className="button small-button primary"
              onClick={tts.resume}
              title={t.voice.resumeReading}
            >
              <Play size={14} /> {t.voice.resumeReading}
            </button>
          ) : (
            <button
              type="button"
              className="button small-button"
              onClick={handleReadAloudTrail}
              title={t.voice.readAloud}
              disabled={loading || !displayedItems.length}
            >
              <Volume2 size={14} /> {t.voice.readAloud}
            </button>
          )}

          {tts.status !== "idle" && (
            <button
              type="button"
              className="button small-button"
              onClick={tts.stop}
              title={t.voice.stopReading}
            >
              <Square size={14} />
            </button>
          )}

          <button
            type="button"
            className="button small-button"
            onClick={handleCopyLink}
            title="Share Evidence Trail"
          >
            <Share2 size={14} /> Share
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div className="trail-page-header">
        <div className="trail-header-title-row">
          <span className="eyebrow">{t.trail.evidenceTrail.toUpperCase()}</span>
          <span className="trail-badge live-evidence-badge">
            <Clock3 size={12} /> {t.trail.whatHappenedAfter}
          </span>
        </div>
        <h1 className="trail-main-title">{t.trail.whatHappenedAfter}</h1>
        <p className="trail-main-subtitle">{t.trail.subtitle}</p>
      </div>

      {loading && (
        <div className="empty trail-loading-state">
          <Clock3 size={28} className="spinner" />
          <p>{t.common.loading}</p>
        </div>
      )}

      {error && !loading && (
        <div className="empty trail-error-state">
          <AlertTriangle size={28} />
          <h3>{t.common.errorTitle}</h3>
          <p>{error}</p>
          <button type="button" className="button" onClick={loadTrail}>
            {t.common.retry}
          </button>
        </div>
      )}

      {!loading && !error && trailData && (
        <>
          {/* Origin Record Banner Card */}
          <section className="trail-origin-card" aria-labelledby="origin-heading">
            <div className="origin-card-head">
              <span className="status neutral origin-type-tag">
                {trailData.origin.record_kind === "speech" ? (
                  <>
                    <BookOpen size={13} /> {t.trail.originalSpeech}
                  </>
                ) : (
                  <>
                    <FileText size={13} /> {t.trail.originalCommitment}
                  </>
                )}
              </span>

              <span className="origin-date-tag">
                <Calendar size={13} />
                {formatDateByPrecision(
                  trailData.origin.date,
                  trailData.origin.date_precision,
                )}
              </span>
            </div>

            <h2 id="origin-heading" className="origin-title">
              {trailData.origin.title}
            </h2>

            <div className="origin-meta-row">
              <span className="avatar">
                {trailData.origin.speaker_or_sponsor.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <strong>{trailData.origin.speaker_or_sponsor}</strong>
                <span>
                  {trailData.origin.party ? `${trailData.origin.party} · ` : ""}
                  {trailData.origin.role_or_org || ""}
                </span>
              </div>
            </div>

            {trailData.origin.original_quote_or_passage && (
              <blockquote className="origin-quote">
                "{trailData.origin.original_quote_or_passage}"
              </blockquote>
            )}

            <div className="origin-source-strip">
              <div className="origin-source-details">
                <FileText size={16} />
                <span>
                  <strong>Source:</strong> {trailData.origin.source_ref}
                </span>
              </div>
              <div className="origin-source-actions">
                {trailData.origin.source_url ? (
                  <a
                    href={trailData.origin.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    {t.common.sourceLink} <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <span className="muted small">{t.common.sourceNotSupplied}</span>
                )}
                {trailData.origin.record_kind === "speech" && (
                  <button
                    type="button"
                    className="button small-button"
                    onClick={() => onOpenSpeech(trailData.origin.record_id)}
                  >
                    {t.trail.openSpeechViewer}
                  </button>
                )}
              </div>
            </div>

            <div className="origin-coverage-strip">
              <div className="coverage-meta-pill">
                <strong>{t.trail.coveragePeriod}:</strong>{" "}
                {trailData.origin.coverage_start} to {trailData.origin.coverage_end}
              </div>
              <div className="coverage-meta-pill">
                <strong>{t.trail.latestUpdate}:</strong>{" "}
                {trailData.origin.latest_update}
              </div>
              <div className="coverage-note-text">
                {trailData.origin.coverage_note}
              </div>
            </div>
          </section>

          {/* Evidence Boundary Notice Alert */}
          <div className="trail-disclaimer-box" role="note">
            <Info size={16} />
            <div>
              <strong>{t.trail.disclaimerTitle}</strong>
              <p>{t.trail.disclaimerText}</p>
            </div>
          </div>

          {/* Filter Bar and Tab Switcher */}
          <div className="trail-controls-bar">
            {/* Tabs */}
            <div className="trail-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "established"}
                className={`trail-tab-btn ${
                  activeTab === "established" ? "is-active" : ""
                }`}
                onClick={() => setActiveTab("established")}
              >
                <span>{t.trail.tabEstablished}</span>
                <span className="tab-count-badge">
                  {trailData.total_accepted}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "unreviewed"}
                className={`trail-tab-btn ${
                  activeTab === "unreviewed" ? "is-active" : ""
                }`}
                onClick={() => setActiveTab("unreviewed")}
              >
                <span>{t.trail.tabUnreviewed}</span>
                <span className="tab-count-badge unreviewed">
                  {trailData.total_unreviewed}
                </span>
              </button>
            </div>

            {/* Filter Controls */}
            <div className="trail-filters-group">
              <div className="filter-field">
                <label htmlFor={filterTypeSelectId}>
                  <Filter size={12} /> {t.trail.filterEventType}
                </label>
                <select
                  id={filterTypeSelectId}
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                >
                  <option value="">{t.trail.allEventTypes}</option>
                  <option value="parliamentary_question">
                    {t.trail.eventParliamentaryQuestion}
                  </option>
                  <option value="ministry_response">
                    {t.trail.eventMinistryResponse}
                  </option>
                  <option value="further_debate">
                    {t.trail.eventFurtherDebate}
                  </option>
                  <option value="bill_amendment">
                    {t.trail.eventBillAmendment}
                  </option>
                  <option value="recorded_vote">
                    {t.trail.eventRecordedVote}
                  </option>
                  <option value="budget_allocation">
                    {t.trail.eventBudgetAllocation}
                  </option>
                  <option value="implementation_report">
                    {t.trail.eventImplementationReport}
                  </option>
                  <option value="outcome_indicator">
                    {t.trail.eventOutcomeIndicator}
                  </option>
                  <option value="correction_withdrawal">
                    {t.trail.eventCorrectionWithdrawal}
                  </option>
                </select>
              </div>

              <div className="filter-field date-field">
                <label htmlFor={dateFromInputId}>{t.trail.filterDateFrom}</label>
                <input
                  id={dateFromInputId}
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="filter-field date-field">
                <label htmlFor={dateToInputId}>{t.trail.filterDateTo}</label>
                <input
                  id={dateToInputId}
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {(eventTypeFilter || dateFrom || dateTo) && (
                <button
                  type="button"
                  className="button small-button reset-filter-btn"
                  onClick={resetFilters}
                  title={t.trail.resetFilters}
                >
                  <RotateCcw size={13} /> {t.trail.resetFilters}
                </button>
              )}
            </div>
          </div>

          {/* Active Tab Notice for Unreviewed */}
          {activeTab === "unreviewed" && (
            <div className="unreviewed-tab-alert">
              <FileQuestion size={16} />
              <p>{t.trail.unreviewedNotice}</p>
            </div>
          )}

          {/* Chronological Timeline Trail */}
          <div className="trail-timeline-container">
            {displayedItems.length > 0 ? (
              <div className="event-list trail-event-list">
                {displayedItems.map((item, idx) => {
                  const event = item.event;
                  const rel = item.relationship;
                  const isSpeechSource = Boolean(item.linked_speech);

                  return (
                    <article key={event.id || idx} className="trail-event-card">
                      <span className="event-dot" />

                      {/* Header line: Date & Badges */}
                      <div className="trail-event-meta-line">
                        <span className="trail-event-date">
                          <Calendar size={13} />
                          {formatDateByPrecision(
                            event.date,
                            event.date_precision,
                          )}
                        </span>

                        <span className={`status event-type-badge ${event.event_type}`}>
                          {getEventTypeLabel(event.event_type)}
                        </span>

                        <span className="status relationship-tag">
                          {getRelationshipLabel(rel.relationship_type)}
                        </span>

                        <span
                          className={`status review-badge ${rel.review_state}`}
                        >
                          {getReviewStateLabel(rel.review_state)}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="trail-event-title">{event.title}</h3>
                      <p className="trail-event-desc">{event.description}</p>

                      {/* Actors / Organizations */}
                      {event.actors && event.actors.length > 0 && (
                        <div className="trail-actors-row">
                          <Users size={13} />
                          <span>
                            <strong>Key actors:</strong>{" "}
                            {event.actors.join(", ")}
                          </span>
                        </div>
                      )}

                      {/* Precise Factual Supports Statement (Section 6) */}
                      <div className="trail-supports-statement-box">
                        <CheckCircle2 size={15} />
                        <div>
                          <strong>{t.trail.whatEvidenceSupports}:</strong>
                          <p>{item.supports_statement}</p>
                        </div>
                      </div>

                      {/* Supporting Passage / Reference quote */}
                      {event.supporting_passage && (
                        <blockquote className="trail-passage-quote">
                          "{event.supporting_passage}"
                        </blockquote>
                      )}

                      {/* Inspectable Source Section (Section 4) */}
                      <div className="trail-source-box">
                        <div className="trail-source-info">
                          <FileText size={16} />
                          <div>
                            <strong>
                              {event.source_type}: {event.source_ref || "Official Record"}
                            </strong>
                            {event.recording_interval && (
                              <span className="recording-interval-tag">
                                Audio interval: {event.recording_interval}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="trail-source-actions">
                          {isSpeechSource && item.linked_speech && (
                            <button
                              type="button"
                              className="button small-button primary"
                              onClick={() =>
                                onOpenSpeech(item.linked_speech!.id)
                              }
                            >
                              <BookOpen size={13} /> {t.trail.openSpeechViewer}
                            </button>
                          )}

                          {event.source_available && event.source_url ? (
                            <a
                              href={event.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              {t.trail.openOfficialSource}{" "}
                              <ArrowUpRight size={13} />
                            </a>
                          ) : !event.source_available ? (
                            <span className="source-unavailable-badge">
                              <AlertTriangle size={12} />{" "}
                              {t.trail.sourceUnavailable}
                            </span>
                          ) : (
                            <span className="muted small">
                              {t.common.sourceNotSupplied}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Provenance and Review Footer (Section 5) */}
                      <div className="trail-provenance-footer">
                        <span className="provenance-item">
                          <strong>{t.trail.identifiedVia}:</strong>{" "}
                          {getIdentificationMethodLabel(rel.identification_method)}
                        </span>
                        {rel.evidence_citation && (
                          <span className="provenance-item">
                            <strong>Citation:</strong> {rel.evidence_citation}
                          </span>
                        )}
                        {rel.reviewer && (
                          <span className="provenance-item">
                            <strong>{t.trail.reviewedBy}:</strong> {rel.reviewer} (
                            {rel.review_date})
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Honest Incomplete Coverage / Empty State (Section 7) */
              <div className="trail-empty-state">
                <Clock3 size={32} />
                <h3>{t.trail.noFollowUpsFound}</h3>
                <p className="trail-empty-explanation">
                  {trailData.coverage_explanation}
                </p>
                <div className="trail-honest-notice">
                  <Info size={15} />
                  <span>{t.trail.honestCoverageNotice}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
