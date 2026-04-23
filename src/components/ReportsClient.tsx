'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import styles from '@/app/reports/reports.module.css';

interface AnalyticsData {
  peopleGrowth: { month: string; count: number }[];
  leadBreakdown: { status: string; count: number }[];
  pipelineBreakdown: { stage: string; count: number }[];
  comparison: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
    thisYear: number;
    lastYear: number;
  };
  thisYearMonthly: { month: string; count: number }[];
  lastYearMonthly: { month: string; count: number }[];
  currentYear: number;
  lastYear: number;
}

const LEAD_COLORS: Record<string, string> = {
  hot:  '#ef4444',
  warm: '#f59e0b',
  cold: '#64748b',
};

const PIPELINE_COLORS: Record<string, string> = {
  new:       '#94a3b8',
  contacted: '#3b82f6',
  qualified: '#f59e0b',
  proposal:  '#8b5cf6',
  won:       '#22c55e',
  lost:      '#ef4444',
};

const CHART_PRIMARY = '#6366f1';
const CHART_SECONDARY = '#8b5cf6';

const LEAD_LABELS: Record<string, string> = {
  hot:  'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

const PIPELINE_LABELS: Record<string, string> = {
  new:       'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal:  'Proposal',
  won:       'Won',
  lost:      'Lost',
};

function ChangeIndicator({ value }: { value: number }) {
  if (value > 0) return <span className={`${styles.statChange} ${styles.statChangeUp}`}>↑ {value}%</span>;
  if (value < 0) return <span className={`${styles.statChange} ${styles.statChangeDown}`}>↓ {Math.abs(value)}%</span>;
  return <span className={`${styles.statChange} ${styles.statChangeFlat}`}>— no change</span>;
}

const yoeComparison = (data: AnalyticsData) =>
  data.thisYearMonthly.map((d, i) => ({
    month: d.month,
    [data.currentYear]: d.count,
    [data.lastYear]: data.lastYearMonthly[i]?.count || 0,
  }));

export default function ReportsClient({ data }: { data: AnalyticsData }) {
  const { comparison, peopleGrowth, leadBreakdown, pipelineBreakdown, currentYear, lastYear: lastYearNum } = data;
  const yoyData = yoeComparison(data);

  const yearPercentChange = data.comparison.lastYear === 0
    ? (data.comparison.thisYear > 0 ? 100 : 0)
    : Math.round(((data.comparison.thisYear - data.comparison.lastYear) / data.comparison.lastYear) * 100);

  return (
    <div className={styles.page}>
      {/* Stat cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>This Month</span>
          <span className={styles.statValue}>{comparison.thisMonth}</span>
          <ChangeIndicator value={comparison.percentChange} />
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Last Month</span>
          <span className={styles.statValue}>{comparison.lastMonth}</span>
          <span className={styles.statChange} style={{ color: 'var(--text-muted)' }}>previous period</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>This Year</span>
          <span className={styles.statValue}>{comparison.thisYear}</span>
          <ChangeIndicator value={yearPercentChange} />
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Last Year</span>
          <span className={styles.statValue}>{comparison.lastYear}</span>
          <span className={styles.statChange} style={{ color: 'var(--text-muted)' }}>previous year</span>
        </div>
      </div>

      {/* Charts grid */}
      <div className={styles.chartsGrid}>

        {/* People Growth */}
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>People Growth</p>
            <p className={styles.chartSubtitle}>New contacts added per month (last 12 months)</p>
          </div>
          {peopleGrowth.every(d => d.count === 0) ? (
            <div className={styles.emptyChart}>No data yet</div>
          ) : (
            <div className={styles.chartArea}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={peopleGrowth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--accent-subtle)' }}
                  />
                  <Bar dataKey="count" name="New contacts" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Lead Breakdown Donut */}
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Lead Breakdown</p>
            <p className={styles.chartSubtitle}>Hot / Warm / Cold distribution</p>
          </div>
          {leadBreakdown.length === 0 ? (
            <div className={styles.emptyChart}>No data yet</div>
          ) : (
            <>
              <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={leadBreakdown}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {leadBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={LEAD_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(value, name) => [value, LEAD_LABELS[String(name)] || String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.legendRow}>
                {leadBreakdown.map(d => (
                  <div key={d.status} className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: LEAD_COLORS[d.status] || '#94a3b8' }} />
                    {LEAD_LABELS[d.status] || d.status} ({d.count})
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pipeline Breakdown */}
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Pipeline Overview</p>
            <p className={styles.chartSubtitle}>Contacts by pipeline stage</p>
          </div>
          {pipelineBreakdown.length === 0 ? (
            <div className={styles.emptyChart}>No data yet</div>
          ) : (
            <div className={styles.chartArea}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pipelineBreakdown} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="stage"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => PIPELINE_LABELS[v] || v}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    cursor={{ fill: 'var(--accent-subtle)' }}
                    formatter={(value, _name, props) => [value, PIPELINE_LABELS[(props as {payload?: {stage?: string}}).payload?.stage || ''] || (props as {payload?: {stage?: string}}).payload?.stage || '']}
                  />
                  <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                    {pipelineBreakdown.map(entry => (
                      <Cell key={entry.stage} fill={PIPELINE_COLORS[entry.stage] || CHART_PRIMARY} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Month vs Last Month */}
        <div className={styles.chartCard}>
          <div>
            <p className={styles.chartTitle}>Month vs Last Month</p>
            <p className={styles.chartSubtitle}>New contacts comparison</p>
          </div>
          <div className={styles.chartArea}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { name: 'Last Month', count: comparison.lastMonth },
                  { name: 'This Month', count: comparison.thisMonth },
                ]}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ fill: 'var(--accent-subtle)' }}
                />
                <Bar dataKey="count" name="Contacts" radius={[4, 4, 0, 0]}>
                  <Cell fill="var(--text-muted)" />
                  <Cell fill={CHART_PRIMARY} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.legendRow}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--text-muted)' }} /> Last Month: {comparison.lastMonth}
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: CHART_PRIMARY }} /> This Month: {comparison.thisMonth}
            </div>
            <ChangeIndicator value={comparison.percentChange} />
          </div>
        </div>

        {/* Year vs Last Year */}
        <div className={`${styles.chartCard} ${styles.chartCardWide}`}>
          <div>
            <p className={styles.chartTitle}>Year over Year</p>
            <p className={styles.chartSubtitle}>{currentYear} vs {lastYearNum} — monthly new contacts</p>
          </div>
          {yoyData.every(d => (d[currentYear] as number) === 0 && (d[lastYearNum] as number) === 0) ? (
            <div className={styles.emptyChart}>No data yet</div>
          ) : (
            <>
              <div className={styles.chartArea}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={yoyData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey={currentYear} stroke={CHART_PRIMARY} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey={lastYearNum} stroke={CHART_SECONDARY} strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.legendRow}>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: CHART_PRIMARY }} /> {currentYear}
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: CHART_SECONDARY }} /> {lastYearNum}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
