'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCompany } from '@/contexts/CompanyContext';
import styles from './leads.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = '7d' | '30d' | '90d' | 'all';

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversionToNext: number | null;
}

interface OverdueItem {
  id: string;
  name: string;
  companyName: string | null;
  nextFollowUpAt: string;
  daysOverdue: number;
  leadStatus: string;
  pipelineStage: string;
}

interface Source {
  source: string;
  label: string;
  count: number;
  wonCount: number;
  winRate: number;
}

interface DashboardData {
  summary: {
    totalLeads: number;
    hotLeads: number;
    winRate: number;
    pipelineValue: number;
  };
  funnel: FunnelStage[];
  overdueFollowUps: OverdueItem[];
  velocity: {
    avgDaysToClose: number | null;
    winRate: number;
    wonCount: number;
    lostCount: number;
    avgDaysPerStage: Record<string, number>;
  };
  sources: Source[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
  return val > 0 ? `$${val}` : '—';
}

const LEAD_STATUS_COLORS: Record<string, string> = {
  hot: '#ef4444',
  active: '#22c55e',
  cold: '#64748b',
  not_interested: '#94a3b8',
};

const STAGE_COLORS = [
  'rgba(99,102,241,0.7)',
  'rgba(139,92,246,0.7)',
  'rgba(168,85,247,0.7)',
  'rgba(217,70,239,0.7)',
  'rgba(249,115,22,0.7)',
  'rgba(234,179,8,0.7)',
  'rgba(34,197,94,0.7)',
];

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ h = 20, w = '100%' }: { h?: number; w?: string }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: 6,
      background: 'var(--bg-surface-2)',
      animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadsDashboard() {
  const { activeCompany } = useCompany();
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const headers: HeadersInit = {};
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    fetch(`/api/leads/dashboard?period=${period}`, { headers })
      .then(r => r.json())
      .then((d: unknown) => setData(d as DashboardData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, activeCompany?.id]);

  const maxFunnelCount = data ? Math.max(...data.funnel.map(f => f.count), 1) : 1;
  const maxSourceCount = data ? Math.max(...data.sources.map(s => s.count), 1) : 1;

  const periodLabels: Record<Period, string> = {
    '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time',
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>Lead Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Pipeline health · follow-up tracker · conversion analytics
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'var(--bg-surface)', borderRadius: '0.5rem', padding: '0.25rem', border: '1px solid var(--border)' }}>
          {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '0.3rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontWeight: period === p ? 700 : 400,
                border: 'none',
                cursor: 'pointer',
                background: period === p ? 'var(--accent-primary)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s',
              }}
            >
              {p === 'all' ? 'All Time' : p === '7d' ? '7d' : p === '30d' ? '30d' : '90d'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <Skeleton h={32} w="60%" /><div style={{ marginTop: 8 }} /><Skeleton h={14} w="80%" />
            </div>
          ))
        ) : data ? (
          <>
            <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.summary.totalLeads}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Total Leads</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{periodLabels[period]}</div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>{data.summary.hotLeads}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Hot Leads</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {data.summary.totalLeads > 0 ? `${Math.round((data.summary.hotLeads / data.summary.totalLeads) * 100)}% of total` : '—'}
              </div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <div style={{
                fontSize: '2rem', fontWeight: 700,
                color: data.summary.winRate >= 30 ? '#22c55e' : data.summary.winRate >= 15 ? '#f59e0b' : '#ef4444',
              }}>
                {data.summary.winRate}%
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Win Rate</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                {data.velocity.wonCount}W · {data.velocity.lostCount}L
              </div>
            </div>
            <div className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {formatValue(data.summary.pipelineValue)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Pipeline Value</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Active stages only</div>
            </div>
          </>
        ) : null}
      </div>

      {/* Pipeline Funnel */}
      <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.15rem' }}>Pipeline Funnel</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Lead volume at each stage · conversion rate to next stage
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...Array(7)].map((_, i) => <Skeleton key={i} h={40} />)}
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {data.funnel.map((stage, i) => (
              <div key={stage.stage}>
                <div className={styles.funnelRow}>
                  <span className={styles.funnelLabel}>{stage.label}</span>
                  <div className={styles.funnelTrack}>
                    <div
                      className={styles.funnelBar}
                      style={{
                        width: stage.count === 0 ? '0%' : `${Math.max(2, (stage.count / maxFunnelCount) * 100)}%`,
                        background: STAGE_COLORS[i % STAGE_COLORS.length],
                      }}
                    />
                  </div>
                  <span className={styles.funnelCount}>{stage.count}</span>
                  {stage.value > 0 && (
                    <span className={styles.funnelValue}>{formatValue(stage.value)}</span>
                  )}
                </div>
                {stage.conversionToNext !== null && stage.count > 0 && (
                  <div className={styles.conversionArrow}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M2 6l3 3 3-3" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{stage.conversionToNext}% continue</span>
                  </div>
                )}
              </div>
            ))}
            {/* Won + Lost side by side */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>
                Won: {data.velocity.wonCount}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>·</span>
              <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
                Lost: {data.velocity.lostCount}
              </span>
              {data.summary.winRate > 0 && (
                <>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>·</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {data.summary.winRate}% win rate
                  </span>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Three-column section */}
      <div className={styles.threeCol}>

        {/* Overdue Follow-ups */}
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.1rem' }}>Overdue Follow-ups</h2>
            {!loading && data && (
              <p style={{ fontSize: '0.75rem', color: data.overdueFollowUps.length > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                {data.overdueFollowUps.length === 0 ? 'All caught up!' : `${data.overdueFollowUps.length} overdue`}
              </p>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[...Array(5)].map((_, i) => <Skeleton key={i} h={52} />)}
            </div>
          ) : (data?.overdueFollowUps?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>✓</div>
              No overdue follow-ups
            </div>
          ) : (
            <div className={styles.overdueList}>
              {(data?.overdueFollowUps ?? []).map(item => (
                <Link key={item.id} href={`/customers/${item.id}`} className={styles.overdueRow}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </div>
                    {item.companyName && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.companyName}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                      borderRadius: '0.3rem', background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                    }}>
                      {item.daysOverdue}d overdue
                    </span>
                    <span style={{
                      fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '0.25rem',
                      background: 'var(--bg-surface-2)',
                      color: LEAD_STATUS_COLORS[item.leadStatus] ?? 'var(--text-muted)',
                    }}>
                      {item.leadStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && data && data.overdueFollowUps.length > 0 && (
            <Link
              href="/customers"
              style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--accent-primary)', textAlign: 'center', textDecoration: 'none' }}
            >
              View all in People →
            </Link>
          )}
        </div>

        {/* Velocity & Win Rate */}
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.1rem' }}>Velocity & Win Rate</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>How fast deals close</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton h={64} /><Skeleton h={40} /><Skeleton h={100} />
            </div>
          ) : data ? (
            <>
              {/* Big win rate */}
              <div style={{
                textAlign: 'center', padding: '1rem 0', marginBottom: '1rem',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  fontSize: '3rem', fontWeight: 800, lineHeight: 1,
                  color: data.velocity.winRate >= 30 ? '#22c55e' : data.velocity.winRate >= 15 ? '#f59e0b' : data.velocity.winRate > 0 ? '#ef4444' : 'var(--text-muted)',
                }}>
                  {data.velocity.winRate > 0 ? `${data.velocity.winRate}%` : '—'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Win Rate</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {data.velocity.wonCount} won · {data.velocity.lostCount} lost
                </div>
              </div>

              {/* Avg cycle time */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Avg. days to close</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {data.velocity.avgDaysToClose !== null ? `${data.velocity.avgDaysToClose}d` : '—'}
                </span>
              </div>

              {/* Per-stage breakdown */}
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Avg. days per stage
                </div>
                {Object.entries(data.velocity.avgDaysPerStage).map(([stage, days]) => (
                  <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{stage}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{days}d</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Lead Sources */}
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.1rem' }}>Lead Sources</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Where your leads come from</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[...Array(6)].map((_, i) => <Skeleton key={i} h={36} />)}
            </div>
          ) : (data?.sources?.length ?? 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No source data yet
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                {(data?.sources ?? []).map(src => (
                  <div key={src.source} className={styles.sourceRow}>
                    <span className={styles.sourceLabel}>{src.label}</span>
                    <div className={styles.sourceTrack}>
                      <div
                        className={styles.sourceBar}
                        style={{ width: `${Math.max(2, (src.count / maxSourceCount) * 100)}%` }}
                      />
                    </div>
                    <span className={styles.sourceCount}>{src.count}</span>
                    {src.winRate > 0 && (
                      <span className={styles.sourceWinRate}>{src.winRate}%</span>
                    )}
                  </div>
                ))}
              </div>

              {(data?.sources?.length ?? 0) > 0 && (
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Best source:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {(data?.sources ?? []).reduce((best, s) => s.winRate > best.winRate ? s : best, (data?.sources ?? [])[0]).label}
                  </strong>
                  {' '}(highest win rate)
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
