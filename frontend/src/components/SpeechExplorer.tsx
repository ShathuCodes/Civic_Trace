import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Maximize2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Globe2, 
  Search, 
  Share2, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Speech, TimestampSegment } from '../types';

interface SpeechExplorerProps {
  speeches: Speech[];
  selectedSpeech: Speech | null;
  onSelectSpeech: (speech: Speech) => void;
  selectedLanguage: string;
  onOpenSourceModal: (speech: Speech, seg?: TimestampSegment) => void;
}

export const SpeechExplorer: React.FC<SpeechExplorerProps> = ({
  speeches,
  selectedSpeech,
  onSelectSpeech,
  selectedLanguage,
  onOpenSourceModal
}) => {
  const currentSpeech = selectedSpeech || speeches[0];

  // Video / Audio Player Simulator State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(15);
  const [activeSegmentId, setActiveSegmentId] = useState<string>('seg-1-1');
  const [searchTopic, setSearchTopic] = useState<string>('');
  const [speakerFilter, setSpeakerFilter] = useState<string>('all');
  const [langView, setLangView] = useState<string>(selectedLanguage);

  useEffect(() => {
    setLangView(selectedLanguage);
  }, [selectedLanguage]);

  // Handle Play/Pause timer simulator
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeSec((prev) => {
          const next = prev + 1;
          if (next >= currentSpeech.duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSpeech]);

  // Sync active transcript segment with current time
  useEffect(() => {
    if (!currentSpeech) return;
    const matchingSegment = currentSpeech.segments.find(
      (seg) => currentTimeSec >= seg.start_seconds && currentTimeSec <= seg.end_seconds
    );
    if (matchingSegment) {
      setActiveSegmentId(matchingSegment.id);
    }
  }, [currentTimeSec, currentSpeech]);

  const handleSeek = (seconds: number, segmentId?: string) => {
    setCurrentTimeSec(seconds);
    if (segmentId) setActiveSegmentId(segmentId);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredSpeeches = speeches.filter((sp) => {
    const matchTopic = searchTopic === '' || 
      sp.topic.toLowerCase().includes(searchTopic.toLowerCase()) || 
      sp.title.toLowerCase().includes(searchTopic.toLowerCase()) ||
      sp.summary.toLowerCase().includes(searchTopic.toLowerCase());
    const matchSpeaker = speakerFilter === 'all' || sp.speaker_id === speakerFilter;
    return matchTopic && matchSpeaker;
  });

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-cyan">
              <ShieldCheck size={12} /> WHISPER AI TIMESTAMP ALIGNMENT
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Primary Hansard Audio-Video Archive
            </span>
          </div>
          <h2 style={{ fontSize: '1.75rem', color: '#ffffff' }}>
            Speech Explorer & Synchronized Player
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Search parliamentary speeches by topic or speaker, inspect timed claims, and jump to exact verified video intervals.
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Filter by issue..."
              value={searchTopic}
              onChange={(e) => setSearchTopic(e.target.value)}
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
            value={speakerFilter}
            onChange={(e) => setSpeakerFilter(e.target.value)}
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
            <option value="all">All Speakers</option>
            <option value="mp-akd">Anura Kumara Dissanayake (NPP)</option>
            <option value="mp-sajith">Sajith Premadasa (SJB)</option>
            <option value="mp-harsha">Dr. Harsha de Silva (SJB)</option>
            <option value="mp-ranil">Ranil Wickremesinghe (UNP)</option>
            <option value="mp-sumanthiran">M.A. Sumanthiran (ITAK)</option>
          </select>
        </div>
      </div>

      {/* Main 2-Column Interface: Player on Left, Synced Transcript & Meta on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
        
        {/* Left: Video / Media Player Simulator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Video Player Display Container */}
          <div className="glass-panel" style={{ overflow: 'hidden', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            
            {/* Screen Mockup */}
            <div style={{
              height: 320,
              background: 'linear-gradient(135deg, #070b14 0%, #0f172a 100%)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              {/* Overlay Top Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-rose" style={{ padding: '0.2rem 0.6rem' }}>
                    <span className="pulse-dot" style={{ background: '#f43f5e' }} /> PARLIAMENT ARCHIVE STREAM
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)' }}>
                    SESSION #{currentSpeech.hansard_vol}
                  </span>
                </div>

                <button 
                  onClick={() => onOpenSourceModal(currentSpeech)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <ShieldCheck size={13} color="#34d399" />
                  <span>Verify Hansard PDF</span>
                </button>
              </div>

              {/* Center Speaker Graphic */}
              <div style={{ textAlign: 'center', zIndex: 2 }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  margin: '0 auto 0.75rem',
                  border: '3px solid var(--accent-cyan)',
                  overflow: 'hidden',
                  boxShadow: '0 0 25px rgba(56, 189, 248, 0.3)'
                }}>
                  <div style={{ width: '100%', height: '100%', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '1.5rem' }}>
                    {currentSpeech.speaker_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                </div>

                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  {currentSpeech.speaker_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  {currentSpeech.speaker_role} • {currentSpeech.party}
                </div>
              </div>

              {/* Subtitle Teleprompter Overlay */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '0.65rem 1rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '0.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                  <span>● Timed Subtitle ({langView.toUpperCase()})</span>
                  <span>[{formatTime(currentTimeSec)}]</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#ffffff', margin: 0, fontStyle: 'italic' }}>
                  "{(() => {
                    const activeSeg = currentSpeech.segments.find(s => s.id === activeSegmentId) || currentSpeech.segments[0];
                    if (langView === 'si' && activeSeg?.text_si) return activeSeg.text_si;
                    if (langView === 'ta' && activeSeg?.text_ta) return activeSeg.text_ta;
                    return activeSeg?.text_en || "Verbatim Hansard speech excerpt stream...";
                  })()}"
                </p>
              </div>
            </div>

            {/* Video Player Controls */}
            <div style={{ padding: '1rem 1.25rem', background: 'rgba(15, 23, 42, 0.95)' }}>
              
              {/* Progress Slider */}
              <div style={{ marginBottom: '0.85rem' }}>
                <input
                  type="range"
                  min={0}
                  max={currentSpeech.duration_seconds}
                  value={currentTimeSec}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: 'var(--accent-cyan)',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>{formatTime(currentTimeSec)}</span>
                  <span>{currentSpeech.duration}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{ width: 38, height: 38, borderRadius: '50%', padding: 0 }}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                  </button>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>
                    {isPlaying ? 'Playing Speech Sync' : 'Paused (Click to Resume)'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Language Selector for Subtitles */}
                  <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '6px' }}>
                    {['en', 'si', 'ta'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setLangView(lang)}
                        style={{
                          background: langView === lang ? 'var(--accent-cyan)' : 'transparent',
                          color: langView === lang ? '#090d16' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                    <CheckCircle2 size={12} /> {currentSpeech.verified_accuracy}% Whisper Sync
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Speech Metadata Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Parliamentary Citation & Record Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Sitting Date: </span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentSpeech.sitting_date}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Hansard Volume: </span>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{currentSpeech.hansard_vol} ({currentSpeech.hansard_page})</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Session: </span>
                <span style={{ color: 'var(--text-main)' }}>{currentSpeech.session_name}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Referenced Legislation: </span>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{currentSpeech.votes_referenced.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Synchronized Transcript & Claims */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff', marginBottom: '0.2rem' }}>
                Verifiable Transcript Segments
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Click on any timestamp interval to jump the player directly to that spoken claim.
              </p>
            </div>
            
            <span className="badge badge-purple">
              {currentSpeech.segments.length} Timed Segments
            </span>
          </div>

          {/* Segment List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: 520, overflowY: 'auto', paddingRight: '0.35rem' }}>
            {currentSpeech.segments.map((segment) => {
              const isActive = activeSegmentId === segment.id;
              
              const claimBadgeClass = 
                segment.claim_type === 'Policy Promise' ? 'badge-cyan' :
                segment.claim_type === 'Factual Statement' ? 'badge-emerald' :
                segment.claim_type === 'Critique' ? 'badge-amber' : 'badge-purple';

              return (
                <div
                  key={segment.id}
                  className={`transcript-segment ${isActive ? 'active' : ''}`}
                  onClick={() => handleSeek(segment.start_seconds, segment.id)}
                  style={{
                    cursor: 'pointer',
                    background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem'
                  }}
                >
                  {/* Segment Top Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span 
                        style={{
                          background: isActive ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.08)',
                          color: isActive ? '#090d16' : 'var(--accent-cyan)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Clock size={12} /> {segment.start_time} - {segment.end_time}
                      </span>
                      <span className={`badge ${claimBadgeClass}`} style={{ fontSize: '0.65rem' }}>
                        {segment.claim_type}
                      </span>
                    </div>

                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      <CheckCircle2 size={11} /> {segment.fact_check_status}
                    </span>
                  </div>

                  {/* Segment Spoken Text */}
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: isActive ? '#ffffff' : 'var(--text-main)', marginBottom: '0.4rem' }}>
                    {langView === 'si' && segment.text_si ? segment.text_si :
                     langView === 'ta' && segment.text_ta ? segment.text_ta :
                     segment.text_en}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    <span>Speaker: {segment.speaker}</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>Jump to {segment.start_time} →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Key Claims Summary */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} color="var(--accent-cyan)" />
              Extracted Key Legislative Claims (Gemini RAG)
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {currentSpeech.key_claims.map((claim, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>{claim}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Select Other Speeches Carousel / List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#ffffff', marginBottom: '1rem' }}>
          All Indexed Parliamentary Speeches in Pilot ({filteredSpeeches.length})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredSpeeches.map((sp) => {
            const isSelected = sp.id === currentSpeech.id;
            return (
              <div
                key={sp.id}
                className="glass-panel-hover"
                onClick={() => {
                  onSelectSpeech(sp);
                  setCurrentTimeSec(sp.segments[0]?.start_seconds || 0);
                  setIsPlaying(false);
                }}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                    {sp.topic}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    {sp.duration}
                  </span>
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--accent-cyan)' : '#ffffff' }}>
                  {sp.title}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {sp.speaker_name} ({sp.party}) • {sp.sitting_date}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
