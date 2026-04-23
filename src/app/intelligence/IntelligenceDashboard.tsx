'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCompany } from '@/contexts/CompanyContext';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import styles from './intelligence.module.css';

interface DealIntel {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  pipelineStage: string;
  leadStatus: string;
  lastContactedAt: string | null;
  daysSinceContact: number | null;
  healthScore: number | null;
  dealValue: number | null;
  effectiveRisk: string;
  latestIntel: {
    sentiment: string;
    dealRisk: string;
    riskReasons: string[];
    nextStepConfirmed: boolean;
    excitement: number | null;
    analyzedAt: string;
  } | null;
  lastMeetingTitle: string | null;
  lastMeetingDate: string | null;
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  high:     { label: 'High',     color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  medium:   { label: 'Medium',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low:      { label: 'Low',      color: '#84cc16', bg: 'rgba(132,204,22,0.1)' },
  none:     { label: 'Healthy',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positive', color: '#22c55e' },
  neutral:  { label: 'Neutral',  color: '#94a3b8' },
  negative: { label: 'Negative', color: '#ef4444' },
  mixed:    { label: 'Mixed',    color: '#f59e0b' },
};


function RiskDot({ risk }: { risk: string }) {
  const c = RISK_CONFIG[risk] ?? RISK_CONFIG.none;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.55rem', borderRadius: '0.375rem',
      fontSize: '0.7rem', fontWeight: 700,
      color: c.color, background: c.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {c.label}
    </span>
  );
}

function daysAgo(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function IntelligenceDashboard() {
  const { activeCompany } = useCompany();
  const { stages: pipelineStageConfigs } = usePipelineStages();
  const STAGE_LABEL = useMemo(
    () => Object.fromEntries(pipelineStageConfigs.map(s => [s.key, s.label])),
    [pipelineStageConfigs]
  );
  const [deals, setDeals] = useState<DealIntel[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    const headers: HeadersInit = {};
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    fetch('/api/intelligence', { headers })
      .then(r => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setDeals(data as DealIntel[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCompany?.id]);

  const filtered = riskFilter === 'all'
    ? deals
    : deals.filter(d => d.effectiveRisk === riskFilter);

  const counts = {
    critical: deals.filter(d => d.effectiveRisk === 'critical').length,
    high: deals.filter(d => d.effectiveRisk === 'high').length,
    medium: deals.filter(d => d.effectiveRisk === 'medium').length,
    total: deals.length,
  };

  const stalledDeals = deals.filter(d => d.daysSinceContact !== null && d.daysSinceContact >= 14 && !['won', 'lost'].includes(d.pipelineStage));

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Intelligence</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          AI-powered pipeline health · deal risk · conversation signals
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {[
          { label: 'Total Deals', value: counts.total, color: 'var(--text-primary)' },
          { label: 'Critical Risk', value: counts.critical, color: '#ef4444' },
          { label: 'High Risk', value: counts.high, color: '#f97316' },
          { label: 'Stalled (14d+)', value: stalledDeals.length, color: '#f59e0b' },
        ].map(card => (
          <div key={card.label} className="glass-card" style={{ padding: 'var(--space-md)' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color }}>{loading ? '—' : card.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Pulse */}
      <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.1rem' }}>Pipeline Pulse</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>All active deals sorted by risk level</p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['all', 'critical', 'high', 'medium', 'low', 'none'].map(r => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: riskFilter === r
                    ? (RISK_CONFIG[r]?.bg ?? 'var(--accent-subtle)')
                    : 'var(--bg-surface-2)',
                  color: riskFilter === r
                    ? (RISK_CONFIG[r]?.color ?? 'var(--accent-primary)')
                    : 'var(--text-muted)',
                }}
              >
                {r === 'all' ? 'All' : RISK_CONFIG[r]?.label ?? r}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 56, borderRadius: '0.5rem', background: 'var(--bg-surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No deals found{riskFilter !== 'all' ? ` with ${RISK_CONFIG[riskFilter]?.label ?? riskFilter} risk` : ''}
          </div>
        ) : (
          <div className={styles.dealTable}>
            <div className={styles.dealTableHeader}>
              <span>Contact</span>
              <span>Stage</span>
              <span>Risk</span>
              <span>Sentiment</span>
              <span>Last Contact</span>
              <span>Next Step</span>
            </div>
            {filtered.map(deal => {
              const sentiment = deal.latestIntel?.sentiment;
              const sentConf = sentiment ? SENTIMENT_CONFIG[sentiment] : null;
              const isStale = deal.daysSinceContact !== null && deal.daysSinceContact >= 14;

              return (
                <Link
                  key={deal.id}
                  href={`/customers/${deal.id}`}
                  className={styles.dealRow}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--bg-surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}>
                      {deal.logoUrl
                        ? <img src={deal.logoUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : deal.name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {deal.name}
                      </div>
                      {deal.companyName && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {deal.companyName}
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {STAGE_LABEL[deal.pipelineStage] ?? deal.pipelineStage}
                  </span>
                  <span><RiskDot risk={deal.effectiveRisk} /></span>
                  <span style={{ fontSize: '0.78rem', color: sentConf?.color ?? 'var(--text-muted)' }}>
                    {sentConf?.label ?? '—'}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: isStale ? '#f97316' : 'var(--text-secondary)', fontWeight: isStale ? 600 : 400 }}>
                    {daysAgo(deal.daysSinceContact)}
                  </span>
                  <span style={{ fontSize: '0.78rem' }}>
                    {deal.latestIntel?.nextStepConfirmed
                      ? <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ Confirmed</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Stalled deals */}
      {stalledDeals.length > 0 && (
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Stalled Deals</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            No contact in 14+ days — these deals need attention
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stalledDeals.slice(0, 10).map(deal => (
              <Link
                key={deal.id}
                href={`/customers/${deal.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-surface)',
                  textDecoration: 'none', color: 'inherit',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{deal.name}</span>
                  {deal.companyName && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{deal.companyName}</span>}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#f97316', fontWeight: 600, flexShrink: 0 }}>
                  {daysAgo(deal.daysSinceContact)}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {STAGE_LABEL[deal.pipelineStage] ?? deal.pipelineStage}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
