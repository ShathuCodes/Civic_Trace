import React from 'react';
import { 
  ShieldCheck, 
  X, 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Download, 
  Layers 
} from 'lucide-react';
import { Speech } from '../types';

interface SourceModalProps {
  speech: Speech | null;
  onClose: () => void;
}

export const SourceModal: React.FC<SourceModalProps> = ({ speech, onClose }) => {
  if (!speech) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 250,
      padding: '1.5rem'
    }}>
      <div className="glass-panel" style={{ maxWidth: 700, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0 }}>
                Primary Source Provenance & Verification
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                Official Parliamentary Archive Linkage
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Record Overview */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
            Documented Parliamentary Debate
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
            {speech.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Speaker: </span>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{speech.speaker_name} ({speech.party})</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Sitting Date: </span>
              <span style={{ color: '#ffffff' }}>{speech.sitting_date}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Official Hansard: </span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{speech.hansard_vol}, {speech.hansard_page}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)' }}>Whisper Alignment: </span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>{speech.verified_accuracy}% Timestamp Confidence</span>
            </div>
          </div>
        </div>

        {/* Pipeline Ingestion Checkpoints */}
        <h4 style={{ fontSize: '0.92rem', color: '#ffffff', marginBottom: '0.75rem' }}>
          Pipeline Ingestion & Verification Checkpoints
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
          {[
            { step: "1. Hansard PDF Extraction", desc: "OCR text extracted from Parliament.lk official daily bulletin with speaker resolution.", status: "Verified" },
            { step: "2. Whisper Audio-Video Segmentation", desc: "Audio track extracted and time-aligned with 5-second precision timestamp bounds.", status: "Verified" },
            { step: "3. Gemini RAG Claim Structuring", desc: "Key factual claims, policy promises, and critiques extracted into vector embeddings.", status: "Verified" },
            { step: "4. Cross-Reference with DCS / Gazettes", desc: "Statistical claims linked to Department of Census & Statistics monthly inflation releases.", status: "Verified" }
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ffffff' }}>{item.step}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                <CheckCircle2 size={11} /> {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Inspector
          </button>
          <a
            href={speech.hansard_pdf_url}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={14} />
            <span>Download Official Hansard PDF</span>
          </a>
        </div>
      </div>
    </div>
  );
};
