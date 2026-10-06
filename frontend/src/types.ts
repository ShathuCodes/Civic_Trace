export interface TimestampSegment {
  id: string;
  start_time: string;
  start_seconds: number;
  end_time: string;
  end_seconds: number;
  speaker: string;
  text_en: string;
  text_si?: string;
  text_ta?: string;
  claim_type: string;
  fact_check_status: string;
}

export interface Speech {
  id: string;
  title: string;
  speaker_id: string;
  speaker_name: string;
  speaker_role: string;
  party: string;
  sitting_date: string;
  session_name: string;
  hansard_vol: string;
  hansard_page: string;
  hansard_pdf_url: string;
  video_url: string;
  duration: string;
  duration_seconds: number;
  topic: string;
  summary: string;
  key_claims: string[];
  segments: TimestampSegment[];
  votes_referenced: string[];
  verified_accuracy: number;
}

export interface MP {
  id: string;
  name: string;
  sinhala_name: string;
  tamil_name: string;
  party: string;
  party_code: string;
  district: string;
  current_role: string;
  avatar_url: string;
  attendance_rate: number;
  total_speeches: number;
  votes_attended: number;
  loyalty_index: number;
  policy_focus: string[];
  bio: string;
  stances: Record<string, string>;
  commitments_count: {
    kept: number;
    in_progress: number;
    broken: number;
    compromised: number;
  };
}

export interface CommitmentTimelineEvent {
  date: string;
  stage: string;
  title: string;
  description: string;
  source_type: string;
  source_ref: string;
  source_url: string;
  status_impact?: string;
}

export interface Commitment {
  id: string;
  title: string;
  category: string;
  party: string;
  sponsor_mp_id: string;
  sponsor_name: string;
  manifesto_source: string;
  manifesto_year: number;
  original_quote: string;
  current_status: 'Kept' | 'In Progress' | 'Compromised' | 'Broken' | 'Under Review';
  target_metric: string;
  achieved_metric: string;
  confidence_score: number;
  verdict_summary: string;
  timeline: CommitmentTimelineEvent[];
}

export interface Party {
  id: string;
  name: string;
  code: string;
  leader: string;
  parliamentary_seats: number;
  core_ideology: string;
  color: string;
  manifesto_name: string;
  manifesto_summary: string;
  key_pillars: string[];
  alignment_scores: Record<string, number>;
}

export interface IssueTimeline {
  id: string;
  topic: string;
  title: string;
  description: string;
  time_span: string;
  indicator_label: string;
  indicator_data: any[];
  events: Array<{
    date: string;
    stage: string;
    speaker: string;
    summary: string;
    hansard_ref: string;
  }>;
}

export interface Citation {
  title: string;
  source_type: string;
  ref_code: string;
  url: string;
  timestamp_interval?: string;
  speech_id?: string;
  confidence_score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  confidence_score: number;
  grounded_claim_count: number;
  missing_evidence_flags: string[];
  suggested_queries: string[];
}

export interface DashboardStats {
  total_mps_tracked: number;
  total_speeches_indexed: number;
  total_commitments_tracked: number;
  commitments_breakdown: {
    kept: number;
    in_progress: number;
    compromised: number;
    broken: number;
  };
  average_whisper_alignment_accuracy: number;
  hansard_pages_indexed: number;
  video_hours_synced: number;
  active_pilot_sessions: string[];
}

// --- MP Activity Profile ---

export interface AttendanceRecord {
  mp_id: string;
  sitting_id: string;
  sitting_date: string;
  parliament_session: string;
  recorded_status: "present" | "absent" | "missing_data" | string;
  source_url: string | null;
  source_doc_id: string | null;
  fetched_at: string;
}

export interface ActivitySummary {
  mp_id: string;
  mp_name: string;
  party: string;
  district: string;
  current_role: string;
  memberships?: Array<{
    parliament_session: string;
    joined_date: string;
    left_date: string | null;
  }>;
  filters_applied: {
    date_from: string | null;
    date_to: string | null;
    session: string | null;
  };
  attendance: {
    available: boolean;
    present: number;
    absent: number;
    missing_data: number;
    eligible_sitting_days: number | null;
    attendance_rate: number | null;
    rate_denominator_label: string;
    coverage_note: string;
  };
  speeches: {
    count: number;
    label: string;
    coverage_note: string;
    indexed_sessions: string[];
    topics: Array<{ topic: string; count: number }>;
    topics_note: string;
  };
  dataset_note: string;
  loaded_at: string | null;
}

export interface AttendancePage {
  available: boolean;
  records: AttendanceRecord[];
  total: number;
  page: number;
  page_size: number;
  note: string;
}

export interface SpeechSummary {
  id: string;
  title: string;
  sitting_date: string;
  session_name: string;
  topic: string;
  summary: string;
  hansard_vol: string;
  hansard_page: string;
  hansard_pdf_url: string;
  duration: string;
  has_audio?: boolean;
}

export interface SpeechPage {
  speeches: SpeechSummary[];
  total: number;
  page: number;
  page_size: number;
  label: string;
  coverage_note: string;
}

// --- Evidence Trail ("What happened after?") ---

export type EventType =
  | "parliamentary_question"
  | "ministry_response"
  | "further_debate"
  | "bill_amendment"
  | "recorded_vote"
  | "budget_allocation"
  | "implementation_report"
  | "outcome_indicator"
  | "correction_withdrawal";

export type DatePrecision = "day" | "month" | "year";

export type RelationshipType =
  | "responds_to"
  | "refers_to"
  | "amends"
  | "allocates_funding_for"
  | "reports_implementation_of"
  | "reports_outcomes_related_to"
  | "corrects_or_withdraws";

export type IdentificationMethod =
  | "explicit_reference"
  | "manual_review"
  | "automated_suggestion";

export type ReviewState = "accepted" | "proposed" | "rejected";

export type ReviewStatus = "reviewed" | "unreviewed" | "disputed" | "withdrawn";

export interface TrailEvent {
  id: string;
  event_type: EventType;
  date: string;
  date_precision: DatePrecision;
  title: string;
  description: string;
  actors: string[];
  linked_source_ids: string[];
  source_type: string;
  source_ref: string | null;
  source_url: string | null;
  supporting_passage: string | null;
  recording_interval: string | null;
  source_available: boolean;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface TrailRelationship {
  id: string;
  from_record_id: string;
  to_record_id: string;
  relationship_type: RelationshipType;
  explanation: string;
  evidence_citation: string;
  identification_method: IdentificationMethod;
  review_state: ReviewState;
  reviewer: string | null;
  review_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceTrailSummary {
  record_id: string;
  record_kind: "speech" | "commitment";
  title: string;
  speaker_or_sponsor: string;
  party?: string;
  role_or_org?: string;
  date: string;
  date_precision: DatePrecision;
  original_quote_or_passage: string;
  source_ref: string;
  source_url: string | null;
  coverage_start: string;
  coverage_end: string;
  latest_update: string;
  coverage_note: string;
}

export interface TrailItem {
  event: TrailEvent;
  relationship: TrailRelationship;
  supports_statement: string;
  linked_speech?: {
    id: string;
    title: string;
    speaker_name: string;
    sitting_date: string;
    hansard_vol: string;
    hansard_page: string;
    hansard_pdf_url: string;
    has_audio?: boolean;
  } | null;
}

export interface EvidenceTrailResponse {
  origin: EvidenceTrailSummary;
  established_trail: TrailItem[];
  unreviewed_suggestions: TrailItem[];
  total_accepted: number;
  total_unreviewed: number;
  page: number;
  page_size: number;
  coverage_status:
    | "covered_with_events"
    | "unreviewed_only"
    | "no_linked_records"
    | "period_uncovered"
    | "source_unavailable";
  coverage_explanation: string;
  filters_applied: {
    event_type?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    include_unreviewed?: boolean;
  };
  disclaimer: string;
}

