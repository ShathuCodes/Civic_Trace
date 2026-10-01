import React, { useState } from 'react';
import { 
  Scale, 
  Users, 
  CheckCircle2, 
  Award, 
  Calendar, 
  Vote, 
  FileText, 
  ChevronRight,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { MP } from '../types';

interface LeaderComparisonProps {
  mps: MP[];
  onSelectMP: (mp: MP) => void;
}

export const LeaderComparison: React.FC<LeaderComparisonProps> = ({
  mps,
  onSelectMP
}) => {
  const [leaderAId, setLeaderAId] = useState<string>(mps[0]?.id || 'mp-akd');
  const [leaderBId, setLeaderBId] = useState<string>(mps[1]?.id || 'mp-sajith');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const leaderA = mps.find(m => m.id === leaderAId) || mps[0];
  const leaderB = mps.find(m => m.id === leaderBId) || mps[1];

  const allTopics = [
    "Tax Reform",
    "IMF Agreement",
    "Anti-Corruption",
    "Energy Policy",
    "Education"
  ];

  const displayedTopics = selectedTopic === 'all' ? allTopics : [selectedTopic];

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span className="badge badge-purple">
            <Scale size={12} /> CROSS-PARTY POLICY MATRIX
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Primary Record Stance & Voting Comparison
          </span>
        </div>
        <h2 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
          Party & Leader Side-by-Side Comparison
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Compare policies, Hansard debate statements, recorded votes, and follow-up metrics for the same period and issue area.
        </p>
      </div>

      {/* Leader Selectors Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        
        {/* Leader A Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 250px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Leader 1:</span>
          <select
            value={leaderAId}
            onChange={(e) => setLeaderAId(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--accent-cyan)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {mps.map((mp) => (
              <option key={mp.id} value={mp.id} disabled={mp.id === leaderBId}>
                {mp.name} ({mp.party_code})
              </option>
            ))}
          </select>
        </div>

        {/* VS Badge */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #38bdf8, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#090d16',
          fontWeight: 800,
          fontSize: '0.78rem'
        }}>
          VS
        </div>

        {/* Leader B Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1 1 250px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>Leader 2:</span>
          <select
            value={leaderBId}
            onChange={(e) => setLeaderBId(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid var(--accent-purple)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {mps.map((mp) => (
              <option key={mp.id} value={mp.id} disabled={mp.id === leaderAId}>
                {mp.name} ({mp.party_code})
              </option>
            ))}
          </select>
        </div>

        {/* Topic Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Focus Issue:</span>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.45rem 0.75rem',
              color: 'var(--text-main)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Policy Domains</option>
            {allTopics.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parliamentary Metrics Comparison Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Profile Card A */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              fontWeight: 800,
              fontSize: '1.2rem'
            }}>
              {leaderA.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>{leaderA.name}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>{leaderA.current_role}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{leaderA.party} • {leaderA.district}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ATTENDANCE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{leaderA.attendance_rate}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SPEECHES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{leaderA.total_speeches}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>VOTES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{leaderA.votes_attended}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {leaderA.bio}
          </div>
        </div>

        {/* Profile Card B */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderTop: '3px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid var(--accent-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-purple)',
              fontWeight: 800,
              fontSize: '1.2rem'
            }}>
              {leaderB.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>{leaderB.name}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)' }}>{leaderB.current_role}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{leaderB.party} • {leaderB.district}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>ATTENDANCE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>{leaderB.attendance_rate}%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>SPEECHES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>{leaderB.total_speeches}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>VOTES</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{leaderB.votes_attended}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {leaderB.bio}
          </div>
        </div>
      </div>

      {/* Side-by-Side Policy Stances Matrix */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Scale size={18} color="var(--accent-cyan)" />
          Policy Stance & Legislative Record Matrix
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {displayedTopics.map((topic) => {
            const stanceA = leaderA.stances[topic] || "No explicit stance recorded in current parliamentary session.";
            const stanceB = leaderB.stances[topic] || "No explicit stance recorded in current parliamentary session.";

            return (
              <div 
                key={topic}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>{topic}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Hansard Debates & Manifesto Comparison</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {/* Leader A Stance */}
                  <div style={{ borderLeft: '3px solid var(--accent-cyan)', paddingLeft: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {leaderA.name} ({leaderA.party_code})
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                      {stanceA}
                    </p>
                  </div>

                  {/* Leader B Stance */}
                  <div style={{ borderLeft: '3px solid var(--accent-purple)', paddingLeft: '0.85rem' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-purple)', fontWeight: 700, marginBottom: '0.25rem' }}>
                      {leaderB.name} ({leaderB.party_code})
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>
                      {stanceB}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
