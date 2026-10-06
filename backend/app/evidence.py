"""
Civic Trace - "What happened after?" Evidence Trail data layer.

Models and stores chronological follow-up evidence (parliamentary questions,
government responses, recorded votes, budget allocations, implementation reports,
outcome indicators, etc.) and explicit relationships to originating speeches
and commitments.

Relationships are stored separately from records to preserve documentary provenance.
Topic similarity alone does NOT establish an accepted relationship.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

EventType = Literal[
    "parliamentary_question",
    "ministry_response",
    "further_debate",
    "bill_amendment",
    "recorded_vote",
    "budget_allocation",
    "implementation_report",
    "outcome_indicator",
    "correction_withdrawal",
]

DatePrecision = Literal["day", "month", "year"]

RelationshipType = Literal[
    "responds_to",
    "refers_to",
    "amends",
    "allocates_funding_for",
    "reports_implementation_of",
    "reports_outcomes_related_to",
    "corrects_or_withdraws",
]

IdentificationMethod = Literal[
    "explicit_reference",
    "manual_review",
    "automated_suggestion",
]

ReviewState = Literal[
    "accepted",
    "proposed",
    "rejected",
]

ReviewStatus = Literal[
    "reviewed",
    "unreviewed",
    "disputed",
    "withdrawn",
]


class TrailEvent(BaseModel):
    id: str
    event_type: EventType
    date: str  # ISO-8601 or partial: YYYY-MM-DD, YYYY-MM, or YYYY
    date_precision: DatePrecision = "day"
    title: str
    description: str
    actors: List[str] = Field(default_factory=list)
    linked_source_ids: List[str] = Field(default_factory=list)  # IDs of indexed speeches or records
    source_type: str  # "Hansard", "Gazette", "Order Paper", "Committee Report", "Census/DCS", "Manifesto"
    source_ref: Optional[str] = None
    source_url: Optional[str] = None
    supporting_passage: Optional[str] = None
    recording_interval: Optional[str] = None
    source_available: bool = True
    review_status: ReviewStatus = "reviewed"
    created_at: str
    updated_at: str


class TrailRelationship(BaseModel):
    id: str
    from_record_id: str  # ID of speech or commitment
    to_record_id: str    # ID of event
    relationship_type: RelationshipType
    explanation: str
    evidence_citation: str
    identification_method: IdentificationMethod
    review_state: ReviewState
    reviewer: Optional[str] = None
    review_date: Optional[str] = None
    created_at: str
    updated_at: str


class RelationshipReviewRequest(BaseModel):
    relationship_id: str
    review_state: Literal["accepted", "rejected"]
    reviewer: str = Field(min_length=2, max_length=100)
    review_note: Optional[str] = None


# ---------------------------------------------------------------------------
# Formatted Supports Statement Helper
# ---------------------------------------------------------------------------

def format_supports_statement(event_type: EventType, relationship_type: RelationshipType) -> str:
    """
    Returns precise, factual statements without assuming causal outcomes or progress.
    """
    statements = {
        "parliamentary_question": "A formal parliamentary question was tabled and recorded in Hansard.",
        "ministry_response": "A government or ministry response was officially recorded.",
        "further_debate": "Subsequent parliamentary debate was documented on the official record.",
        "bill_amendment": "A legislative bill or amendment was officially tabled. Note: Introduction does not imply passage.",
        "recorded_vote": "A recorded division vote was taken in Parliament.",
        "budget_allocation": "A budget allocation was approved. Note: Allocation authorizes funding but does not verify disbursement.",
        "implementation_report": "An official implementation report or gazette was published.",
        "outcome_indicator": "A published socio-economic outcome indicator was recorded. Note: Macro indicators reflect multiple systemic factors and cannot be attributed to a single actor.",
        "correction_withdrawal": "A formal correction or withdrawal was submitted on the parliamentary record.",
    }
    return statements.get(event_type, "A follow-up event was recorded in indexed sources.")


# ---------------------------------------------------------------------------
# Pilot Demo Dataset for Trails
# ---------------------------------------------------------------------------

DEMO_TRAIL_EVENTS: List[TrailEvent] = [
    # Anti-Corruption Act & Asset Declarations Trail (linked to sp-001 and com-001)
    TrailEvent(
        id="evt-ac-01",
        event_type="implementation_report",
        date="2024-08-15",
        date_precision="day",
        title="NPP Governance Charter Milestone Formalization",
        description="Formal inclusion of digital asset declaration rollout with 100-day execution milestone in national governance policy framework.",
        actors=["Anura Kumara Dissanayake", "National People's Power"],
        linked_source_ids=[],
        source_type="Manifesto",
        source_ref="NPP Manifesto 2024, Page 18",
        source_url="https://npp.lk/manifesto-governance",
        supporting_passage="Mandate open, machine-readable digital disclosures searchable by any citizen within 100 days of administration.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-08-16T08:00:00Z",
        updated_at="2024-08-16T08:00:00Z",
    ),
    TrailEvent(
        id="evt-ac-02",
        event_type="further_debate",
        date="2024-09-28",
        date_precision="day",
        title="Presidential Policy Address on Anti-Corruption Directives",
        description="Presidential address to Parliament directing CIABOC to operationalize digital declarations and establish international asset tracing unit.",
        actors=["Anura Kumara Dissanayake (President)"],
        linked_source_ids=["sp-001"],
        source_type="Hansard",
        source_ref="Hansard Vol 312, p. 14",
        source_url="https://parliament.lk/hansard/20240928",
        supporting_passage="Instructions issued to the Commission to operationalize online registry under Section 88 of Act No. 9 of 2023.",
        recording_interval="04:20 - 06:15",
        source_available=True,
        review_status="reviewed",
        created_at="2024-09-29T10:00:00Z",
        updated_at="2024-09-29T10:00:00Z",
    ),
    TrailEvent(
        id="evt-ac-03",
        event_type="implementation_report",
        date="2024-11-10",
        date_precision="day",
        title="CIABOC Public Online Declaration Portal Rollout",
        description="Commission to Investigate Allegations of Bribery or Corruption gazetted Extraordinary No. 2390/12 launching online submission portal.",
        actors=["CIABOC", "Ministry of Justice"],
        linked_source_ids=[],
        source_type="Gazette",
        source_ref="Gazette Extraordinary No. 2390/12",
        source_url="https://documents.gov.lk/gazettes/2390-12",
        supporting_passage="Regulations governing electronic submission and public inspection of assets under Anti-Corruption Act No. 9 of 2023.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-11-11T09:00:00Z",
        updated_at="2024-11-11T09:00:00Z",
    ),
    TrailEvent(
        id="evt-ac-04",
        event_type="parliamentary_question",
        date="2024-12-05",
        date_precision="day",
        title="Oral Question on Asset Declaration Verification Timelines",
        description="Opposition inquiry regarding the status of Inland Revenue cross-referencing for the initial batch of 62 parliamentarians.",
        actors=["SJB Opposition Member", "Speaker of Parliament"],
        linked_source_ids=[],
        source_type="Hansard",
        source_ref="Hansard Vol 314, p. 88",
        source_url="https://parliament.lk/hansard/20241205",
        supporting_passage="Whether the Hon. Minister will inform this House of the date by which automated tax cross-referencing will be fully operationalized.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-12-06T11:00:00Z",
        updated_at="2024-12-06T11:00:00Z",
    ),
    TrailEvent(
        id="evt-ac-05",
        event_type="ministry_response",
        date="2024-12-18",
        date_precision="day",
        title="Ministry of Justice Written Answer on StAR Bilateral Protocols",
        description="Minister of Justice submitted formal update on engagement with World Bank / UNODC Stolen Asset Recovery initiative.",
        actors=["Minister of Justice", "Ministry of Justice"],
        linked_source_ids=[],
        source_type="Hansard",
        source_ref="Hansard Vol 314, p. 320",
        source_url="https://parliament.lk/hansard/20241218",
        supporting_passage="Draft regulations for mutual legal assistance finalized; bilateral agreements scheduled for cabinet sign-off in Q1 2025.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-12-19T14:00:00Z",
        updated_at="2024-12-19T14:00:00Z",
    ),
    TrailEvent(
        id="evt-ac-06",
        event_type="outcome_indicator",
        date="2025-01-15",
        date_precision="day",
        title="CIABOC Statistical Release on Portal Submissions",
        description="CIABOC published quarterly compliance data: 62 of 225 Members of Parliament and 45 ministry secretaries completed online declarations.",
        actors=["CIABOC"],
        linked_source_ids=[],
        source_type="Census/DCS",
        source_ref="CIABOC Quarterly Compliance Bulletin Q4-2024",
        source_url="https://ciaboc.gov.lk/statistics/q4-2024",
        supporting_passage="62 digital asset profiles accessible to authorized officers; public verification portal undergoing security audit.",
        source_available=True,
        review_status="reviewed",
        created_at="2025-01-16T12:00:00Z",
        updated_at="2025-01-16T12:00:00Z",
    ),
    # Candidate / Unreviewed suggestion for Anti-Corruption (to test unreviewed separation)
    TrailEvent(
        id="evt-ac-sug-01",
        event_type="further_debate",
        date="2025-02-10",
        date_precision="month",
        title="General Adjournment Motion on Public Administration Ethics",
        description="Cross-party discussion mentioning transparency standards in public procurement; automated topic match flagged 'asset declarations'.",
        actors=["Parliament of Sri Lanka"],
        linked_source_ids=[],
        source_type="Hansard",
        source_ref="Hansard Vol 315, p. 54",
        source_url="https://parliament.lk/hansard/20250210",
        supporting_passage="Mention of public procurement ethics without direct citation to Act No. 9 of 2023 or the presidential directive.",
        source_available=True,
        review_status="unreviewed",
        created_at="2025-02-11T10:00:00Z",
        updated_at="2025-02-11T10:00:00Z",
    ),

    # VAT 18% Scrutiny & Policy Cycle Trail (linked to sp-002 and com-002)
    TrailEvent(
        id="evt-vat-01",
        event_type="recorded_vote",
        date="2023-12-13",
        date_precision="day",
        title="Recorded Vote on Value Added Tax (Amendment) Bill No. 32 of 2023",
        description="Parliament approved the 18% VAT rate with 100 votes in favor and 55 against, removing exemptions on 97 goods including books and school equipment.",
        actors=["Parliament of Sri Lanka", "Dr. Harsha de Silva", "Sajith Premadasa"],
        linked_source_ids=["sp-002"],
        source_type="Hansard",
        source_ref="Hansard Division No. 44, Vol 302, p. 1045",
        source_url="https://parliament.lk/hansard/20231213",
        supporting_passage="Division called on Clause 2 (Rate Increase) and Clause 4 (Removal of Schedule Exemption). Ayes 100; Noes 55.",
        recording_interval="02:15 - 03:45",
        source_available=True,
        review_status="reviewed",
        created_at="2023-12-14T10:00:00Z",
        updated_at="2023-12-14T10:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-02",
        event_type="parliamentary_question",
        date="2024-01-09",
        date_precision="day",
        title="Question on Aswesuma Cash Transfer Cushioning for VAT Price Shock",
        description="COPF Chairman Dr. Harsha de Silva formally questioned Ministry of Finance on mitigation measures for lower income deciles following VAT enactment.",
        actors=["Dr. Harsha de Silva", "State Minister of Finance"],
        linked_source_ids=["sp-002"],
        source_type="Hansard",
        source_ref="Hansard Vol 304, p. 112",
        source_url="https://parliament.lk/hansard/20240109",
        supporting_passage="Whether the Ministry will confirm immediate expansion of Aswesuma welfare cash transfers to offset the 2.4% price shock on vulnerable households.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-01-10T09:00:00Z",
        updated_at="2024-01-10T09:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-03",
        event_type="ministry_response",
        date="2024-01-22",
        date_precision="day",
        title="Ministry of Finance Statement on Welfare Buffer Allocations",
        description="State Minister of Finance confirmed Treasury agreement to submit supplementary estimate of Rs. 15 Billion for welfare beneficiary expansion.",
        actors=["State Minister of Finance", "Ministry of Finance"],
        linked_source_ids=[],
        source_type="Hansard",
        source_ref="Hansard Vol 304, p. 480",
        source_url="https://parliament.lk/hansard/20240122",
        supporting_passage="The government will table a supplementary estimate of Rs. 15,000 million to accommodate 300,000 additional beneficiary families under Aswesuma.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-01-23T11:00:00Z",
        updated_at="2024-01-23T11:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-04",
        event_type="budget_allocation",
        date="2024-03-22",
        date_precision="day",
        title="Parliamentary Supplementary Estimate for Aswesuma Buffer Passed",
        description="Parliament approved Rs. 15 Billion supplementary estimate for Department of Samurdhi and Welfare Benefit Board.",
        actors=["Ministry of Finance", "Parliament of Sri Lanka"],
        linked_source_ids=[],
        source_type="Order Paper",
        source_ref="Cabinet Decision CAB/2024/03/22",
        source_url="https://cabinetoffice.gov.lk/decisions/20240322",
        supporting_passage="Supplementary funding of Rs. 15 Billion authorized for second-round Aswesuma disbursements.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-03-23T15:00:00Z",
        updated_at="2024-03-23T15:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-05",
        event_type="bill_amendment",
        date="2024-04-18",
        date_precision="day",
        title="Private Member Bill on Zero-VAT for Educational Stationery",
        description="Opposition Leader Sajith Premadasa tabled private member amendment requesting zero-rating for 14 categories of school books and equipment.",
        actors=["Sajith Premadasa", "Dr. Harsha de Silva"],
        linked_source_ids=[],
        source_type="Order Paper",
        source_ref="Parliament Order Paper No. 114, Item 6",
        source_url="https://parliament.lk/order-papers/114",
        supporting_passage="Bill to amend the Value Added Tax Act No. 14 of 2002 to re-insert educational materials into the Third Schedule.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-04-19T10:00:00Z",
        updated_at="2024-04-19T10:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-06",
        event_type="outcome_indicator",
        date="2024-04-10",
        date_precision="month",
        title="DCS Price Index Release: 2.4% Initial Shock Followed by Stabilization",
        description="Department of Census and Statistics reported Colombo Consumer Price Index (CCPI) trend and 38% YoY tax revenue growth for Q1 2024.",
        actors=["Department of Census and Statistics"],
        linked_source_ids=[],
        source_type="Census/DCS",
        source_ref="DCS Statistical Release Series 2024/04",
        source_url="https://statistics.gov.lk/ccpi-2024-04",
        supporting_passage="One-off 2.4% price shock observed in January index; food group stabilized by March.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-04-11T12:00:00Z",
        updated_at="2024-04-11T12:00:00Z",
    ),
    TrailEvent(
        id="evt-vat-07",
        event_type="ministry_response",
        date="2024-06-05",
        date_precision="day",
        title="Treasury Fiscal Impact Assessment on Educational VAT Exemptions",
        description="Ministry of Finance submitted committee report to COPF estimating Rs. 4.2B revenue shortfall if zero-rating were restored, recommending targeted direct vouchers instead.",
        actors=["Ministry of Finance", "COPF"],
        linked_source_ids=[],
        source_type="Committee Report",
        source_ref="COPF Sessional Paper S.P. 2024/06",
        source_url="https://parliament.lk/copf/reports/2024-06",
        supporting_passage="Restoring general exemptions would reduce fiscal revenue by Rs. 4.2 Billion; Treasury recommends maintaining current base and deploying direct student vouchers.",
        source_available=True,
        review_status="reviewed",
        created_at="2024-06-06T09:00:00Z",
        updated_at="2024-06-06T09:00:00Z",
    ),
    # Event with unavailable source to test Requirement 4/ Acceptance criteria
    TrailEvent(
        id="evt-vat-unavail",
        event_type="implementation_report",
        date="2024-07",
        date_precision="month",
        title="Inland Revenue Department Q2 Electronic Filing Report",
        description="Quarterly administrative circular on VAT collection software upgrade; internal gazette notice not publicly mirrored.",
        actors=["Inland Revenue Department"],
        linked_source_ids=[],
        source_type="Gazette",
        source_ref="IRD Internal Circular CIR/2024/07 (Restricted Archival Copy)",
        source_url=None,  # Intentionally unavailable source
        supporting_passage="Internal departmental notes not published to open web archive.",
        source_available=False,
        review_status="reviewed",
        created_at="2024-07-15T08:00:00Z",
        updated_at="2024-07-15T08:00:00Z",
    ),
]

DEMO_TRAIL_RELATIONSHIPS: List[TrailRelationship] = [
    # Relationships for sp-001 (AKD speech on Anti-Corruption Bill & Asset Declarations)
    TrailRelationship(
        id="rel-sp1-01",
        from_record_id="sp-001",
        to_record_id="evt-ac-01",
        relationship_type="refers_to",
        explanation="Speech demands for digital disclosure were formalized into NPP 100-day execution milestone in national governance charter.",
        evidence_citation="Hansard Vol 308, p. 1422 compared with NPP Manifesto 2024, Page 18.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Parliamentary Research Desk",
        review_date="2024-09-01",
        created_at="2024-09-01T10:00:00Z",
        updated_at="2024-09-01T10:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp1-02",
        from_record_id="sp-001",
        to_record_id="evt-ac-02",
        relationship_type="refers_to",
        explanation="Direct follow-up presidential speech addressing Parliament on operationalizing CIABOC online asset registry.",
        evidence_citation="Hansard Vol 312, p. 14 citing Anti-Corruption Act Clause 88 discussed in Vol 308.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Parliamentary Research Desk",
        review_date="2024-10-01",
        created_at="2024-10-01T11:00:00Z",
        updated_at="2024-10-01T11:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp1-03",
        from_record_id="sp-001",
        to_record_id="evt-ac-03",
        relationship_type="reports_implementation_of",
        explanation="Gazette Extraordinary No. 2390/12 officially established the electronic portal demanded in the parliamentary debate.",
        evidence_citation="Gazette Extraordinary No. 2390/12 Section 4 (Public Inspection).",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-11-15",
        created_at="2024-11-15T12:00:00Z",
        updated_at="2024-11-15T12:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp1-04",
        from_record_id="sp-001",
        to_record_id="evt-ac-04",
        relationship_type="responds_to",
        explanation="Opposition parliamentary question scrutinizing whether the digital cross-referencing timeline promised in the debate was met.",
        evidence_citation="Hansard Vol 314, p. 88 explicitly querying Section 88 timeline.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-12-08",
        created_at="2024-12-08T09:00:00Z",
        updated_at="2024-12-08T09:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp1-05",
        from_record_id="sp-001",
        to_record_id="evt-ac-05",
        relationship_type="responds_to",
        explanation="Ministry of Justice formal written response detailing progress on UNODC StAR international recovery unit requested in speech.",
        evidence_citation="Hansard Vol 314, p. 320 replying to bilateral subpoena powers query.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Parliamentary Research Desk",
        review_date="2024-12-20",
        created_at="2024-12-20T10:00:00Z",
        updated_at="2024-12-20T10:00:00Z",
    ),
    # Candidate unreviewed relationship for sp-001
    TrailRelationship(
        id="rel-sp1-sug",
        from_record_id="sp-001",
        to_record_id="evt-ac-sug-01",
        relationship_type="refers_to",
        explanation="Candidate link generated from keyword match on 'asset declarations' during adjournment motion.",
        evidence_citation="Text match score 0.74 without explicit statutory cross-reference.",
        identification_method="automated_suggestion",
        review_state="proposed",
        reviewer=None,
        review_date=None,
        created_at="2025-02-11T10:00:00Z",
        updated_at="2025-02-11T10:00:00Z",
    ),

    # Relationships for com-001 (Commitment: Digital Public Asset Declaration System)
    TrailRelationship(
        id="rel-com1-01",
        from_record_id="com-001",
        to_record_id="evt-ac-01",
        relationship_type="refers_to",
        explanation="Foundational manifesto milestone for the commitment.",
        evidence_citation="NPP Manifesto 2024, Page 18.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-08-20",
        created_at="2024-08-20T08:00:00Z",
        updated_at="2024-08-20T08:00:00Z",
    ),
    TrailRelationship(
        id="rel-com1-02",
        from_record_id="com-001",
        to_record_id="evt-ac-02",
        relationship_type="refers_to",
        explanation="Executive reaffirmation in inaugural address of the commitment timeline.",
        evidence_citation="Hansard Vol 312, p. 14.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-10-02",
        created_at="2024-10-02T10:00:00Z",
        updated_at="2024-10-02T10:00:00Z",
    ),
    TrailRelationship(
        id="rel-com1-03",
        from_record_id="com-001",
        to_record_id="evt-ac-03",
        relationship_type="reports_implementation_of",
        explanation="Gazetted launch of the digital platform promised in the commitment.",
        evidence_citation="Gazette Extraordinary No. 2390/12.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-11-15",
        created_at="2024-11-15T12:00:00Z",
        updated_at="2024-11-15T12:00:00Z",
    ),
    TrailRelationship(
        id="rel-com1-04",
        from_record_id="com-001",
        to_record_id="evt-ac-06",
        relationship_type="reports_outcomes_related_to",
        explanation="Official compliance figures documenting 62 MPs uploaded to the system.",
        evidence_citation="CIABOC Quarterly Compliance Bulletin Q4-2024.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2025-01-20",
        created_at="2025-01-20T09:00:00Z",
        updated_at="2025-01-20T09:00:00Z",
    ),

    # Relationships for sp-002 (Dr. Harsha de Silva on VAT 18% Scrutiny)
    TrailRelationship(
        id="rel-sp2-01",
        from_record_id="sp-002",
        to_record_id="evt-vat-01",
        relationship_type="amends",
        explanation="Official division vote on the VAT Amendment Bill debated in the speech; opposition motion defeated 100-55.",
        evidence_citation="Hansard Division No. 44, Vol 302, p. 1045 on Bill No. 32 of 2023.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Parliamentary Research Desk",
        review_date="2023-12-15",
        created_at="2023-12-15T10:00:00Z",
        updated_at="2023-12-15T10:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp2-02",
        from_record_id="sp-002",
        to_record_id="evt-vat-02",
        relationship_type="refers_to",
        explanation="Follow-up ministerial question tabled by Dr. Harsha de Silva demanding poverty buffer data cited in speech.",
        evidence_citation="Hansard Vol 304, p. 112 referencing COPF poverty simulation.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Parliamentary Research Desk",
        review_date="2024-01-11",
        created_at="2024-01-11T11:00:00Z",
        updated_at="2024-01-11T11:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp2-03",
        from_record_id="sp-002",
        to_record_id="evt-vat-03",
        relationship_type="responds_to",
        explanation="Ministry of Finance response conceding Rs. 15B supplementary requirement for welfare safety nets.",
        evidence_citation="Hansard Vol 304, p. 480 answering question on Aswesuma buffer.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-01-25",
        created_at="2024-01-25T14:00:00Z",
        updated_at="2024-01-25T14:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp2-04",
        from_record_id="sp-002",
        to_record_id="evt-vat-04",
        relationship_type="allocates_funding_for",
        explanation="Statutory supplementary allocation passed by Parliament to mitigate child poverty impacts highlighted in COPF report.",
        evidence_citation="Cabinet Decision CAB/2024/03/22.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-03-25",
        created_at="2024-03-25T16:00:00Z",
        updated_at="2024-03-25T16:00:00Z",
    ),
    TrailRelationship(
        id="rel-sp2-05",
        from_record_id="sp-002",
        to_record_id="evt-vat-06",
        relationship_type="reports_outcomes_related_to",
        explanation="Official Department of Census and Statistics release documenting initial 2.4% price shock predicted in speech.",
        evidence_citation="DCS Statistical Release Series 2024/04.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-04-15",
        created_at="2024-04-15T09:00:00Z",
        updated_at="2024-04-15T09:00:00Z",
    ),

    # Relationships for com-002 (Commitment: Zero-VAT on School Stationery)
    TrailRelationship(
        id="rel-com2-01",
        from_record_id="com-002",
        to_record_id="evt-vat-01",
        relationship_type="refers_to",
        explanation="Recorded vote where sponsors voted against the 18% VAT clause on educational items.",
        evidence_citation="Hansard Division No. 44, Vol 302, p. 1045.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2023-12-15",
        created_at="2023-12-15T11:00:00Z",
        updated_at="2023-12-15T11:00:00Z",
    ),
    TrailRelationship(
        id="rel-com2-02",
        from_record_id="com-002",
        to_record_id="evt-vat-05",
        relationship_type="amends",
        explanation="Private member bill tabled by commitment sponsor requesting statutory 0% rate on 14 educational products.",
        evidence_citation="Parliament Order Paper No. 114, Item 6.",
        identification_method="explicit_reference",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-04-20",
        created_at="2024-04-20T10:00:00Z",
        updated_at="2024-04-20T10:00:00Z",
    ),
    TrailRelationship(
        id="rel-com2-03",
        from_record_id="com-002",
        to_record_id="evt-vat-07",
        relationship_type="responds_to",
        explanation="Treasury fiscal impact analysis responding to the private member bill with alternative voucher proposal.",
        evidence_citation="COPF Sessional Paper S.P. 2024/06.",
        identification_method="manual_review",
        review_state="accepted",
        reviewer="Editorial Board",
        review_date="2024-06-10",
        created_at="2024-06-10T12:00:00Z",
        updated_at="2024-06-10T12:00:00Z",
    ),
]
