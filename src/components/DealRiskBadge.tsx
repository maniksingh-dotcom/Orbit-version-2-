'use client';

interface Props {
  risk: string;
  compact?: boolean;
}

const RISK_MAP: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴' },
  high:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '🟠' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  low:      { label: 'Low',      color: '#84cc16', bg: 'rgba(132,204,22,0.12)', icon: '🟢' },
  none:     { label: 'Healthy',  color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  icon: '✓' },
};

export default function DealRiskBadge({ risk, compact = false }: Props) {
  const r = RISK_MAP[risk];
  if (!r || risk === 'none') return null;

  if (compact) {
    return (
      <span title={`Risk: ${r.label}`} style={{ fontSize: '0.8rem' }}>{r.icon}</span>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      padding: '0.15rem 0.5rem',
      borderRadius: '0.375rem',
      fontSize: '0.7rem',
      fontWeight: 600,
      color: r.color,
      background: r.bg,
      whiteSpace: 'nowrap',
    }}>
      <svg width="8" height="8" viewBox="0 0 8 8" fill={r.color}>
        <circle cx="4" cy="4" r="4" />
      </svg>
      {r.label}
    </span>
  );
}
