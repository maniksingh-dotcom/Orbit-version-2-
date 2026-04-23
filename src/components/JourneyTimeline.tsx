'use client';

import { useState, useEffect } from 'react';

const PIPELINE_STAGES = [
  { key: 'new',         label: 'New',         color: '#64748b' },
  { key: 'ongoing',     label: 'Ongoing',     color: '#06b6d4' },
  { key: 'qualified',   label: 'Qualified',   color: '#f59e0b' },
  { key: 'demo',        label: 'Demo',        color: '#8b5cf6' },
  { key: 'proposal',    label: 'Proposal',    color: '#6366f1' },
  { key: 'negotiation', label: 'Negotiation', color: '#f97316' },
  { key: 'won',         label: 'Won',         color: '#22c55e' },
  { key: 'lost',        label: 'Lost',        color: '#ef4444' },
];

const ACTIVITY_ICONS: Record<string, string> = {
  stage_change: '→',
  note: '📝',
  call: '📞',
  email: '✉',
  task: '✓',
  document: '📄',
  followup: '🔔',
};

const ACTIVITY_COLORS: Record<string, string> = {
  stage_change: 'var(--accent-primary)',
  note: '#f59e0b',
  call: '#22c55e',
  email: '#6366f1',
  task: '#8b5cf6',
  document: '#64748b',
  followup: '#f97316',
};

interface ActivityItem {
  id: string;
  type: string;
  feedType?: string;
  title: string;
  description?: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; image: string | null } | null;
}

interface JourneyTimelineProps {
  customerId: string;
  currentStage: string;
}

export default function JourneyTimeline({ customerId, currentStage }: JourneyTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${customerId}/activity`)
      .then(r => r.json())
      .then(data => { setActivities(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [customerId]);

  const nonLostStages = PIPELINE_STAGES.filter(s => s.key !== 'lost');
  const currentIdx = nonLostStages.findIndex(s => s.key === currentStage);
  const isLost = currentStage === 'lost';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Stage Progress Bar */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Lifecycle Stage</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {nonLostStages.map((stage, idx) => {
            const isPast = idx < currentIdx && !isLost;
            const isCurrent = stage.key === currentStage;
            return (
              <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: idx < nonLostStages.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', minWidth: 64 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isCurrent ? stage.color : isPast ? stage.color : 'var(--bg-surface-2)',
                    border: `2px solid ${isCurrent ? stage.color : isPast ? stage.color : 'var(--border-color)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: isCurrent ? `0 0 10px ${stage.color}60` : 'none',
                  }}>
                    {isPast && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {isCurrent && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? stage.color : isPast ? 'var(--text-secondary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {stage.label}
                  </span>
                </div>
                {idx < nonLostStages.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isPast ? 'var(--accent-primary)' : 'var(--border-color)', margin: '0 0 1.2rem', transition: 'background 0.2s', minWidth: 24 }} />
                )}
              </div>
            );
          })}
          {isLost && (
            <div style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem', borderRadius: 999, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(239,68,68,0.3)' }}>
              Lost
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Activity Timeline</p>

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>Loading activity…</div>
        ) : activities.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem 0', textAlign: 'center' }}>
            No activity yet. Activities are logged as you update pipeline stages, add notes, complete calls, and more.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activities.map((item, i) => {
              const color = ACTIVITY_COLORS[item.type] || 'var(--text-muted)';
              const icon = ACTIVITY_ICONS[item.type] || '•';
              const isLast = i === activities.length - 1;
              return (
                <div key={item.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `${color}18`,
                      border: `1.5px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', color, flexShrink: 0,
                    }}>
                      {icon}
                    </div>
                    {!isLast && <div style={{ width: 1.5, flex: 1, background: 'var(--border-color)', minHeight: 24, margin: '2px 0' }} />}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : '1.25rem', paddingTop: '0.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: item.description ? '0.25rem' : 0 }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.title}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {item.user?.name && ` · ${item.user.name.split(' ')[0]}`}
                      </span>
                    </div>
                    {item.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{item.description}</p>
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
