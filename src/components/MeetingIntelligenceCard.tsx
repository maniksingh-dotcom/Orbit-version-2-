'use client';

import { useState } from 'react';

interface Intelligence {
  id: string;
  sentiment: string;
  dealRisk: string;
  riskReasons: string[];
  competitors: string[];
  objections: string[];
  keyTopics: string[];
  nextStepConfirmed: boolean;
  talkRatio: number | null;
  excitement: number | null;
  aiSummary: string;
  analyzedAt: string;
}

interface Props {
  meetingId: string;
  fathomId?: string;
  title?: string;
  summary?: string;
  transcript?: string;
  customerId?: string;
  initialIntelligence?: Intelligence | null;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    positive: { label: 'Positive', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    neutral:  { label: 'Neutral',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
    negative: { label: 'Negative', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    mixed:    { label: 'Mixed',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  };
  const s = map[sentiment] ?? map.neutral;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.55rem',
      borderRadius: '0.375rem',
      fontSize: '0.72rem',
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      letterSpacing: '0.02em',
    }}>
      {s.label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    none:     { label: 'No Risk',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    low:      { label: 'Low Risk', color: '#84cc16', bg: 'rgba(132,204,22,0.12)' },
    medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    high:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  };
  const r = map[risk] ?? map.none;
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.55rem',
      borderRadius: '0.375rem',
      fontSize: '0.72rem',
      fontWeight: 600,
      color: r.color,
      background: r.bg,
      letterSpacing: '0.02em',
    }}>
      {r.label}
    </span>
  );
}

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '0.15rem 0.55rem',
      borderRadius: '999px',
      fontSize: '0.72rem',
      background: 'var(--bg-surface-2)',
      color: color ?? 'var(--text-secondary)',
      border: '1px solid var(--border)',
    }}>
      {label}
    </span>
  );
}

export default function MeetingIntelligenceCard({
  meetingId, fathomId, title, summary, transcript, customerId, initialIntelligence,
}: Props) {
  const [intel, setIntel] = useState<Intelligence | null>(initialIntelligence ?? null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fathomId, title, summary, transcript, customerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setIntel(data);
        setExpanded(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!intel) {
    return (
      <button
        onClick={analyze}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          background: 'rgba(99,102,241,0.1)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(99,102,241,0.25)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3" />
              <path d="M21 12a9 9 0 00-9-9" />
            </svg>
            Analyzing…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Analyze Meeting
          </>
        )}
      </button>
    );
  }

  return (
    <div style={{
      marginTop: '0.75rem',
      borderRadius: '0.5rem',
      border: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      overflow: 'hidden',
    }}>
      {/* Summary bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.5rem 0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(v => !v)}
      >
        <svg
          width="14" height="14"
          viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: 'auto' }}>
          AI Intelligence
        </span>
        <SentimentBadge sentiment={intel.sentiment} />
        <RiskBadge risk={intel.dealRisk} />
        {intel.nextStepConfirmed && (
          <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>✓ Next step</span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, opacity: 0.5 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: '0 0.75rem 0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.6rem' }}>
          {intel.aiSummary && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              {intel.aiSummary}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {intel.riskReasons.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Risk Signals
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {intel.riskReasons.map((r, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', color: '#f97316', display: 'flex', alignItems: 'flex-start', gap: '0.3rem' }}>
                      <span style={{ marginTop: '0.15rem', flexShrink: 0 }}>⚠</span>{r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {intel.objections.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Objections
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {intel.objections.map((o, i) => (
                    <span key={i} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>• {o}</span>
                  ))}
                </div>
              </div>
            )}

            {intel.competitors.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Competitors Mentioned
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {intel.competitors.map((c, i) => (
                    <Chip key={i} label={c} color="#ef4444" />
                  ))}
                </div>
              </div>
            )}

            {intel.keyTopics.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  Key Topics
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {intel.keyTopics.map((t, i) => (
                    <Chip key={i} label={t} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem' }}>
            {intel.talkRatio !== null && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Talk ratio: <strong style={{ color: 'var(--text-secondary)' }}>{Math.round(intel.talkRatio * 100)}%</strong>
              </span>
            )}
            {intel.excitement !== null && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Buyer excitement: <strong style={{ color: intel.excitement >= 7 ? '#22c55e' : intel.excitement >= 4 ? '#f59e0b' : '#ef4444' }}>
                  {intel.excitement}/10
                </strong>
              </span>
            )}
            <button
              onClick={analyze}
              disabled={loading}
              style={{
                marginLeft: 'auto',
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              {loading ? 'Re-analyzing…' : 'Re-analyze'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
