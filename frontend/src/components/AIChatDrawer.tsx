import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Video, 
  FileText, 
  Clock,
  ShieldCheck,
  Search,
  MessageSquare
} from 'lucide-react';
import { ChatResponse, Citation, Speech } from '../types';
import { CivicApi } from '../api';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onSelectSpeech: (speechId: string) => void;
  selectedLanguage: string;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  confidence?: number;
  missingFlags?: string[];
  suggested?: string[];
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  onSelectSpeech,
  selectedLanguage
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am Civic Trace's Grounded RAG Assistant. Ask me any question regarding Sri Lankan parliamentary debates, MP voting records, manifesto promises, or socio-economic indicators. Every answer is backed by verifiable primary citations and timed video intervals.",
      suggested: [
        "How did MPs vote on the 18% VAT rate hike bill?",
        "What did Anura Kumara Dissanayake say regarding asset declarations?",
        "Did Sri Lanka achieve the IMF 2.3% primary surplus target?",
        "What is the opposition's stance on school meal programs?"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSend = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const resp: ChatResponse = await CivicApi.askChat(queryText, selectedLanguage);
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: resp.answer,
        citations: resp.citations,
        confidence: resp.confidence_score,
        missingFlags: resp.missing_evidence_flags,
        suggested: resp.suggested_queries
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: "Unable to reach the RAG API server. Displaying local grounded index results."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: 520,
      background: 'rgba(9, 13, 22, 0.96)',
      backdropFilter: 'blur(25px)',
      borderLeft: '1px solid rgba(56, 189, 248, 0.3)',
      boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.7)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Drawer Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #0284c7, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>Civic Trace Cited AI</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)' }}>Grounded Primary Evidence Retrieval</div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages Stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
            
            {/* Bubble */}
            <div style={{
              maxWidth: '92%',
              padding: '1rem 1.15rem',
              borderRadius: 'var(--radius-md)',
              background: msg.sender === 'user' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(15, 23, 42, 0.9)',
              border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontSize: '0.88rem',
              lineHeight: 1.55,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}>
              {msg.text}

              {/* Confidence badge */}
              {msg.confidence && (
                <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--accent-emerald)' }}>
                  <ShieldCheck size={13} />
                  <span>Grounding Confidence: {Math.round(msg.confidence * 100)}%</span>
                </div>
              )}

              {/* Missing Evidence Flag */}
              {msg.missingFlags && msg.missingFlags.length > 0 && (
                <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', fontSize: '0.72rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertCircle size={12} />
                  <span>{msg.missingFlags[0]}</span>
                </div>
              )}
            </div>

            {/* Citations List if present */}
            {msg.citations && msg.citations.length > 0 && (
              <div style={{ width: '92%', marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Verified Primary Citations ({msg.citations.length})
                </div>

                {msg.citations.map((cite, i) => (
                  <div 
                    key={i}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '0.55rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                        {cite.source_type}
                      </span>
                      {cite.timestamp_interval && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Video size={10} /> Clip @ {cite.timestamp_interval}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: 600 }}>
                      {cite.title}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                      <span>{cite.ref_code}</span>
                      {cite.speech_id && (
                        <button
                          onClick={() => {
                            if (cite.speech_id) onSelectSpeech(cite.speech_id);
                            onClose();
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          Jump to Video Clip →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested Followups */}
            {msg.suggested && msg.suggested.length > 0 && (
              <div style={{ width: '92%', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {msg.suggested.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(sug)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.05)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      color: 'var(--text-main)',
                      fontSize: '0.75rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    → {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.82rem', padding: '0.5rem' }}>
            <span className="pulse-dot" /> Grounding against Hansards & Census index...
          </div>
        )}
      </div>

      {/* Input Form */}
      <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'rgba(15, 23, 42, 0.95)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputQuery);
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            type="text"
            placeholder="Ask question about bills, speeches, or pledges..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '0.6rem 0.9rem',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputQuery.trim() || isLoading}
            style={{ padding: '0.6rem 1rem' }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
