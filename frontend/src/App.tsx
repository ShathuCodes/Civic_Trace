import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { SpeechExplorer } from './components/SpeechExplorer';
import { CommitmentTracker } from './components/CommitmentTracker';
import { LeaderComparison } from './components/LeaderComparison';
import { IssueTimelineView } from './components/IssueTimelineView';
import { MPDirectory } from './components/MPDirectory';
import { AIChatDrawer } from './components/AIChatDrawer';
import { SourceModal } from './components/SourceModal';
import { CivicApi, LOCAL_MPS, LOCAL_SPEECHES, LOCAL_COMMITMENTS, LOCAL_TIMELINES } from './api';
import { DashboardStats, MP, Speech, Commitment, IssueTimeline } from './types';
import { ShieldCheck, Database, Cpu } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('civic_trace_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Data State
  const [stats, setStats] = useState<DashboardStats>({
    total_mps_tracked: LOCAL_MPS.length,
    total_speeches_indexed: LOCAL_SPEECHES.length,
    total_commitments_tracked: LOCAL_COMMITMENTS.length,
    commitments_breakdown: { kept: 1, in_progress: 2, compromised: 1, broken: 0 },
    average_whisper_alignment_accuracy: 96.5,
    hansard_pages_indexed: 4850,
    video_hours_synced: 38.5,
    active_pilot_sessions: ["9th Parliament - 4th Session", "2024 Budget Committee Stages"]
  });
  const [mps, setMps] = useState<MP[]>(LOCAL_MPS);
  const [speeches, setSpeeches] = useState<Speech[]>(LOCAL_SPEECHES);
  const [commitments, setCommitments] = useState<Commitment[]>(LOCAL_COMMITMENTS);
  const [timelines, setTimelines] = useState<IssueTimeline[]>(LOCAL_TIMELINES);

  // Active selections
  const [selectedSpeech, setSelectedSpeech] = useState<Speech | null>(LOCAL_SPEECHES[0]);
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(LOCAL_COMMITMENTS[0]);

  // Modals & Drawers
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [activeModalSpeech, setActiveModalSpeech] = useState<Speech | null>(null);

  useEffect(() => {
    CivicApi.getStats().then(setStats).catch(() => { });
    CivicApi.getMPs().then(setMps).catch(() => { });
    CivicApi.getSpeeches().then(setSpeeches).catch(() => { });
    CivicApi.getCommitments().then(setCommitments).catch(() => { });
    CivicApi.getTimelines().then(setTimelines).catch(() => { });
  }, []);

  const handleOpenChatWithPrompt = (prompt: string) => {
    setIsChatOpen(true);
  };

  const handleNavigateToSpeeches = (speakerId: string) => {
    const sp = speeches.find(s => s.speaker_id === speakerId);
    if (sp) setSelectedSpeech(sp);
    setActiveTab('speeches');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-main)' }}>
      {/* Top Header & Navigation with Theme Toggle */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openChat={() => setIsChatOpen(true)}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        theme={theme}
        setTheme={setTheme}
      />

      {/* Main Tab Content */}
      <main className="app-container" style={{ flex: 1 }}>
        {activeTab === 'overview' && (
          <OverviewDashboard
            stats={stats}
            mps={mps}
            speeches={speeches}
            commitments={commitments}
            onNavigate={setActiveTab}
            onSelectSpeech={(sp) => {
              setSelectedSpeech(sp);
              setActiveTab('speeches');
            }}
            onSelectCommitment={(c) => {
              setSelectedCommitment(c);
              setActiveTab('commitments');
            }}
            openChatWithPrompt={handleOpenChatWithPrompt}
          />
        )}

        {activeTab === 'speeches' && (
          <SpeechExplorer
            speeches={speeches}
            selectedSpeech={selectedSpeech}
            onSelectSpeech={setSelectedSpeech}
            selectedLanguage={selectedLanguage}
            onOpenSourceModal={(sp) => setActiveModalSpeech(sp)}
          />
        )}

        {activeTab === 'commitments' && (
          <CommitmentTracker
            commitments={commitments}
            selectedCommitment={selectedCommitment}
            onSelectCommitment={setSelectedCommitment}
            onOpenSourceModal={(comm) => {
              const sp = speeches.find(s => s.speaker_id === comm.sponsor_mp_id) || speeches[0];
              setActiveModalSpeech(sp);
            }}
          />
        )}

        {activeTab === 'compare' && (
          <LeaderComparison
            mps={mps}
            onSelectMP={(mp) => handleNavigateToSpeeches(mp.id)}
          />
        )}

        {activeTab === 'timelines' && (
          <IssueTimelineView
            timelines={timelines}
            onOpenSourceModal={(_t) => setActiveModalSpeech(speeches[0])}
          />
        )}

        {activeTab === 'mps' && (
          <MPDirectory
            mps={mps}
            onSelectMP={(mp) => handleNavigateToSpeeches(mp.id)}
            onNavigateToSpeeches={handleNavigateToSpeeches}
          />
        )}
      </main>

      {/* Cited AI RAG Chatbot Drawer */}
      <AIChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedLanguage={selectedLanguage}
        onSelectSpeech={(speechId) => {
          const sp = speeches.find(s => s.id === speechId);
          if (sp) {
            setSelectedSpeech(sp);
            setActiveTab('speeches');
          }
        }}
      />

      {/* Primary Evidence Inspector Modal */}
      <SourceModal
        speech={activeModalSpeech}
        onClose={() => setActiveModalSpeech(null)}
      />



    </div>
  );
}

export default App;
