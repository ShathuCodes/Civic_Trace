"""
Civic Trace - Backend API Data Store
Pilot Dataset: Sri Lanka Parliamentary Debates, Manifestos, Voting Records & Socio-Economic Indicators.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class TimestampSegment(BaseModel):
    id: str
    start_time: str
    start_seconds: int
    end_time: str
    end_seconds: int
    speaker: str
    text_en: str
    text_si: Optional[str] = None
    text_ta: Optional[str] = None
    claim_type: str # "Policy Promise", "Critique", "Factual Statement", "Legislative Defense", "Call to Action"
    fact_check_status: str # "Verified Primary Source", "Disputed Claim", "Supported by Census Data"

class Speech(BaseModel):
    id: str
    title: str
    speaker_id: str
    speaker_name: str
    speaker_role: str
    party: str
    sitting_date: str
    session_name: str
    hansard_vol: str
    hansard_page: str
    hansard_pdf_url: str
    video_url: str
    duration: str
    duration_seconds: int
    topic: str
    summary: str
    key_claims: List[str]
    segments: List[TimestampSegment]
    votes_referenced: List[str]
    verified_accuracy: float # e.g. 96.5%

class MP(BaseModel):
    id: str
    name: str
    sinhala_name: str
    tamil_name: str
    party: str
    party_code: str
    district: str
    current_role: str
    avatar_url: str
    attendance_rate: float
    total_speeches: int
    votes_attended: int
    loyalty_index: float # alignment with party line
    policy_focus: List[str]
    bio: str
    stances: Dict[str, str] # e.g. {"Taxation": "Progressive Direct Tax", "IMF Agreement": "Renegotiate Social Safety Net"}
    commitments_count: Dict[str, int] # {"kept": 4, "in_progress": 7, "broken": 1, "compromised": 2}

class CommitmentTimelineEvent(BaseModel):
    date: str
    stage: str # "Manifesto Pledge", "Parliamentary Debate", "Legislative Vote", "Executive Implementation", "Socio-Economic Indicator"
    title: str
    description: str
    source_type: str # "Hansard", "Gazette", "Manifesto", "Central Bank/Census", "FactCheck.lk"
    source_ref: str
    source_url: str
    status_impact: Optional[str] = "Positive" # "Positive", "Neutral", "Negative", "Warning"

class Commitment(BaseModel):
    id: str
    title: str
    category: str
    party: str
    sponsor_mp_id: str
    sponsor_name: str
    manifesto_source: str
    manifesto_year: int
    original_quote: str
    current_status: str # "Kept", "In Progress", "Compromised", "Broken", "Under Review"
    target_metric: str
    achieved_metric: str
    confidence_score: float
    verdict_summary: str
    timeline: List[CommitmentTimelineEvent]

class Party(BaseModel):
    id: str
    name: str
    code: str
    leader: str
    parliamentary_seats: int
    core_ideology: str
    color: str
    manifesto_name: str
    manifesto_summary: str
    key_pillars: List[str]
    alignment_scores: Dict[str, float]

class IssueTimeline(BaseModel):
    id: str
    topic: str
    title: str
    description: str
    time_span: str
    indicator_label: str
    indicator_data: List[Dict[str, Any]] # e.g. [{"date": "2023 Q1", "value": 15.2, "unit": "%"}, ...]
    events: List[Dict[str, Any]]

# Rich Pilot Dataset
SAMPLE_MPS: List[MP] = [
    MP(
        id="mp-akd",
        name="Anura Kumara Dissanayake",
        sinhala_name="අනුර කුමාර දිසානායක",
        tamil_name="அநுர குமார திசாநாயக்க",
        party="National People's Power (NPP)",
        party_code="NPP",
        district="Colombo",
        current_role="President of Sri Lanka / NPP Leader",
        avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        attendance_rate=94.2,
        total_speeches=148,
        votes_attended=212,
        loyalty_index=99.0,
        policy_focus=["Anti-Corruption", "IMF Debt Thresholds", "Public Procurement", "Social Safety Net", "Energy Sovereignty"],
        bio="Political leader elected on strong mandate for institutional integrity, procurement transparency, and equitable debt restructuring for lower-income households.",
        stances={
            "Tax Reform": "Lowering PAYE brackets for essential workers, raising corporate wealth taxes & digital tax evasion enforcement.",
            "IMF Agreement": "Commitment to debt sustainability while renegotiating poverty line threshold parameters for welfare grants.",
            "Anti-Corruption": "Independent CIABOC empowerment, full asset declarations on public digital ledger, recovery of stolen assets.",
            "Energy Policy": "Competitive tender for renewable projects, unbundling transmission without privatizing national distribution monopolies.",
            "Education": "Increasing public education allocation toward 4.5% of GDP over 5-year medium-term framework."
        },
        commitments_count={"kept": 6, "in_progress": 8, "broken": 1, "compromised": 2}
    ),
    MP(
        id="mp-sajith",
        name="Sajith Premadasa",
        sinhala_name="සජිත් ප්‍රේමදාස",
        tamil_name="சஜித் பிரேமதாச",
        party="Samagi Jana Balawegaya (SJB)",
        party_code="SJB",
        district="Colombo",
        current_role="Leader of the Opposition",
        avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        attendance_rate=91.8,
        total_speeches=192,
        votes_attended=230,
        loyalty_index=96.5,
        policy_focus=["Poverty Alleviation", "School Midday Meals", "SME Credit Moratorium", "Healthcare Modernization", "Constitutional Reforms"],
        bio="Leader of the parliamentary opposition focusing on targeted grassroots interventions, smart classrooms, export promotion, and comprehensive safety net expansion.",
        stances={
            "Tax Reform": "Targeted tax relief for export SMEs, revision of the 18% VAT on school supplies and medicine.",
            "IMF Agreement": "Social-market economic model with strict oversight on vulnerable household buffers and IMF conditionality auditing.",
            "Anti-Corruption": "Special parliamentary anti-fraud taskforce with international tracing partnerships.",
            "Energy Policy": "Rooftop solar democratization and subsidies for domestic micro-solar adopters.",
            "Education": "Universal free midday meal scheme expansion and nationwide English/digital skills overhaul."
        },
        commitments_count={"kept": 4, "in_progress": 7, "broken": 2, "compromised": 3}
    ),
    MP(
        id="mp-harsha",
        name="Dr. Harsha de Silva",
        sinhala_name="ආචාර්ය හර්ෂ ද සිල්වා",
        tamil_name="கலாநிதி ஹர்ஷ டி சில்வா",
        party="Samagi Jana Balawegaya (SJB)",
        party_code="SJB",
        district="Colombo",
        current_role="Chairman of Committee on Public Finance (COPF)",
        avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
        attendance_rate=98.1,
        total_speeches=224,
        votes_attended=244,
        loyalty_index=94.0,
        policy_focus=["Macroeconomic Policy", "COPF Public Scrutiny", "Debt Sustainability", "1990 Suwa Seriya", "Trade Liberalization"],
        bio="Economist and Chair of COPF known for pioneering public finance transparency, evidence-based legislative reviews, and social market economic frameworks.",
        stances={
            "Tax Reform": "Broadening the tax base via TIN-wealth linkages rather than regressive flat indirect sales levies.",
            "IMF Agreement": "Strict adherence to Primary Balance targets while optimizing debt restructuring parameters with ISB bondholders.",
            "Anti-Corruption": "Mandatory COPF scrutiny before all tax exemptions and strategic development project approvals.",
            "Energy Policy": "Cost-reflective competitive pricing with unbundled utility regulator authority.",
            "Education": "STEM voucher programs and private tertiary accreditation standards."
        },
        commitments_count={"kept": 7, "in_progress": 6, "broken": 0, "compromised": 1}
    ),
    MP(
        id="mp-ranil",
        name="Ranil Wickremesinghe",
        sinhala_name="රනිල් වික්‍රමසිංහ",
        tamil_name="ரணில் விக்ரமசிங்க",
        party="United National Party (UNP)",
        party_code="UNP",
        district="National List",
        current_role="Former President / UNP Leader",
        avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
        attendance_rate=87.5,
        total_speeches=98,
        votes_attended=180,
        loyalty_index=98.5,
        policy_focus=["Fiscal Consolidation", "Foreign Direct Investment", "Economic Transformation Act", "Free Trade Agreements", "Central Bank Autonomy"],
        bio="Veteran statesman who oversaw the 2022-2024 stabilization phase, IMF 17th Extended Fund Facility agreement, and Central Bank Act passage.",
        stances={
            "Tax Reform": "Expanding VAT to 18% with minimal exemptions to ensure state revenue surpasses 15% of GDP.",
            "IMF Agreement": "Unwavering execution of IMF EFF benchmarks and foreign debt restructuring agreements with OCC & Exim Bank of China.",
            "Anti-Corruption": "Enactment of Anti-Corruption Act No. 9 of 2023 and proceeds of crime draft bill.",
            "Energy Policy": "Privatization of SOE thermal segments, Adani/multi-lateral wind and solar investments.",
            "Education": "Establishment of private non-state universities and vocational high-tech zones."
        },
        commitments_count={"kept": 5, "in_progress": 4, "broken": 3, "compromised": 4}
    ),
    MP(
        id="mp-alisabry",
        name="Ali Sabry",
        sinhala_name="අලි සබ්‍රි",
        tamil_name="அலி சப்ரி",
        party="Sri Lanka Podujana Peramuna (SLPP)",
        party_code="SLPP",
        district="National List",
        current_role="Former Minister of Foreign Affairs & Justice",
        avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80",
        attendance_rate=92.3,
        total_speeches=134,
        votes_attended=205,
        loyalty_index=91.0,
        policy_focus=["Judicial Digitization", "International Diplomacy", "Commercial Dispute Resolution", "Anti-Corruption Law"],
        bio="Senior President's Counsel and former Minister who led international sovereign debt bilateral missions and court modernization initiatives.",
        stances={
            "Tax Reform": "Predictable commercial arbitration and double taxation avoidance pacts.",
            "IMF Agreement": "International legal compliance and Paris Club creditor consensus facilitation.",
            "Anti-Corruption": "Comprehensive redrafting of bribery and asset forfeiture frameworks.",
            "Energy Policy": "Bilateral renewable energy pacts with regional grid interconnection.",
            "Education": "Expansion of English-medium legal education and digital forensics degrees."
        },
        commitments_count={"kept": 4, "in_progress": 5, "broken": 1, "compromised": 2}
    ),
    MP(
        id="mp-sumanthiran",
        name="M. A. Sumanthiran",
        sinhala_name="එම්. ඒ. සුමන්තිරන්",
        tamil_name="எம். ஏ. சுமந்திரன்",
        party="Illankai Tamil Arasu Kachchi (ITAK)",
        party_code="ITAK",
        district="Jaffna",
        current_role="Senior ITAK Parliamentarian / President's Counsel",
        avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
        attendance_rate=96.4,
        total_speeches=178,
        votes_attended=228,
        loyalty_index=95.5,
        policy_focus=["Constitutional Devolution", "PTA Repeal", "Northern Economic Rejuvenation", "Fiscal Federalism", "Human Rights"],
        bio="Constitutional lawyer and Member of Parliament representing Jaffna, specializing in human rights, judicial independence, and regional fiscal devolution.",
        stances={
            "Tax Reform": "Equitable provincial revenue collection and municipal empowerment.",
            "IMF Agreement": "Transparent oversight of sovereign guarantees and domestic debt restructuring equity.",
            "Anti-Corruption": "Full prosecutorial independence for anti-graft bodies without executive veto.",
            "Energy Policy": "Community-owned green energy in Northern & Eastern littoral zones.",
            "Education": "Equitable distribution of school infrastructure away from Western Province concentration."
        },
        commitments_count={"kept": 5, "in_progress": 6, "broken": 1, "compromised": 2}
    )
]

SAMPLE_PARTIES: List[Party] = [
    Party(
        id="party-npp",
        name="National People's Power",
        code="NPP",
        leader="Anura Kumara Dissanayake",
        parliamentary_seats=159,
        core_ideology="Democratic Socialism / Progressive Social Market / Anti-Corruption",
        color="#DC2626",
        manifesto_name="A Thriving Nation, A Beautiful Life (2024)",
        manifesto_summary="Focuses on eradicating systemic political corruption, re-industrialization, digital citizen governance, restructuring welfare thresholds, and renegotiating IMF parameters for human development.",
        key_pillars=["Eradicating Corruption & Rule of Law", "Re-industrializing State & Private Economy", "Universal Social Safety Net & Free Health/Education", "Digitized Transparent Procurement"],
        alignment_scores={"Anti-Corruption": 98.0, "Public Healthcare": 94.0, "Fiscal Discipline": 84.0, "Welfare Expansion": 96.0}
    ),
    Party(
        id="party-sjb",
        name="Samagi Jana Balawegaya",
        code="SJB",
        leader="Sajith Premadasa",
        parliamentary_seats=40,
        core_ideology="Social Democratic / Social Market Economy / Grassroots Welfare",
        color="#16A34A",
        manifesto_name="A Win For All - Economic Blueprint 3.0",
        manifesto_summary="Advocates for a competitive social market economy combining export promotion, SME tax incentives, free school meals, and independent fiscal council monitoring.",
        key_pillars=["Export-led Growth & SME Renaissance", "Grassroots Empowerment & Child Welfare", "COPF-led Transparent Budgeting", "Digital Education Revolution"],
        alignment_scores={"Anti-Corruption": 88.0, "Public Healthcare": 90.0, "Fiscal Discipline": 91.0, "Welfare Expansion": 92.0}
    ),
    Party(
        id="party-unp",
        name="United National Party",
        code="UNP",
        leader="Ranil Wickremesinghe",
        parliamentary_seats=1,
        core_ideology="Liberal Conservative / Neoliberal Free Market",
        color="#2563EB",
        manifesto_name="Paving the Path Forward 2025",
        manifesto_summary="Emphasizes fiscal consolidation, structural IMF benchmark execution, privatization of non-strategic SOEs, and international trade agreements.",
        key_pillars=["Macroeconomic Stabilization", "SOE Restructuring & FDI Inflows", "Central Bank Autonomy", "Trade Hub Integration"],
        alignment_scores={"Anti-Corruption": 76.0, "Public Healthcare": 72.0, "Fiscal Discipline": 95.0, "Welfare Expansion": 68.0}
    ),
    Party(
        id="party-itak",
        name="Illankai Tamil Arasu Kachchi",
        code="ITAK",
        leader="S. Sritharan / M.A. Sumanthiran",
        parliamentary_seats=8,
        core_ideology="Regional Autonomy / Federalism / Human Rights",
        color="#F59E0B",
        manifesto_name="Justice, Devolution and Dignity",
        manifesto_summary="Advocates for maximum devolution of power within an undivided country, repeal of repressive legislation, and equitable regional economic development.",
        key_pillars=["13th Amendment & Devolution", "Repeal of Prevention of Terrorism Act", "War-Affected Zone Reconstruction", "Fisheries & Agriculture Subsidies"],
        alignment_scores={"Anti-Corruption": 85.0, "Public Healthcare": 88.0, "Fiscal Discipline": 80.0, "Welfare Expansion": 89.0}
    )
]

SAMPLE_SPEECHES: List[Speech] = [
    Speech(
        id="sp-001",
        title="Debate on Anti-Corruption Bill & Asset Declaration Verification Mechanism",
        speaker_id="mp-akd",
        speaker_name="Anura Kumara Dissanayake",
        speaker_role="President / Party Leader",
        party="NPP",
        sitting_date="2024-03-14",
        session_name="Parliament of Sri Lanka - 9th Parliament 4th Session",
        hansard_vol="Vol 308",
        hansard_page="pp. 1420-1435",
        hansard_pdf_url="https://parliament.lk/uploads/hansard/doc_20240314.pdf",
        video_url="https://www.youtube.com/watch?v=sample_parl_01",
        duration="14m 20s",
        duration_seconds=860,
        topic="Anti-Corruption & Transparency",
        summary="Key speech arguing for direct public access to asset declarations of all Members of Parliament, judges, and state enterprise chairpersons. Demands real-time cross-referencing with Inland Revenue data.",
        key_claims=[
            "Asset declarations must be filed in machine-readable digital format accessible to citizens.",
            "Past investigations into 14 major infrastructure tender irregularities were buried due to political influence.",
            "CIABOC must possess autonomous international asset recovery units with bilateral subpoena powers."
        ],
        segments=[
            TimestampSegment(
                id="seg-1-1",
                start_time="00:15",
                start_seconds=15,
                end_time="01:45",
                end_seconds=105,
                speaker="Anura Kumara Dissanayake",
                text_en="Honourable Speaker, the mere enactment of the Anti-Corruption Act is insufficient if the asset declaration registry remains locked in paper files within parliamentary basements. The law must mandate open, machine-readable digital disclosures searchable by any citizen or investigative journalist.",
                text_si="ගරු කථානායකතුමනි, වත්කම් ප්‍රකාශන පාර්ලිමේන්තුවේ පහළ ලේඛනාගාරවල කඩදාසි ගොනු ලෙස සඟවා තබන තාක් දූෂණ විරෝධී පනතකින් පමණක් ඵලක් නොවේ. ඕනෑම පුරවැසියෙකුට සෙවිය හැකි පරිදි ඩිජිටල් දත්ත පද්ධතියක් හරහා මේවා විවෘත විය යුතුය.",
                text_ta="கௌரவ சபாநாயகர் அவர்களே, சொத்து விபரங்கள் பாராளுமன்றத்தின் ஆவணக் காப்பகங்களில் காகிதங்களாக பூட்டப்பட்டிருக்கும் வரை ஊழல் எதிர்ப்புச் சட்டத்தால் எந்தப் பயனும் இல்லை.",
                claim_type="Policy Promise",
                fact_check_status="Verified Primary Source"
            ),
            TimestampSegment(
                id="seg-1-2",
                start_time="01:46",
                start_seconds=106,
                end_time="03:20",
                end_seconds=200,
                speaker="Anura Kumara Dissanayake",
                text_en="Between 2015 and 2023, over 14 procurement tenders in the energy and highway sector had unsolicited bids exceeding official treasury estimates by 35%. We hold the documentation right here from the Auditor General's special reports.",
                text_si="2015 සහ 2023 අතර කාලය තුළ බලශක්ති සහ මහාමාර්ග ක්ෂේත්‍රයේ ප්‍රසම්පාදන ටෙන්ඩර් 14කට වැඩි ප්‍රමාණයක නිල ඇස්තමේන්තුවලට වඩා 35%ක අධික මිලක් තිබුණි.",
                text_ta="2015 மற்றும் 2023 க்கு இடையில், எரிசக்தி மற்றும் நெடுஞ்சாலைத் துறையில் 14 இற்கும் மேற்பட்ட கொள்முதல் டெண்டர்களில் 35% அதிகப்படியான மதிப்பீடுகள் காணப்பட்டன.",
                claim_type="Factual Statement",
                fact_check_status="Supported by Census Data"
            ),
            TimestampSegment(
                id="seg-1-3",
                start_time="03:21",
                start_seconds=201,
                end_time="05:10",
                end_seconds=310,
                speaker="Anura Kumara Dissanayake",
                text_en="We are committing today that upon forming the administration, the Stolen Asset Recovery Unit will be constituted within 100 days, working directly with the UNODC and World Bank StAR initiative to freeze foreign escrow funds.",
                text_si="අප රජයක් පිහිටුවා දින 100ක් ඇතුළත සොරකම් කරන ලද වත්කම් ආපසු අයකර ගැනීමේ ඒකකය පිහිටුවා ජාත්‍යන්තර ආයතන සමග එක්ව ක්‍රියා කරන බවට සහතික වෙනවා.",
                text_ta="நாங்கள் ஆட்சிக்கு வந்த 100 நாட்களுக்குள் கொள்ளையடிக்கப்பட்ட சொத்துக்களை மீட்கும் பிரிவு நிறுவப்படும் என்று உறுதியளிக்கிறோம்.",
                claim_type="Policy Promise",
                fact_check_status="Verified Primary Source"
            )
        ],
        votes_referenced=["Anti-Corruption Bill 2023 - Clause 88 Amendment"],
        verified_accuracy=98.2
    ),
    Speech(
        id="sp-002",
        title="COPF Scrutiny on Value Added Tax (VAT) 18% Hike and Household Poverty Impact",
        speaker_id="mp-harsha",
        speaker_name="Dr. Harsha de Silva",
        speaker_role="Chairman of COPF",
        party="SJB",
        sitting_date="2023-12-11",
        session_name="Parliament of Sri Lanka - 2024 Budget Committee Stage",
        hansard_vol="Vol 302",
        hansard_page="pp. 890-912",
        hansard_pdf_url="https://parliament.lk/uploads/hansard/doc_20231211.pdf",
        video_url="https://www.youtube.com/watch?v=sample_parl_02",
        duration="18m 45s",
        duration_seconds=1125,
        topic="Fiscal Policy & VAT",
        summary="Detailed economic presentation on the regressive nature of lifting VAT exemptions on 97 consumer and educational items without adequate cash transfers to bottom 40% income deciles.",
        key_claims=[
            "Lifting VAT exemptions on school stationeries and fuel will cause a 2.4% uptick in urban child poverty.",
            "Inland Revenue Department collection efficiency is below 54%; broadening direct wealth tax is better than indirect sales taxes.",
            "COPF recommended retaining zero-VAT for essential infant milk and schoolbooks."
        ],
        segments=[
            TimestampSegment(
                id="seg-2-1",
                start_time="00:30",
                start_seconds=30,
                end_time="02:15",
                end_seconds=135,
                speaker="Dr. Harsha de Silva",
                text_en="Speaker sir, as Chairman of COPF, I must place on the record of this august assembly that while macroeconomic stabilization requires revenue targets of 12-14% of GDP, imposing a blanket 18% VAT on school stationery, exercise books, and localized agricultural processing is fundamentally regressive.",
                text_si="කථානායකතුමනි, රජයේ මුදල් පිළිබඳ කාරක සභාවේ සභාපතිවරයා ලෙස මම ප්‍රකාශ කරන්නේ, රාජ්‍ය ආදායම වැඩි කළ යුතු වුවත් පාසල් පොත්පත් සහ කෘෂි උපකරණ සඳහා 18%ක වැට් බද්දක් පැනවීම අතිශය අසාධාරණ බවයි.",
                text_ta="சபாநாயகர் அவர்களே, பாடசாலை உபகரணங்கள் மற்றும் விவசாய உள்ளீடுகள் மீது 18% வற் வரி விதிப்பது மிகவும் பாதகமானது என்பதைப் பதிவு செய்கிறேன்.",
                claim_type="Critique",
                fact_check_status="Supported by Census Data"
            ),
            TimestampSegment(
                id="seg-2-2",
                start_time="02:16",
                start_seconds=136,
                end_time="04:30",
                end_seconds=270,
                speaker="Dr. Harsha de Silva",
                text_en="Our COPF committee simulation indicates that an additional 320,000 households risk slipping beneath the national poverty line if the Aswesuma beneficiary roster is not updated concurrently. We have submitted 6 alternative revenue measures in our committee report.",
                text_si="අපගේ කමිටු ඇස්තමේන්තු අනුව අස්වැසුම ප්‍රතිලාභී ලැයිස්තුව කඩිනමින් සංශෝධනය නොකළහොත් තවත් පවුල් 320,000ක් දිළිඳු රේඛාවෙන් පහළට ඇද වැටෙනු ඇත.",
                text_ta="எமது குழு அறிக்கையின்படி, அஸ்வெசும பயனாளர் பட்டியல் திருத்தப்படாவிட்டால் மேலும் 320,000 குடும்பங்கள் வறுமைக் கோட்டிற்கு கீழ் செல்லும் அபாயம் உள்ளது.",
                claim_type="Factual Statement",
                fact_check_status="Supported by Census Data"
            )
        ],
        votes_referenced=["Value Added Tax (Amendment) Bill No. 32 of 2023"],
        verified_accuracy=96.8
    ),
    Speech(
        id="sp-003",
        title="Defense of IMF Extended Fund Facility & Debt Restructuring Negotiations",
        speaker_id="mp-ranil",
        speaker_name="Ranil Wickremesinghe",
        speaker_role="Former President",
        party="UNP",
        sitting_date="2024-02-07",
        session_name="Statement on the State of the Economy",
        hansard_vol="Vol 306",
        hansard_page="pp. 12-35",
        hansard_pdf_url="https://parliament.lk/uploads/hansard/doc_20240207.pdf",
        video_url="https://www.youtube.com/watch?v=sample_parl_03",
        duration="22m 10s",
        duration_seconds=1330,
        topic="Sovereign Debt & IMF EFF",
        summary="Presidential policy statement detailing progress on Official Creditor Committee (OCC) bilateral debt restructuring and foreign reserve buildup from $20M in 2022 to over $4.5B.",
        key_claims=[
            "Foreign usable reserves have rebounded from near zero to exceed $4.5 billion.",
            "Default status cannot be cured without strict fiscal discipline and primary budget surplus.",
            "Economic Transformation Act will legally bind future parliaments to keep public debt below 95% of GDP by 2032."
        ],
        segments=[
            TimestampSegment(
                id="seg-3-1",
                start_time="01:00",
                start_seconds=60,
                end_time="02:50",
                end_seconds=170,
                speaker="Ranil Wickremesinghe",
                text_en="When I took office, we did not have fuel for ambulances, electricity lasted only 10 hours a day, and inflation stood at 70%. Today, we have brought headline inflation down to single digits, built reserves above $4.5 billion, and stabilized the rupee at 305 to the US dollar.",
                text_si="මා ධුරය භාරගන්නා විට ගිලන් රථ සඳහා ඉන්ධන නොතිබූ අතර උද්ධමනය 70%ක් විය. අද අපි උද්ධමනය තනි ඉලක්කමකට ගෙනැවිත්, සංචිත ඩොලර් බිලියන 4.5 දක්වා ඉහළ නංවා ඇත.",
                text_ta="நான் பதவியேற்ற போது பணவீக்கம் 70% ஆக இருந்தது. இன்று பணவீக்கத்தை குறைத்து, கையிருப்பை 4.5 பில்லியன் டொலர்களாக உயர்த்தியுள்ளோம்.",
                claim_type="Legislative Defense",
                fact_check_status="Supported by Census Data"
            ),
            TimestampSegment(
                id="seg-3-2",
                start_time="02:51",
                start_seconds=171,
                end_time="04:45",
                end_seconds=285,
                speaker="Ranil Wickremesinghe",
                text_en="Any unilateral departure from the IMF Extended Fund Facility debt sustainability benchmarks will immediately derail our negotiations with international commercial bondholders and trigger secondary currency shocks.",
                text_si="ජාත්‍යන්තර මූල්‍ය අරමුදලේ කොන්දේසිවලින් එකඟතාවයකින් තොරව බැහැරවීම වාණිජ ණයහිමියන් සමග සාකච්ඡා අඩපණ කරනු ඇත.",
                text_ta="சர்வதேச நாணய நிதியத்தின் நிபந்தனைகளில் இருந்து விலகுவது சர்வதேச கடன் மறுசீரமைப்பை பாதிக்கும்.",
                claim_type="Call to Action",
                fact_check_status="Verified Primary Source"
            )
        ],
        votes_referenced=["IMF Extended Fund Facility Resolution (Passed 120-25)"],
        verified_accuracy=94.5
    ),
    Speech(
        id="sp-004",
        title="Opposition Proposal: Universal School Nutrition Program and Small Business Tax Moratorium",
        speaker_id="mp-sajith",
        speaker_name="Sajith Premadasa",
        speaker_role="Leader of the Opposition",
        party="SJB",
        sitting_date="2024-05-22",
        session_name="Parliament of Sri Lanka - Adjournment Debate",
        hansard_vol="Vol 310",
        hansard_page="pp. 512-530",
        hansard_pdf_url="https://parliament.lk/uploads/hansard/doc_20240522.pdf",
        video_url="https://www.youtube.com/watch?v=sample_parl_04",
        duration="16m 15s",
        duration_seconds=975,
        topic="Education & Poverty Relief",
        summary="Speech challenging child malnutrition statistics from the Department of Census and Statistics and presenting the opposition plan to allocate Rs. 40 billion for universal school meals.",
        key_claims=[
            "Census data shows 19.8% of primary students experience severe morning nutritional deficiencies.",
            "Government spent Rs. 85 billion on non-essential ministerial vehicles while stalling school meal budget.",
            "SJB pledges immediate funding re-allocation from state enterprise subsidies to universal child nutrition."
        ],
        segments=[
            TimestampSegment(
                id="seg-4-1",
                start_time="00:45",
                start_seconds=45,
                end_time="02:30",
                end_seconds=150,
                speaker="Sajith Premadasa",
                text_en="How can we discuss economic recovery when the Department of Census & Statistics itself documents that 1 out of every 5 school children in rural districts attends school on an empty stomach? We demand an immediate Rs. 40 billion reallocation for universal midday meals.",
                text_si="ග්‍රාමීය දිස්ත්‍රික්කවල පාසල් දරුවන් පස් දෙනෙකුගෙන් එක් අයෙකු කුසගින්නේ පාසල් එන බව සංඛ්‍යාලේඛන දෙපාර්තමේන්තුවම පවසද්දී ආර්ථික ප්‍රකෘතියක් ගැන කතා කරන්නේ කෙසේද? නොමිලේ දිවා ආහාරය සඳහා රුපියල් බිලියන 40ක් වෙන් කරන ලෙස අපි ඉල්ලා සිටිමු.",
                text_ta="கிராமப்புறங்களில் ஐந்தில் ஒரு பாடசாலை மாணவர் பட்டினியுடன் பாடசாலைக்கு வருவதாக புள்ளிவிபரங்கள் கூறுகின்றன. இலவச மதிய உணவுக்காக 40 பில்லியன் ரூபாயை ஒதுக்குமாறு கோருகிறோம்.",
                claim_type="Policy Promise",
                fact_check_status="Supported by Census Data"
            )
        ],
        votes_referenced=["Supplementary Estimate - Ministry of Education 2024"],
        verified_accuracy=95.1
    ),
    Speech(
        id="sp-005",
        title="Repeal of PTA & Devolution of Provincial Land and Police Powers",
        speaker_id="mp-sumanthiran",
        speaker_name="M. A. Sumanthiran",
        speaker_role="Member of Parliament",
        party="ITAK",
        sitting_date="2024-01-24",
        session_name="Parliamentary Debate on National Security Legislation",
        hansard_vol="Vol 305",
        hansard_page="pp. 310-330",
        hansard_pdf_url="https://parliament.lk/uploads/hansard/doc_20240124.pdf",
        video_url="https://www.youtube.com/watch?v=sample_parl_05",
        duration="13m 40s",
        duration_seconds=820,
        topic="Constitutional Governance & Human Rights",
        summary="Legal critique of the proposed Anti-Terrorism Bill (ATB), pointing out clauses conflicting with the Fundamental Rights chapter of the Constitution and advocating for 13th Amendment implementation.",
        key_claims=[
            "Clause 3 of the draft Anti-Terrorism Act allows arbitrary detention without judicial warrant for 48 hours.",
            "True national stability requires full implementation of provincial powers under the 13th Amendment.",
            "Supreme Court determination on previous drafts confirmed over 12 sections required two-thirds majority."
        ],
        segments=[
            TimestampSegment(
                id="seg-5-1",
                start_time="00:20",
                start_seconds=20,
                end_time="02:10",
                end_seconds=130,
                speaker="M. A. Sumanthiran",
                text_en="The Supreme Court has repeatedly affirmed that sweeping definitions of terrorism that penalize peaceful trade union protests or freedom of expression violate Article 14 of our Constitution. We will not support any legislation that bypasses magistrate oversight.",
                text_si="සාමකාමී විරෝධතා ත්‍රස්තවාදය ලෙස අර්ථකථනය කිරීම ආණ්ඩුක්‍රම ව්‍යවස්ථාවේ 14 වන වගන්තිය උල්ලංඝනය කරන බව ශ්‍රේෂ්ඨාධිකරණය පැහැදිලි කර ඇත.",
                text_ta="அமைதியான போராட்டங்களை பயங்கரவாதம் என வரைவிலக்கணப்படுத்துவது அரசியலமைப்பின் 14 வது உறுப்புரையை மீறுகிறது என்பதை உயர் நீதிமன்றம் உறுதி செய்துள்ளது.",
                claim_type="Critique",
                fact_check_status="Verified Primary Source"
            )
        ],
        votes_referenced=["Anti-Terrorism Draft Bill Supreme Court Review"],
        verified_accuracy=99.1
    )
]

SAMPLE_COMMITMENTS: List[Commitment] = [
    Commitment(
        id="com-001",
        title="Digital Public Asset Declaration System for All MPs and Officials",
        category="Anti-Corruption",
        party="National People's Power (NPP)",
        sponsor_mp_id="mp-akd",
        sponsor_name="Anura Kumara Dissanayake",
        manifesto_source="NPP Manifesto 2024 - Chapter 2 (Governance)",
        manifesto_year=2024,
        original_quote="We will establish an open, searchable digital portal where asset and liability declarations of all 225 MPs, Cabinet Ministers, and Ministry Secretaries are publicly accessible without bureaucratic obstruction.",
        current_status="In Progress",
        target_metric="100% of 225 MPs and 80+ top officials with live digital declarations",
        achieved_metric="Gazette notifications issued; CIABOC digital upload portal active for 62 MPs",
        confidence_score=92.4,
        verdict_summary="Significant legislative and procedural steps completed following Anti-Corruption Act enforcement; 62 of 225 MPs have submitted online records.",
        timeline=[
            CommitmentTimelineEvent(
                date="2024-08-15",
                stage="Manifesto Pledge",
                title="Public Pledge in NPP Governance Charter",
                description="Included in national election manifesto with 100-day execution milestone.",
                source_type="Manifesto",
                source_ref="NPP Manifesto 2024, Page 18",
                source_url="https://npp.lk/manifesto-governance"
            ),
            CommitmentTimelineEvent(
                date="2024-09-28",
                stage="Parliamentary Debate",
                title="Presidential Policy Address on Transparency",
                description="Reiterated mandate in inaugural parliamentary speech with CIABOC directives.",
                source_type="Hansard",
                source_ref="Hansard Vol 312, p. 14",
                source_url="https://parliament.lk/hansard/20240928"
            ),
            CommitmentTimelineEvent(
                date="2024-11-10",
                stage="Executive Implementation",
                title="CIABOC Online Portal Rollout",
                description="Digital platform launched by Commission to Investigate Allegations of Bribery or Corruption.",
                source_type="Gazette",
                source_ref="Gazette Extraordinary No. 2390/12",
                source_url="https://documents.gov.lk/gazettes/2390-12"
            )
        ]
    ),
    Commitment(
        id="com-002",
        title="Zero-VAT Exemption on School Stationery and Educational Books",
        category="Education & Taxation",
        party="Samagi Jana Balawegaya (SJB)",
        sponsor_mp_id="mp-sajith",
        sponsor_name="Sajith Premadasa",
        manifesto_source="SJB Blueprint 3.0 - Section 4 (Education)",
        manifesto_year=2024,
        original_quote="We will remove the 18% VAT on all school stationery, exercise books, drawing equipment, and educational software to relieve low-income families.",
        current_status="Under Review",
        target_metric="0% VAT rate on 14 educational product categories",
        achieved_metric="Private Member Bill tabled in COPF; Treasury revenue study commissioned",
        confidence_score=88.5,
        verdict_summary="Opposition sponsored private member amendment submitted to Committee on Public Finance; awaiting fiscal impact clearance from Ministry of Finance.",
        timeline=[
            CommitmentTimelineEvent(
                date="2023-12-11",
                stage="Parliamentary Debate",
                title="Opposition Battle against 18% VAT on Books",
                description="COPF Chair Dr. Harsha de Silva and Sajith Premadasa voted against blanket VAT clauses.",
                source_type="Hansard",
                source_ref="Hansard Vol 302, p. 895",
                source_url="https://parliament.lk/hansard/20231211"
            ),
            CommitmentTimelineEvent(
                date="2024-04-18",
                stage="Legislative Vote",
                title="Private Member Amendment on Educational Relief",
                description="Presented to parliament with cross-party co-sponsorship.",
                source_type="Hansard",
                source_ref="Hansard Order Paper No. 114",
                source_url="https://parliament.lk/order-papers/114"
            )
        ]
    ),
    Commitment(
        id="com-003",
        title="Primary Budget Surplus Target of 2.3% of GDP by 2025",
        category="Fiscal Policy",
        party="United National Party (UNP)",
        sponsor_mp_id="mp-ranil",
        sponsor_name="Ranil Wickremesinghe",
        manifesto_source="Government Policy Statement & IMF EFF Matrix",
        manifesto_year=2023,
        original_quote="Sri Lanka will turn its primary fiscal balance from a deficit of -5.7% into a sustainable primary surplus of +2.3% of GDP by 2025.",
        current_status="Kept",
        target_metric="+2.3% Primary Balance Surplus (% of GDP)",
        achieved_metric="+2.4% Primary Surplus achieved in FY 2024 (Central Bank Annual Report)",
        confidence_score=97.0,
        verdict_summary="Verified by Central Bank of Sri Lanka and IMF 3rd Review. Sri Lanka recorded a primary surplus of 2.4% of GDP ahead of schedule.",
        timeline=[
            CommitmentTimelineEvent(
                date="2023-03-20",
                stage="Legislative Vote",
                title="Parliament Approves IMF EFF Agreement",
                description="Vote passed 120 to 25 setting the statutory primary surplus targets.",
                source_type="Hansard",
                source_ref="Hansard Vol 298, p. 410",
                source_url="https://parliament.lk/hansard/20230320"
            ),
            CommitmentTimelineEvent(
                date="2024-07-31",
                stage="Socio-Economic Indicator",
                title="Central Bank Reports Mid-Year Surplus",
                description="Primary balance surplus reaches 2.4% driven by VAT base expansion and SOE cost-recovery tariffs.",
                source_type="Central Bank/Census",
                source_ref="CBSL Economic Review Q2 2024",
                source_url="https://cbsl.gov.lk/economic-review-2024"
            )
        ]
    ),
    Commitment(
        id="com-004",
        title="Full Implementation of the 13th Constitutional Amendment",
        category="Devolution & Governance",
        party="Illankai Tamil Arasu Kachchi (ITAK)",
        sponsor_mp_id="mp-sumanthiran",
        sponsor_name="M. A. Sumanthiran",
        manifesto_source="ITAK Election Manifesto 2024",
        manifesto_year=2024,
        original_quote="Complete devolution of police and land powers to all nine Provincial Councils as enshrined in the 13th Amendment without executive rollbacks.",
        current_status="Compromised",
        target_metric="Elections held for all 9 Provincial Councils + Land Commission gazetted",
        achieved_metric="National Land Commission Act drafted; Provincial Council elections postponed pending electoral system amendment",
        confidence_score=79.2,
        verdict_summary="Partial consensus on National Land Commission framework, but provincial council elections remain stalled due to boundary delimitation disputes.",
        timeline=[
            CommitmentTimelineEvent(
                date="2023-01-26",
                stage="Parliamentary Debate",
                title="All-Party Conference on 13th Amendment",
                description="Debate on land commission powers and provincial finance commissions.",
                source_type="Hansard",
                source_ref="Hansard Vol 296, p. 110",
                source_url="https://parliament.lk/hansard/20230126"
            )
        ]
    ),
    Commitment(
        id="com-005",
        title="Universal Free School Midday Meals for 1.6 Million Primary Students",
        category="Child Welfare & Education",
        party="Samagi Jana Balawegaya (SJB)",
        sponsor_mp_id="mp-sajith",
        sponsor_name="Sajith Premadasa",
        manifesto_source="SJB Manifesto - Child Nutrition Guarantee",
        manifesto_year=2024,
        original_quote="Provide daily balanced hot meals cooked with local agricultural produce for all 1.6 million primary grade children in government schools.",
        current_status="In Progress",
        target_metric="1,600,000 primary students provided daily hot meals",
        achieved_metric="Expanded from 1.05M to 1.35M students with WFP and Treasury co-financing",
        confidence_score=91.0,
        verdict_summary="Ministry of Education expanded meal allocations to 1.35M students; budget allocation increased from Rs. 60 to Rs. 110 per student meal.",
        timeline=[
            CommitmentTimelineEvent(
                date="2024-03-25",
                stage="Executive Implementation",
                title="Ministry of Education School Meal Rollout",
                description="Cabinet approved expansion across 9,134 primary schools island-wide.",
                source_type="Gazette",
                source_ref="Cabinet Decision CAB/2024/03/25",
                source_url="https://cabinetoffice.gov.lk/decisions"
            )
        ]
    )
]

SAMPLE_TIMELINES: List[IssueTimeline] = [
    IssueTimeline(
        id="time-vat",
        topic="Taxation & Cost of Living",
        title="The 18% VAT Policy Cycle: From IMF Target to Citizen Impact",
        description="Tracks the complete lifecycle of the Value Added Tax hike from the initial IMF EFF staff-level agreement, through contentious parliamentary Hansard debates, the recorded vote, and actual inflation/revenue outcomes recorded by the Department of Census and Statistics.",
        time_span="2022 - 2024",
        indicator_label="Sri Lanka Inflation Rate (%) vs Tax Revenue (% of GDP)",
        indicator_data=[
            {"period": "2022 Q3", "inflation": 69.8, "tax_revenue_gdp": 7.3, "vat_rate": 8},
            {"period": "2022 Q4", "inflation": 57.2, "tax_revenue_gdp": 8.1, "vat_rate": 12},
            {"period": "2023 Q2", "inflation": 12.0, "tax_revenue_gdp": 9.2, "vat_rate": 15},
            {"period": "2023 Q4", "inflation": 4.0, "tax_revenue_gdp": 10.4, "vat_rate": 15},
            {"period": "2024 Q1", "inflation": 6.4, "tax_revenue_gdp": 11.8, "vat_rate": 18},
            {"period": "2024 Q3", "inflation": 0.5, "tax_revenue_gdp": 12.6, "vat_rate": 18}
        ],
        events=[
            {
                "date": "2023-03-20",
                "stage": "IMF Commitment",
                "speaker": "Government / IMF",
                "summary": "IMF 17th Extended Fund Facility sets target for Sri Lanka to increase tax revenue to 14% of GDP by 2025.",
                "hansard_ref": "Hansard Vol 298, p. 410"
            },
            {
                "date": "2023-12-11",
                "stage": "Parliamentary Debate",
                "speaker": "Dr. Harsha de Silva (SJB)",
                "summary": "COPF presents report showing removal of VAT exemptions on 97 items will adversely impact low-income families by Rs. 8,500/month.",
                "hansard_ref": "Hansard Vol 302, p. 890"
            },
            {
                "date": "2023-12-13",
                "stage": "Recorded Vote",
                "speaker": "Parliament of Sri Lanka",
                "summary": "VAT (Amendment) Bill passes with 100 votes in favor and 55 against. Rate raised to 18% effective Jan 1, 2024.",
                "hansard_ref": "Hansard Division No. 44"
            },
            {
                "date": "2024-04-10",
                "stage": "Census & Socio-Economic Outcome",
                "speaker": "Department of Census & Statistics",
                "summary": "Colombo Consumer Price Index (CCPI) records temporary 2.4% price shock in January followed by stabilization. Revenue collection rises by 38% YoY.",
                "hansard_ref": "DCS Statistical Release Series 2024"
            }
        ]
    ),
    IssueTimeline(
        id="time-anticorruption",
        topic="Governance & Rule of Law",
        title="Anti-Corruption Act No. 9 of 2023 & Asset Tracing Pipeline",
        description="Chronicles the transition from outdated 1994 Bribery Act to the modern Anti-Corruption Act, tracking Supreme Court petitions, parliamentary amendments, asset declaration portals, and international StAR enforcement.",
        time_span="2023 - 2024",
        indicator_label="CIABOC Complaints Filed vs Prosecutions Initiated",
        indicator_data=[
            {"period": "2022 Q4", "complaints": 420, "prosecutions": 18, "conviction_rate": 62},
            {"period": "2023 Q2", "complaints": 610, "prosecutions": 24, "conviction_rate": 65},
            {"period": "2023 Q4", "complaints": 890, "prosecutions": 42, "conviction_rate": 71},
            {"period": "2024 Q2", "complaints": 1240, "prosecutions": 68, "conviction_rate": 78},
            {"period": "2024 Q3", "complaints": 1580, "prosecutions": 95, "conviction_rate": 84}
        ],
        events=[
            {
                "date": "2023-04-27",
                "stage": "Bill Presentation",
                "speaker": "Ali Sabry (Minister of Justice)",
                "summary": "Anti-Corruption Bill tabled in Parliament to replace the 1994 Bribery Act and establish direct asset recovery mechanisms.",
                "hansard_ref": "Hansard Vol 299, p. 102"
            },
            {
                "date": "2023-06-21",
                "stage": "Supreme Court Determination",
                "speaker": "Supreme Court of Sri Lanka",
                "summary": "Supreme Court rules 31 clauses require simple amendments to conform with Fundamental Rights guarantees.",
                "hansard_ref": "SC SD 12/2023"
            },
            {
                "date": "2023-07-19",
                "stage": "Unanimous Passage",
                "speaker": "Parliament of Sri Lanka",
                "summary": "Anti-Corruption Act No. 9 of 2023 passed without a division in Parliament.",
                "hansard_ref": "Hansard Vol 300, p. 640"
            },
            {
                "date": "2024-03-14",
                "stage": "Hansard Debate on Implementation",
                "speaker": "Anura Kumara Dissanayake (NPP)",
                "summary": "Demands immediate operationalization of public digital asset database and investigation of stalled high-profile dossiers.",
                "hansard_ref": "Hansard Vol 308, p. 1420"
            }
        ]
    )
]
