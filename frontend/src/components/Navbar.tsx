import React from 'react';
import { 
  ShieldCheck, 
  Search, 
  Sparkles, 
  Layers, 
  Mic2, 
  GitCommit, 
  Scale, 
  TrendingUp, 
  Users, 
  Globe2,
  Sun,
  Moon
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openChat: () => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  openChat,
  selectedLanguage,
  setSelectedLanguage,
  searchQuery,
  setSearchQuery,
  theme,
  setTheme
}) => {
  const tabs = [
    { id: 'overview', label: 'Executive Overview', icon: Layers },
    { id: 'speeches', label: 'Speeches & Video Transcripts', icon: Mic2 },
    { id: 'commitments', label: 'Promise vs Reality Tracker', icon: GitCommit },
    { id: 'compare', label: 'Leader & Party Comparison', icon: Scale },
    { id: 'timelines', label: 'Policy Timelines & Stats', icon: TrendingUp },
    { id: 'mps', label: 'MP Directory', icon: Users },
  ];

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('civic_trace_theme', nextTheme);
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
      {/* Top Banner */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', padding: '0.4rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="badge badge-emerald" style={{ padding: '0.15rem 0.5rem' }}>
            <span className="pulse-dot" /> LIVE VERIFIED REPOSITORY
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Official Legislative Records • Parliament.lk, Census & Statistics, Central Bank
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
            <Globe2 size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Language:</span>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                padding: '0.15rem 0.4rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="en">English (EN)</option>
              <option value="si">සිංහල (Sinhala)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '0.25rem 0.6rem',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={13} color="#f59e0b" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={13} color="#6366f1" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('overview')} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', cursor: 'pointer' }}
        >
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}>
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)' }}>
                Civic Trace
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>PUBLIC AUDIT</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.04em', fontWeight: 600 }}>
              PARLIAMENTARY & POLICY INTELLIGENCE
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', minWidth: 280, flex: '1 1 240px', maxWidth: 460 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input 
            type="text"
            placeholder="Search debates, MP pledges, VAT bills, corruption cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.4rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '999px',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
          />
        </div>

        {/* Action: Open AI RAG Assistant */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            className="btn btn-primary"
            onClick={openChat}
            style={{
              padding: '0.5rem 1.1rem',
              fontSize: '0.82rem'
            }}
          >
            <Sparkles size={15} />
            <span>AI Evidence Copilot</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)' }}>
        <div className="app-container" style={{ padding: '0 1.5rem', display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-tab-button ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-dim)' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
