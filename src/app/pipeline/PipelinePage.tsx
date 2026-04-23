'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useCompany } from '@/contexts/CompanyContext';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { DEFAULT_PIPELINE_STAGES, PipelineStageConfig } from '@/lib/defaultPipelineStages';
import styles from './pipeline.module.css';

type Period = '7d' | '30d' | '90d' | 'all';

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  value: number;
  conversionToNext: number | null;
}

interface DealStub {
  id: string;
  name: string;
  companyName: string | null;
  dealValue: number | null;
  leadStatus: string;
}

interface DashboardData {
  summary: {
    totalLeads: number;
    hotLeads: number;
    winRate: number;
    pipelineValue: number;
  };
  funnel: FunnelStage[];
  dealsByStage: Record<string, DealStub[]>;
  velocity: {
    avgDaysToClose: number | null;
    winRate: number;
    wonCount: number;
    lostCount: number;
  };
}

const COLOR_PALETTE = [
  '#6b7280', '#06b6d4', '#f59e0b', '#8b5cf6',
  '#6366f1', '#f97316', '#22c55e', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#a855f7',
];

function formatValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function Skeleton({ h, w }: { h: number; w?: string }) {
  return (
    <div
      style={{
        height: h, width: w ?? '100%', borderRadius: 6,
        background: 'var(--bg-surface-2)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }}
    />
  );
}

const STATUS_DOT: Record<string, string> = {
  hot: '#ef4444', active: '#22c55e', warm: '#f59e0b',
  cold: '#64748b', not_interested: '#94a3b8',
};

export default function PipelinePage() {
  const { activeCompany } = useCompany();
  const { stages, loading: stagesLoading } = usePipelineStages();
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editStages, setEditStages] = useState<PipelineStageConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const headers: HeadersInit = {};
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    try {
      const res = await fetch(`/api/leads/dashboard?period=${period}`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch {
      // leave data as-is on network/parse error
    } finally {
      setLoading(false);
    }
  }, [period, activeCompany?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEditor = () => {
    setEditStages(stages.map(s => ({ ...s })));
    setEditing(true);
    setColorPickerIdx(null);
  };

  const closeEditor = () => { setEditing(false); setColorPickerIdx(null); };

  const moveStage = (idx: number, dir: -1 | 1) => {
    const arr = [...editStages];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    setEditStages(arr.map((s, i) => ({ ...s, order: i })));
  };

  const updateStage = (idx: number, patch: Partial<PipelineStageConfig>) => {
    setEditStages(arr => arr.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const deleteStage = (idx: number) => {
    setEditStages(arr => arr.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })));
  };

  const addStage = () => {
    const newStage: PipelineStageConfig = {
      key: `stage_${Date.now()}`,
      label: 'New Stage',
      color: '#6366f1',
      order: editStages.length,
      isWon: false,
      isLost: false,
    };
    setEditStages(arr => [...arr, newStage]);
  };

  const saveStages = async () => {
    setSaving(true);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    try {
      await fetch('/api/pipeline/stages', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ stages: editStages }),
      });
      setEditing(false);
      // Reload page to refresh usePipelineStages hook across the app
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!confirm('Reset to default stages? This cannot be undone.')) return;
    setSaving(true);
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    try {
      await fetch('/api/pipeline/stages', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ stages: DEFAULT_PIPELINE_STAGES }),
      });
      setEditing(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const funnel = data?.funnel ?? [];
  const maxCount = funnel.length > 0 ? Math.max(...funnel.map(s => s.count), 1) : 1;
  const activeStages = stages.filter(s => !s.isWon && !s.isLost);

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Pipeline</h1>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Full funnel overview and stage management
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.periodBar}>
            {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                className={`${styles.periodBtn} ${period === p ? styles.periodBtnActive : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>
          <button className="btn btn-outline btn-sm" onClick={openEditor}>
            ✎ Edit Stages
          </button>
        </div>
      </div>

      {/* Stage Editor */}
      {editing && (
        <div className={`glass-card ${styles.editorCard}`}>
          <div className={styles.editorHeader}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>Edit Pipeline Stages</span>
            <button className={styles.editorClose} onClick={closeEditor}>✕</button>
          </div>

          <div className={styles.editorList}>
            {editStages.map((s, idx) => (
              <div key={s.key} className={styles.editorRow}>
                <div
                  className={styles.stageColorDot}
                  style={{ background: s.color }}
                  onClick={() => setColorPickerIdx(colorPickerIdx === idx ? null : idx)}
                  title="Change color"
                />
                {colorPickerIdx === idx && (
                  <div className={styles.colorPicker}>
                    {COLOR_PALETTE.map(c => (
                      <button
                        key={c}
                        className={`${styles.colorSwatch} ${s.color === c ? styles.colorSwatchActive : ''}`}
                        style={{ background: c }}
                        onClick={() => { updateStage(idx, { color: c }); setColorPickerIdx(null); }}
                      />
                    ))}
                  </div>
                )}
                <input
                  className={`form-input ${styles.stageInput}`}
                  value={s.label}
                  onChange={e => updateStage(idx, { label: e.target.value })}
                  placeholder="Stage name"
                />
                <div className={styles.wonLostToggle}>
                  <button
                    className={`${styles.toggleBtn} ${s.isWon ? styles.toggleBtnWon : ''}`}
                    onClick={() => updateStage(idx, { isWon: !s.isWon, isLost: s.isWon ? s.isLost : false })}
                    title="Mark as Won"
                  >
                    Won
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${s.isLost ? styles.toggleBtnLost : ''}`}
                    onClick={() => updateStage(idx, { isLost: !s.isLost, isWon: s.isLost ? s.isWon : false })}
                    title="Mark as Lost"
                  >
                    Lost
                  </button>
                </div>
                <div className={styles.reorderBtns}>
                  <button
                    className={styles.reorderBtn}
                    onClick={() => moveStage(idx, -1)}
                    disabled={idx === 0}
                    title="Move up"
                  >↑</button>
                  <button
                    className={styles.reorderBtn}
                    onClick={() => moveStage(idx, 1)}
                    disabled={idx === editStages.length - 1}
                    title="Move down"
                  >↓</button>
                </div>
                <button
                  className={styles.deleteStageBtn}
                  onClick={() => deleteStage(idx)}
                  title="Remove stage"
                >✕</button>
              </div>
            ))}
          </div>

          <div className={styles.editorFooter}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={addStage}>+ Add Stage</button>
              <button className="btn btn-outline btn-sm" style={{ color: 'var(--text-muted)' }} onClick={resetToDefaults} disabled={saving}>
                Reset Defaults
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={closeEditor}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveStages} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: '1.25rem' }}>
              <Skeleton h={14} w="60%" />
              <div style={{ marginTop: '0.75rem' }}><Skeleton h={28} w="50%" /></div>
            </div>
          ))
        ) : data ? (
          <>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Leads</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{data.summary.totalLeads}</div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hot Leads</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#ef4444' }}>{data.summary.hotLeads}</div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win Rate</div>
              <div style={{
                fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem',
                color: data.summary.winRate >= 30 ? '#22c55e' : data.summary.winRate >= 15 ? '#f59e0b' : '#ef4444',
              }}>
                {data.summary.winRate}%
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pipeline Value</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--accent-primary)' }}>
                {formatValue(data.summary.pipelineValue)}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Pipeline Funnel */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>Pipeline Funnel</h2>
        {loading || stagesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={28} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {funnel.map((item, idx) => {
              const stageConfig = stages.find(s => s.key === item.stage);
              const color = stageConfig?.color ?? '#6366f1';
              const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.stage}>
                  <div className={styles.funnelRow}>
                    <span className={styles.funnelLabel}>{item.label}</span>
                    <div className={styles.funnelTrack}>
                      <div
                        className={styles.funnelBar}
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className={styles.funnelCount}>{item.count}</span>
                    <span className={styles.funnelValue}>
                      {item.value > 0 ? formatValue(item.value) : ''}
                    </span>
                  </div>
                  {item.conversionToNext !== null && idx < funnel.length - 1 && (
                    <div className={styles.conversionArrow}>
                      ↳ {item.conversionToNext}% → {funnel[idx + 1]?.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deals by Stage */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700 }}>Deals by Stage</h2>
        {loading || stagesLoading ? (
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ minWidth: 180, flexShrink: 0 }}>
                <Skeleton h={20} w="80%" />
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array.from({ length: 3 }).map((__, j) => <Skeleton key={j} h={52} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.stageColumns}>
            {activeStages.map(stage => {
              const deals = data?.dealsByStage?.[stage.key] ?? [];
              const funnelStage = funnel.find(f => f.stage === stage.key);
              return (
                <div key={stage.key} className={styles.stageColumn}>
                  <div className={styles.stageColumnHeader} style={{ borderColor: stage.color }}>
                    <span className={styles.stageColumnTitle} style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span className={styles.stageColumnCount}>{funnelStage?.count ?? 0}</span>
                  </div>
                  <div className={styles.dealList}>
                    {deals.length === 0 ? (
                      <div className={styles.emptyDeals}>No deals</div>
                    ) : (
                      deals.map(deal => (
                        <Link key={deal.id} href={`/customers/${deal.id}`} className={styles.dealCard}>
                          <div className={styles.dealCardTop}>
                            <span
                              className={styles.statusDot}
                              style={{ background: STATUS_DOT[deal.leadStatus] ?? '#94a3b8' }}
                            />
                            <span className={styles.dealName}>{deal.name}</span>
                          </div>
                          {deal.companyName && (
                            <div className={styles.dealCompany}>{deal.companyName}</div>
                          )}
                          {deal.dealValue != null && (
                            <div className={styles.dealValue}>{formatValue(deal.dealValue)}</div>
                          )}
                        </Link>
                      ))
                    )}
                    {(funnelStage?.count ?? 0) > deals.length && (
                      <Link
                        href={`/customers?stage=${stage.key}`}
                        className={styles.viewMoreLink}
                      >
                        +{(funnelStage?.count ?? 0) - deals.length} more
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
