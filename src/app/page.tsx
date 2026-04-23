import { auth } from '@/lib/auth';
import { fetchGoogleCalendarEvents } from '@/lib/calendar';
import { fetchUpcomingMeeting, fetchRecentCompletedMeeting, extractKeyPoints, normalizeSummary } from '@/lib/fathom';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import HomeCalendar from '@/components/HomeCalendar';
import GmailWidget from '@/components/GmailWidget';
import DashboardGreeting from '@/components/DashboardClient';
import Link from 'next/link';

export default async function Home() {
  const session = await auth();

  if (!session) {
    // Logged-out landing page
    return (
      <div className={styles.landingSection}>
        <div className={`container ${styles.landingContainer}`}>
          <div className={styles.glowOrb}></div>
          <div className={styles.landingContent}>
            <div className={styles.badge}>
              <span className={styles.pulse}></span>
              Orbit v1.0 — Now Live
            </div>
            <h1 className={styles.title}>
              Your Deal Intelligence<br />
              <span className="text-gradient">Command Centre</span>
            </h1>
            <p className={styles.subtitle}>
              Manage people, mandates, meetings, and team notes — all in one place.
            </p>

            <Link href="/login" className="btn btn-primary" style={{ marginTop: '2rem' }}>
              Sign In to Get Started
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Footer with Privacy Policy and Terms Links */}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                <Link href="/privacy" style={{ color: 'var(--accent-primary)', textDecoration: 'none', marginRight: '1.5rem' }}>
                  Privacy Policy
                </Link>
                <Link href="/terms" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                  Terms of Service
                </Link>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Contact us: <a href="mailto:singhmanik2019@gmail.com" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>singhmanik2019@gmail.com</a>
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Orbit's use of information received from Google APIs adheres to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in dashboard
  let calendarEvents: { id: string; title: string; start: string; end: string; meetLink: string | null; description: string | null; attendees?: { email: string; displayName: string | null; companyName?: string | null }[]; source: 'google_calendar' }[] = [];
  let fathomData: {
    upcoming: { title: string; url: string; startTime: string } | null;
    recent: { title: string; date: string; duration: number | null; attendees: number | null; summary: string | null; keyPoints: string[] } | null;
  } = { upcoming: null, recent: null };

  // Fetch all dashboard data in parallel
  const [events, fathomUpcoming, fathomRecent, pendingActions, allUsers, customerCount, dealRoomCount] = await Promise.all([
    session.user?.id ? fetchGoogleCalendarEvents(session.user.id, 8).catch(() => []) : Promise.resolve([]),
    fetchUpcomingMeeting().catch(() => null),
    fetchRecentCompletedMeeting().catch(() => null),
    prisma.actionItem.findMany({
      where: {
        OR: [
          { assigneeId: session.user.id },
          { userId: session.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }) as unknown as Promise<Array<{ id: string; title: string; completed: boolean; status: string; dueDate: string | null; priority: string; assigneeId: string | null; createdAt: Date; customer: { id: string; name: string } | null; user: { id: string; name: string | null } }>>,
    prisma.user.findMany({
      select: { id: true, name: true },
    }) as unknown as Promise<Array<{ id: string; name: string | null }>>,
    session.user?.id ? prisma.customer.count({ where: { userId: session.user.id } }) : Promise.resolve(0),
    prisma.group.count(),
  ]);

  // Enrich attendees with customer info
  try {
    const allEmails = new Set<string>();
    for (const ev of events) {
      for (const a of ev.attendees) {
        if (a.email) allEmails.add(a.email.toLowerCase());
      }
    }
    const customersByEmail: Record<string, { name: string; companyName: string | null }> = {};
    if (allEmails.size > 0) {
      const customers = await prisma.customer.findMany({
        where: { email: { in: Array.from(allEmails) } },
        select: { email: true, name: true, companyName: true },
      });
      for (const c of customers) {
        if (c.email) customersByEmail[c.email.toLowerCase()] = { name: c.name, companyName: c.companyName };
      }
    }
    calendarEvents = events.map(ev => ({
      ...ev,
      attendees: ev.attendees.map(a => {
        const customer = a.email ? customersByEmail[a.email.toLowerCase()] : null;
        return {
          email: a.email,
          displayName: a.displayName || (customer ? customer.name : null),
          companyName: customer?.companyName || null,
        };
      }),
    }));
  } catch {
    calendarEvents = events;
  }

  if (fathomUpcoming) {
    fathomData.upcoming = {
      title: fathomUpcoming.title || fathomUpcoming.meeting_title,
      url: fathomUpcoming.url || fathomUpcoming.share_url,
      startTime: fathomUpcoming.scheduled_start_time || fathomUpcoming.created_at,
    };
  }
  if (fathomRecent) {
    let duration: number | null = null;
    if (fathomRecent.recording_start_time && fathomRecent.recording_end_time) {
      const rawMins = Math.round(
        (new Date(fathomRecent.recording_end_time).getTime() - new Date(fathomRecent.recording_start_time).getTime()) / 60000
      );
      // Sanity check: cap at 12 hours (720 min) — anything above is likely bad data
      duration = rawMins > 0 && rawMins <= 720 ? rawMins : null;
    }
    fathomData.recent = {
      title: fathomRecent.title || fathomRecent.meeting_title,
      date: new Date(fathomRecent.created_at).toLocaleDateString(),
      duration,
      attendees: fathomRecent.calendar_invitees?.length || null,
      summary: normalizeSummary(fathomRecent.default_summary),
      keyPoints: extractKeyPoints(fathomRecent),
    };
  }

  const openTaskCount = pendingActions.filter(i => (i.status || (i.completed ? 'done' : 'todo')) !== 'done').length;

  return (
    <div className={styles.dashboardSection}>
      <div className={`container ${styles.dashboardContainer}`}>

        {/* Greeting + metric cards (client component) */}
        <DashboardGreeting
          userName={session.user?.name?.split(' ')[0] || 'there'}
          customerCount={customerCount}
          openTaskCount={openTaskCount}
          dealRoomCount={dealRoomCount}
          meetingCount={calendarEvents.length}
        />

        <div className={styles.dashboardGrid}>
          {/* Left: Upcoming Meetings */}
          <div className={styles.dashboardLeft}>
            <HomeCalendar events={calendarEvents} userName={session.user?.name || 'there'} fathom={fathomData} />
          </div>

          {/* Right: Backlog Tracker */}
          <div className={styles.dashboardRight}>
            <div className="glass-card" style={{ height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Backlog Tracker</h2>
                <Link href="/tasks" className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                  View Board
                </Link>
              </div>

              {/* Kanban Summary Bars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: 'var(--space-lg)' }}>
                {[
                  { key: 'todo', label: 'To Do', color: '#64748b' },
                  { key: 'in_progress', label: 'Active', color: '#3C95D6' },
                  { key: 'review', label: 'Review', color: '#f59e0b' },
                  { key: 'done', label: 'Done', color: '#22c55e' },
                ].map(col => {
                  const count = pendingActions.filter(i => (i.status || (i.completed ? 'done' : 'todo')) === col.key).length;
                  return (
                    <div key={col.key} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: col.color }}>{count}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Urgency-sorted backlog items */}
              {(() => {
                const userMap: Record<string, string> = {};
                for (const u of allUsers) {
                  if (u.name) userMap[u.id] = u.name;
                }

                const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                const active = pendingActions
                  .filter(i => (i.status || (i.completed ? 'done' : 'todo')) !== 'done')
                  .sort((a, b) => {
                    // Items with due dates first, sorted earliest first
                    if (a.dueDate && !b.dueDate) return -1;
                    if (!a.dueDate && b.dueDate) return 1;
                    if (a.dueDate && b.dueDate) {
                      const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                      if (diff !== 0) return diff;
                    }
                    // Then by priority
                    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
                  })
                  .slice(0, 10);

                const priorityColors: Record<string, string> = { urgent: '#ef4444', high: '#f59e0b', medium: '#3C95D6', low: '#64748b' };

                if (active.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-secondary)' }}>
                      <p style={{ fontSize: '0.9rem' }}>All caught up!</p>
                    </div>
                  );
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {active.map((item) => {
                      const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
                      const assigneeName = item.assigneeId ? userMap[item.assigneeId]?.split(' ')[0] : null;
                      const ownerName = assigneeName || item.user.name?.split(' ')[0] || 'Unknown';
                      return (
                        <div key={item.id} className={`${styles.actionItem}${isOverdue ? ' backlog-overdue' : ''}`}>
                          <div className={styles.actionItemDot} style={{
                            backgroundColor: priorityColors[item.priority] || priorityColors.medium,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p className={styles.actionItemTitle}>{item.title}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.125rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{ownerName}</span>
                              {item.dueDate && (
                                <span className={`backlog-due-tag${isOverdue ? ' backlog-due-overdue' : ''}`}>
                                  {(() => {
                                    const d = new Date(item.dueDate);
                                    const now = new Date();
                                    const tomorrow = new Date(now);
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    if (d.toDateString() === now.toDateString()) return 'Due Today';
                                    if (d.toDateString() === tomorrow.toDateString()) return 'Due Tomorrow';
                                    if (isOverdue) return `Overdue ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                    return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                                  })()}
                                </span>
                              )}
                              {item.customer && (
                                <Link href={`/customers/${item.customer.id}`} className={styles.actionItemCustomer}>
                                  {item.customer.name}
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Gmail: Customer Emails */}
        <GmailWidget />
      </div>
    </div>
  );
}
