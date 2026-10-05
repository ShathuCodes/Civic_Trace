import React from 'react';
import { 
  Users, 
  Mic2, 
  GitCommit, 
  CheckCircle2, 
  Play, 
  FileText, 
  ArrowRight, 
  Sparkles,
  Search,
  ShieldCheck,
  TrendingUp,
  Clock,
  ExternalLink
} from 'lucide-react';
import { DashboardStats, MP, Speech, Commitment } from '../types';

interface OverviewDashboardProps {
  stats: DashboardStats;
  mps: MP[];
  speeches: Speech[];
  commitments: Commitment[];
  onNavigate: (tab: string) => void;
  onSelectSpeech: (speech: Speech) => void;
  onSelectCommitment: (comm: Commitment) => void;
  openChatWithPrompt: (prompt: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  mps,
  speeches,
  commitments,
  onNavigate,
  onSelectSpeech,
  onSelectCommitment,
  openChatWithPrompt
}) => {
  const featuredSpeech = speeches[0];

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      
      {/* Clean Civic Banner */}
      <div 
        className="glass-panel" 
        style={{
          padding: '2.25rem 2.5rem',
          marginBottom: '2rem',
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem'
        }}
      >
        <div style={{ maxWidth: 720 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="badge badge-cyan">
              <ShieldCheck size={12} /> OPEN GOVERNMENT DATA PIPELINE
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Sri Lanka Parliamentary & Policy Intelligence
            </span>
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
            Track What Politicians Promised, Debated & Delivered.
          </h1>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Civic Trace connects official parliamentary Hansards, Whisper-aligned audio/video speech segments, party manifestos, recorded division votes, and official census economic indicators into one transparent public portal.
          </p>

          {/* Quick Issue Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'VAT & Tax Policy', query: 'How did MPs vote on the 18% VAT rate hike bill?' },
              { label: 'Anti-Corruption & Asset Disclosures', query: 'What did Anura Kumara Dissanayake say regarding asset declarations?' },
              { label: 'School Midday Meals', query: 'What is the opposition stance on school meal programs?' },
              { label: 'IMF Extended Fund Facility', query: 'Did Sri Lanka achieve the IMF 2.3% primary surplus target?' }
            ].map((pill, idx) => (
              <button
                key={idx}
                onClick={() => openChatWithPrompt(pill.query)}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '999px',
                  padding: '0.35rem 0.85rem',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Search size={12} color="var(--accent-cyan)" />
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 240 }}>
          <button 
            className="btn btn-primary"
            onClick={() => onNavigate('speeches')}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mic2 size={16} /> Explore Speeches
            </span>
            <ArrowRight size={15} />
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('commitments')}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GitCommit size={16} /> Promise vs Reality
            </span>
            <ArrowRight size={15} />
          </button>

          <button 
            className="btn btn-secondary"
            onClick={() => onNavigate('compare')}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} /> Compare Leaders
            </span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* 4 Clean Key Metrics */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>INDEXED SPEECHES</span>
            <Mic2 size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.total_speeches_indexed} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500 }}>debates</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span className="badge badge-cyan" style={{ padding: '0.1rem 0.4rem', fontSize: '0.68rem' }}>
              {stats.average_whisper_alignment_accuracy}% sync accuracy
            </span>
          </div>
        </div>

        <div className="glass-panel metric-card emerald">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>TRACKED COMMITMENTS</span>
            <GitCommit size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.total_commitments_tracked} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500 }}>pledges</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{stats.commitments_breakdown.kept} Kept</span> • <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{stats.commitments_breakdown.in_progress} In Progress</span>
          </div>
        </div>

        <div className="glass-panel metric-card amber">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>CHAMBER MPS</span>
            <Users size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.total_mps_tracked} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500 }}>leaders</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Cross-party parliamentary records
          </div>
        </div>

        <div className="glass-panel metric-card purple">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIMARY ARCHIVE</span>
            <FileText size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {stats.hansard_pages_indexed} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500 }}>pages</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {stats.video_hours_synced} hrs verified video audio synced
          </div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
        
        {/* Left Column: Recent Synced Speeches */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Recent Parliamentary Speeches</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Synced transcript with clickable video intervals</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('speeches')}
            >
              View All ({speeches.length})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {speeches.slice(0, 3).map((speech) => (
              <div 
                key={speech.id}
                className="glass-panel glass-panel-hover"
                onClick={() => {
                  onSelectSpeech(speech);
                  onNavigate('speeches');
                }}
                style={{
                  padding: '1rem 1.15rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    {speech.title}
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                    {speech.duration}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{speech.speaker_name}</span>
                  <span>•</span>
                  <span>{speech.party}</span>
                  <span>•</span>
                  <span>{speech.sitting_date}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    <CheckCircle2 size={11} /> {speech.hansard_vol}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    {speech.segments.length} verified timed segments
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Commitment Tracker Highlights */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-main)' }}>Promise vs Reality Tracker</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Manifestos verified against legislative votes & census</p>
            </div>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('commitments')}
            >
              View All ({commitments.length})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {commitments.slice(0, 3).map((comm) => {
              const statusBadge = 
                comm.current_status === 'Kept' ? 'badge-emerald' :
                comm.current_status === 'In Progress' ? 'badge-cyan' :
                comm.current_status === 'Compromised' ? 'badge-amber' : 'badge-crimson';

              return (
                <div 
                  key={comm.id}
                  className="glass-panel glass-panel-hover"
                  onClick={() => {
                    onSelectCommitment(comm);
                    onNavigate('commitments');
                  }}
                  style={{
                    padding: '1rem 1.15rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                      {comm.title}
                    </span>
                    <span className={`badge ${statusBadge}`} style={{ fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                      {comm.current_status}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{comm.original_quote}"
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>Sponsor: {comm.sponsor_name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>Confidence: {comm.confidence_score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grounding & Verification Progress */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={16} color="var(--accent-cyan)" />
          Civic Grounding & Delivery Index
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-main)' }}>Whisper Speech-to-Text Precision</span>
              <span style={{ color: 'var(--accent-cyan)' }}>98.2%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '98.2%', background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-main)' }}>Census & Central Bank Grounding</span>
              <span style={{ color: 'var(--accent-emerald)' }}>95.0%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '95%', background: 'linear-gradient(90deg, #059669, #10b981)' }} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700 }}>
              <span style={{ color: 'var(--text-main)' }}>Legislative Gazette Verification</span>
              <span style={{ color: 'var(--accent-purple)' }}>88.5%</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '88.5%', background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
