'use client';

import { useCountUp } from '@/hooks/useCountUp';
import styles from '@/app/page.module.css';
import Link from 'next/link';

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accentColor: string;
  href: string;
  delay?: number;
}

function MetricCard({ label, value, icon, accentColor, href, delay = 0 }: MetricCardProps) {
  const count = useCountUp(value, 1200);
  return (
    <Link
      href={href}
      className={styles.metricCard}
      style={{ animationDelay: `${delay}ms`, borderTopColor: accentColor }}
    >
      <div className={styles.metricIcon} style={{ color: accentColor }}>{icon}</div>
      <div className={styles.metricValue}>{count}</div>
      <div className={styles.metricLabel}>{label}</div>
    </Link>
  );
}

interface DashboardGreetingProps {
  userName: string;
  customerCount: number;
  openTaskCount: number;
  dealRoomCount: number;
  meetingCount: number;
}

export default function DashboardGreeting({
  userName,
  customerCount,
  openTaskCount,
  dealRoomCount,
  meetingCount,
}: DashboardGreetingProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const PeopleIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
      <path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.87"/>
    </svg>
  );

  const TasksIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><path d="M3 17l2 2 4-4"/>
    </svg>
  );

  const MeetingsIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  const DealRoomIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );

  return (
    <>
      {/* Greeting */}
      <div className={styles.greetingRow}>
        <div className={styles.greetingText}>
          <h1 className={styles.greetingTitle}>
            {greeting}, <span className={styles.greetingName}>{userName}</span>
          </h1>
          <p className={styles.greetingDate}>{today}</p>
        </div>
        <Link href="/customers/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Person
        </Link>
      </div>

      {/* Metric Cards */}
      <div className={styles.metricsRow}>
        <MetricCard label="People"     value={customerCount}  icon={<PeopleIcon />}   accentColor="#3b82f6" href="/customers" delay={0}   />
        <MetricCard label="Meetings"   value={meetingCount}   icon={<MeetingsIcon />} accentColor="#8b5cf6" href="/meetings"  delay={75}  />
        <MetricCard label="Open Tasks" value={openTaskCount}  icon={<TasksIcon />}    accentColor="#f59e0b" href="/tasks"     delay={150} />
        <MetricCard label="Deal Rooms" value={dealRoomCount}  icon={<DealRoomIcon />} accentColor="#22c55e" href="/team"      delay={225} />
      </div>
    </>
  );
}
