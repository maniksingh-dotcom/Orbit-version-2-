'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '@/app/success/success.module.css';

interface SuccessCustomer {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  healthScore: number | null;
  customerStage: string;
  onboardingStatus: string;
  renewalDate: string | null;
  riskLevel: string;
  dealValue: number | null;
  qbrDate: string | null;
  pipelineStage: string;
  updatedAt: string;
}

interface Props {
  customers: SuccessCustomer[];
}

function getRiskColor(risk: string): string {
  if (risk === 'critical' || risk === 'high') return '#ef4444';
  if (risk === 'medium') return '#f59e0b';
  return '#22c55e';
}

function getHealthColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getRiskBadgeClass(risk: string, styles: Record<string, string>): string {
  if (risk === 'critical' || risk === 'high') return styles.badgeRed;
  if (risk === 'medium') return styles.badgeAmber;
  return styles.badgeGreen;
}

function getOnboardingBadgeClass(status: string, styles: Record<string, string>): string {
  if (status === 'completed') return styles.badgeGreen;
  if (status === 'in_progress') return styles.badgeAmber;
  return styles.badgeDefault;
}

function formatOnboardingStatus(status: string): string {
  const map: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'Onboarding',
    completed: 'Onboarded',
  };
  return map[status] ?? status;
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDealValue(value: number | null): string {
  if (value == null) return '';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value}`;
}

function getRenewalsThisMonth(customers: SuccessCustomer[]): number {
  const now = new Date();
  return customers.filter(c => {
    if (!c.renewalDate) return false;
    const d = new Date(c.renewalDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

function getAtRiskCount(customers: SuccessCustomer[]): number {
  return customers.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length;
}

function getAvgHealth(customers: SuccessCustomer[]): string {
  const scored = customers.filter(c => c.healthScore != null);
  if (scored.length === 0) return '—';
  const avg = scored.reduce((sum, c) => sum + (c.healthScore ?? 0), 0) / scored.length;
  return avg.toFixed(0);
}

export default function SuccessClient({ customers: initialCustomers }: Props) {
  const router = useRouter();
  const [customers, setCustomers] = useState<SuccessCustomer[]>(initialCustomers);
  const [editingScore, setEditingScore] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<string>('');

  const handleScoreClick = (e: React.MouseEvent, customer: SuccessCustomer) => {
    e.stopPropagation();
    setEditingScore(customer.id);
    setScoreInput(customer.healthScore != null ? String(customer.healthScore) : '');
  };

  const handleScoreSave = async (e: React.FormEvent, customerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const val = parseInt(scoreInput, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      setEditingScore(null);
      return;
    }
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthScore: val }),
      });
      if (res.ok) {
        setCustomers(prev =>
          prev.map(c => c.id === customerId ? { ...c, healthScore: val } : c)
        );
      }
    } catch {
      // silently fail
    }
    setEditingScore(null);
  };

  const totalCustomers = customers.length;
  const avgHealth = getAvgHealth(customers);
  const renewalsThisMonth = getRenewalsThisMonth(customers);
  const atRiskCount = getAtRiskCount(customers);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Customer Success</h1>
          <p className={styles.subtitle}>Track health, onboarding, and renewals for active customers</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Customers</span>
          <span className={styles.statValue}>{totalCustomers}</span>
          <span className={styles.statSub}>Active accounts</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg Health Score</span>
          <span className={styles.statValue} style={{ color: typeof avgHealth === 'string' && avgHealth !== '—' ? getHealthColor(parseInt(avgHealth)) : 'var(--text-primary)' }}>
            {avgHealth}
          </span>
          <span className={styles.statSub}>Out of 100</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Renewals This Month</span>
          <span className={styles.statValue} style={{ color: renewalsThisMonth > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {renewalsThisMonth}
          </span>
          <span className={styles.statSub}>Upcoming renewals</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>At Risk</span>
          <span className={styles.statValue} style={{ color: atRiskCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {atRiskCount}
          </span>
          <span className={styles.statSub}>High / critical risk</span>
        </div>
      </div>

      {/* Cards Grid */}
      {customers.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No active customers yet</p>
          <p className={styles.emptyText}>
            When you close a deal (mark as WON), they will appear here so you can track their health, onboarding, and renewals.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {customers.map(customer => {
            const riskColor = getRiskColor(customer.riskLevel);
            const healthColor = customer.healthScore != null ? getHealthColor(customer.healthScore) : 'var(--text-muted)';
            const isEditing = editingScore === customer.id;

            return (
              <div
                key={customer.id}
                className={styles.card}
                onClick={() => router.push(`/customers/${customer.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/customers/${customer.id}`); }}
              >
                {/* Colored risk bar on left */}
                <div className={styles.cardRiskBar} style={{ background: riskColor }} />

                <div className={styles.cardBody}>
                  {/* Top: logo + name */}
                  <div className={styles.cardTop}>
                    {customer.logoUrl ? (
                      <img
                        src={`/api/files/${customer.logoUrl}`}
                        alt=""
                        className={styles.cardLogo}
                      />
                    ) : (
                      <div className={styles.cardLogoPlaceholder}>
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p className={styles.cardName}>{customer.name}</p>
                      {customer.companyName && (
                        <p className={styles.cardCompany}>{customer.companyName}</p>
                      )}
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className={styles.healthSection}>
                    <div className={styles.healthHeader}>
                      <span className={styles.healthLabel}>Health Score</span>
                      {customer.healthScore != null ? (
                        <span className={styles.healthScore} style={{ color: healthColor }}>
                          {customer.healthScore}/100
                        </span>
                      ) : (
                        <span className={styles.healthScore} style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                    <div className={styles.healthBar}>
                      <div
                        className={styles.healthBarFill}
                        style={{
                          width: `${customer.healthScore ?? 0}%`,
                          background: healthColor,
                        }}
                      />
                    </div>
                    {isEditing ? (
                      <form
                        className={styles.healthInput}
                        onSubmit={(e) => handleScoreSave(e, customer.id)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={scoreInput}
                          onChange={(e) => setScoreInput(e.target.value)}
                          className={styles.healthInputField}
                          autoFocus
                          onBlur={(e) => handleScoreSave(e as unknown as React.FormEvent, customer.id)}
                        />
                        <span>/ 100</span>
                      </form>
                    ) : (
                      <button
                        className={styles.healthInput}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                        onClick={(e) => handleScoreClick(e, customer)}
                      >
                        {customer.healthScore == null ? 'Click to set health score' : 'Update score'}
                      </button>
                    )}
                  </div>

                  {/* Badges row */}
                  <div className={styles.cardMeta}>
                    <span className={`${styles.badge} ${getOnboardingBadgeClass(customer.onboardingStatus, styles)}`}>
                      {formatOnboardingStatus(customer.onboardingStatus)}
                    </span>
                    <span className={`${styles.badge} ${getRiskBadgeClass(customer.riskLevel, styles)}`}>
                      {customer.riskLevel.charAt(0).toUpperCase() + customer.riskLevel.slice(1)} Risk
                    </span>
                    {customer.dealValue != null && (
                      <span className={`${styles.badge} ${styles.badgeDefault}`}>
                        {formatDealValue(customer.dealValue)}
                      </span>
                    )}
                    {customer.renewalDate && (
                      <span className={`${styles.badge} ${styles.badgeAmber}`}>
                        Renewal {formatDate(customer.renewalDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
