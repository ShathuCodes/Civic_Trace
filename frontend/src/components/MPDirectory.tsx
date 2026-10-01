import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Award, 
  Mic2, 
  Vote, 
  CheckCircle2, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building
} from 'lucide-react';
import { MP } from '../types';

interface MPDirectoryProps {
  mps: MP[];
  onSelectMP: (mp: MP) => void;
  onNavigateToSpeeches: (speakerId: string) => void;
}

export const MPDirectory: React.FC<MPDirectoryProps> = ({
  mps,
  onSelectMP,
  onNavigateToSpeeches
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [partyFilter, setPartyFilter] = useState<string>('all');
  const [activeModalMP, setActiveModalMP] = useState<MP | null>(null);

  const filteredMps = mps.filter((mp) => {
    const matchSearch = searchQuery === '' || 
      mp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      mp.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mp.policy_focus.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchParty = partyFilter === 'all' || mp.party_code.toLowerCase() === partyFilter.toLowerCase();
    return matchSearch && matchParty;
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-cyan">
              <Users size={12} /> PARLIAMENTARY AUDIT PROFILES
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              225 Member Chamber Pilot
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
            Members of Parliament Directory
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Inspect attendance metrics, Hansard speech volumes, party loyalty indices, and verified policy stances.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search MP or district..."
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
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
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
            <option value="all">All Parties</option>
            <option value="NPP">NPP</option>
            <option value="SJB">SJB</option>
            <option value="UNP">UNP</option>
            <option value="ITAK">ITAK</option>
            <option value="SLPP">SLPP</option>
          </select>
        </div>
      </div>

      {/* MP Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {filteredMps.map((mp) => (
          <div
            key={mp.id}
            className="glass-panel glass-panel-hover"
            style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Top row: Avatar + Name + Party */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid var(--border-glow)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem'
              }}>
                {mp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '1rem', color: '#ffffff', margin: 0 }}>{mp.name}</h4>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{mp.party_code}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>{mp.current_role}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <MapPin size={11} /> {mp.district} District
                </div>
              </div>
            </div>

            {/* Performance Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>ATTENDANCE</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{mp.attendance_rate}%</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>SPEECHES</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{mp.total_speeches}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>LOYALTY</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{mp.loyalty_index}%</div>
              </div>
            </div>

            {/* Policy Focus Chips */}
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.35rem' }}>KEY LEGISLATIVE DOMAINS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {mp.policy_focus.map((focus, i) => (
                  <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', fontSize: '0.68rem' }}>
                    {focus}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveModalMP(mp)}
                style={{ flex: 1 }}
              >
                <span>Full Audit Profile</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onNavigateToSpeeches(mp.id)}
                style={{ flex: 1 }}
              >
                <Mic2 size={13} />
                <span>Hansard Speeches</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed MP Modal */}
      {activeModalMP && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="glass-panel" style={{ maxWidth: 650, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0284c7, #10b981)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1.4rem'
                }}>
                  {activeModalMP.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.3rem', color: '#ffffff', margin: 0 }}>{activeModalMP.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>{activeModalMP.current_role}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{activeModalMP.party} • {activeModalMP.district}</div>
                </div>
              </div>

              <button
                onClick={() => setActiveModalMP(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {activeModalMP.bio}
            </p>

            <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.75rem' }}>
              Recorded Policy Stances in Hansard
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {Object.entries(activeModalMP.stances).map(([domain, stance]) => (
                <div key={domain} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{domain}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>{stance}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setActiveModalMP(null)}>
                Close
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  onNavigateToSpeeches(activeModalMP.id);
                  setActiveModalMP(null);
                }}
              >
                <Mic2 size={15} />
                <span>View All Debates ({activeModalMP.total_speeches})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
