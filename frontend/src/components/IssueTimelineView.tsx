import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  ShieldCheck,
  Activity,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { IssueTimeline } from '../types';

interface IssueTimelineViewProps {
  timelines: IssueTimeline[];
  onOpenSourceModal: (data: any) => void;
}

export const IssueTimelineView: React.FC<IssueTimelineViewProps> = ({
  timelines,
  onOpenSourceModal
}) => {
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>(timelines[0]?.id || 'time-vat');

  const currentTimeline = timelines.find(t => t.id === selectedTimelineId) || timelines[0];

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <span className="badge badge-cyan">
            <Activity size={12} /> SOCIO-ECONOMIC POLICY CORRELATION
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Debates → Legislation → Department of Census & Statistics
          </span>
        </div>
        <h2 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
          Issue Timelines & Macro Indicators
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Connect earlier policy context, parliamentary debate, legislation votes, news, and official socio-economic outcomes.
        </p>
      </div>

      {/* Timeline Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {timelines.map((t) => {
          const isSelected = t.id === currentTimeline.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTimelineId(t.id)}
              className={isSelected ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '0.6rem 1.25rem' }}
            >
              <TrendingUp size={15} />
              <span>{t.topic}</span>
            </button>
          );
        })}
      </div>

      {/* Main Container: Chart on Top / Timeline Breakdown Below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Interactive Indicator Visualizer Card */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <span className="badge badge-emerald" style={{ marginBottom: '0.35rem' }}>
                PRIMARY STATISTICAL INDICATOR
              </span>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>
                {currentTimeline.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: 800 }}>
                {currentTimeline.description}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TIMESPAN</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{currentTimeline.time_span}</div>
            </div>
          </div>

          {/* Recharts Area / Line Chart */}
          <div style={{ height: 280, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              {currentTimeline.id === 'time-vat' ? (
                <AreaChart data={currentTimeline.indicator_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInflation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="inflation" name="CCPI Inflation (%)" stroke="#f43f5e" fillOpacity={1} fill="url(#colorInflation)" />
                  <Area type="monotone" dataKey="tax_revenue_gdp" name="Tax Revenue (% of GDP)" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              ) : (
                <LineChart data={currentTimeline.indicator_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="complaints" name="CIABOC Inquiries Filed" stroke="#38bdf8" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="prosecutions" name="Prosecutions Initiated" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chronological Legislative Events Pipeline */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h4 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--accent-cyan)" />
            Chronological Policy Lifecycle & Hansard Linkage
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {currentTimeline.events.map((ev, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-dot" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                      {ev.stage}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                      {ev.speaker}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {ev.date}
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.4rem', lineHeight: 1.5 }}>
                  {ev.summary}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    <CheckCircle2 size={10} /> Verified Record: {ev.hansard_ref}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
