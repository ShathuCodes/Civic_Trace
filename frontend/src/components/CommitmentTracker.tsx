import React, { useState } from 'react';
import { 
  GitCommit, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  HelpCircle, 
  FileText, 
  Search, 
  ChevronRight, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { Commitment, CommitmentTimelineEvent } from '../types';

interface CommitmentTrackerProps {
  commitments: Commitment[];
  selectedCommitment: Commitment | null;
  onSelectCommitment: (comm: Commitment) => void;
  onOpenSourceModal: (data: any) => void;
}

export const CommitmentTracker: React.FC<CommitmentTrackerProps> = ({
  commitments,
  selectedCommitment,
  onSelectCommitment,
  onOpenSourceModal
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentCommitment = selectedCommitment || commitments[0];

  const filteredCommitments = commitments.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.current_status.toLowerCase() === statusFilter.toLowerCase();
    const matchCategory = categoryFilter === 'all' || c.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const matchSearch = searchQuery === '' || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.original_quote.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sponsor_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchCategory && matchSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Kept':
        return <span className="badge badge-emerald"><CheckCircle2 size={12} /> Kept</span>;
      case 'In Progress':
        return <span className="badge badge-cyan"><Clock size={12} /> In Progress</span>;
      case 'Compromised':
        return <span className="badge badge-amber"><AlertCircle size={12} /> Compromised</span>;
      case 'Broken':
        return <span className="badge badge-rose"><XCircle size={12} /> Broken</span>;
      default:
        return <span className="badge badge-purple"><HelpCircle size={12} /> Under Review</span>;
    }
  };

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-emerald">
              <Landmark size={12} /> MANIFESTO TO GAZZETTE AUDIT
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Promise vs Reality Verification Pipeline
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
            Commitment Tracker (Promise vs Reality)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Track election manifestos through parliamentary Hansards, legislative votes, and subsequent socio-economic indicators.
          </p>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search promise or sponsor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.45rem 0.8rem 0.45rem 2rem',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.45rem 0.8rem',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Kept">Kept</option>
            <option value="In Progress">In Progress</option>
            <option value="Compromised">Compromised</option>
            <option value="Under Review">Under Review</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Split: Commitment List on Left, Comprehensive Audit Trail on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
        
        {/* Left Column: Commitment Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            TRACKED PUBLIC COMMITMENTS ({filteredCommitments.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: 680, overflowY: 'auto', paddingRight: '0.25rem' }}>
            {filteredCommitments.map((comm) => {
              const isSelected = comm.id === currentCommitment.id;
              return (
                <div
                  key={comm.id}
                  className="glass-panel-hover"
                  onClick={() => onSelectCommitment(comm)}
                  style={{
                    padding: '1.15rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.09)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                      {comm.category}
                    </span>
                    {getStatusBadge(comm.current_status)}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.96rem', color: isSelected ? 'var(--accent-cyan)' : '#ffffff' }}>
                    {comm.title}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    "{comm.original_quote}"
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                    <span>Sponsor: <strong style={{ color: 'var(--text-main)' }}>{comm.sponsor_name}</strong></span>
                    <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{comm.confidence_score}% Confidence</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Comprehensive Commitment Audit Trail */}
        {currentCommitment && (
          <div className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Top Detail Card */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span className="badge badge-cyan">{currentCommitment.category}</span>
                {getStatusBadge(currentCommitment.current_status)}
              </div>

              <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '0.5rem' }}>
                {currentCommitment.title}
              </h3>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span>Party: <strong style={{ color: 'var(--text-main)' }}>{currentCommitment.party}</strong></span>
                <span>•</span>
                <span>Sponsor: <strong style={{ color: 'var(--accent-cyan)' }}>{currentCommitment.sponsor_name}</strong></span>
                <span>•</span>
                <span>Source: <strong style={{ color: 'var(--text-main)' }}>{currentCommitment.manifesto_year}</strong></span>
              </div>

              {/* Manifesto Quote Box */}
              <div style={{
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Original Documented Manifesto Pledge
                </div>
                <p style={{ fontSize: '0.88rem', color: '#ffffff', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                  "{currentCommitment.original_quote}"
                </p>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
                  Reference: {currentCommitment.manifesto_source}
                </div>
              </div>

              {/* Target vs Achieved Metric Matrix */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>TARGET BENCHMARK</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--accent-cyan)', fontWeight: 700, marginTop: '0.2rem' }}>
                    {currentCommitment.target_metric}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>LATEST VERIFIED METRIC</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--accent-emerald)', fontWeight: 700, marginTop: '0.2rem' }}>
                    {currentCommitment.achieved_metric}
                  </div>
                </div>
              </div>

              {/* Verdict Summary */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 700, marginBottom: '0.2rem' }}>
                  CIVIC TRACE AUDIT VERDICT ({currentCommitment.confidence_score}% CONFIDENCE)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
                  {currentCommitment.verdict_summary}
                </p>
              </div>
            </div>

            {/* End-to-End Visual Audit Trail Timeline */}
            <div>
              <h4 style={{ fontSize: '1rem', color: '#ffffff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GitCommit size={16} color="var(--accent-cyan)" />
                End-to-End Verification Pipeline
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {currentCommitment.timeline.map((event, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot" />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                        {event.stage}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {event.date}
                      </span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff', marginBottom: '0.25rem' }}>
                      {event.title}
                    </div>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      {event.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                        <CheckCircle2 size={10} /> {event.source_type}: {event.source_ref}
                      </span>
                      <a 
                        href={event.source_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'none' }}
                      >
                        Primary Record <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
