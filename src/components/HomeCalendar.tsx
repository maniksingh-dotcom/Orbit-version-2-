'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/contexts/ToastContext';
import ScheduleMeetingModal from './ScheduleMeetingModal';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
  description: string | null;
  attendees?: { email: string; displayName: string | null; companyName?: string | null }[];
  source: 'google_calendar';
}

interface FathomData {
  upcoming: { title: string; url: string; startTime: string } | null;
  recent: {
    title: string;
    date: string;
    duration: number | null;
    attendees: number | null;
    summary: string | null;
    keyPoints: string[];
  } | null;
}

interface Props {
  events: CalendarEvent[];
  userName: string;
  fathom?: FathomData;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.3;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    // 2 short beeps: beep 1 (0-0.4s), silence (0.4-0.7s), beep 2 (0.7-1.1s)
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.setValueAtTime(0, t + 0.4);
    gain.gain.setValueAtTime(0.3, t + 0.7);
    gain.gain.setValueAtTime(0, t + 1.1);
    oscillator.stop(t + 1.2);
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // Audio not supported
  }
}

const REMINDED_STORAGE_KEY = 'orbit_meeting_reminders';

function getRemindedEvents(): Set<string> {
  try {
    const stored = localStorage.getItem(REMINDED_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as { id: string; expiry: number }[];
    const now = Date.now();
    // Only keep entries that haven't expired (expire after 1 hour)
    const valid = parsed.filter(e => e.expiry > now);
    return new Set(valid.map(e => e.id));
  } catch {
    return new Set();
  }
}

function markEventReminded(eventId: string) {
  try {
    const stored = localStorage.getItem(REMINDED_STORAGE_KEY);
    const parsed: { id: string; expiry: number }[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    // Clean expired + add new
    const updated = parsed.filter(e => e.expiry > now);
    updated.push({ id: eventId, expiry: now + 60 * 60 * 1000 }); // expire in 1h
    localStorage.setItem(REMINDED_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

function formatEventTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const startTime = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const endTime = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${startTime} - ${endTime}`;
}

function formatEventDate(start: string): string {
  const s = new Date(start);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (s.toDateString() === now.toDateString()) {
    const label = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `Today · ${label}`;
  }
  if (s.toDateString() === tomorrow.toDateString()) {
    const label = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `Tomorrow · ${label}`;
  }
  return s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getTimeUntil(start: string): string {
  const diff = new Date(start).getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h ${mins % 60}m`;
  // Use calendar-day difference so "Mon Apr 6" shows "in 2d" when today is Sat Apr 4
  const eventDay = new Date(start);
  eventDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const calDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
  return `in ${calDays}d`;
}

export default function HomeCalendar({ events, userName, fathom }: Props) {
  const { showToast } = useToast();
  const remindedRef = useRef<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Load already-reminded events from localStorage on mount
  useEffect(() => {
    const stored = getRemindedEvents();
    stored.forEach(id => remindedRef.current.add(id));
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendReminder = useCallback((eventId: string, title: string, mins: number) => {
    const message = `"${title}" starts in ${mins} minute${mins !== 1 ? 's' : ''}!`;

    // Show toast as fallback
    showToast(message, 'info');

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Meeting Reminder', {
        body: message,
        icon: '/favicon.ico',
        tag: `meeting-${eventId}`,
      });
    }

    // Play 2 short beeps
    playBeep();
  }, [showToast]);

  // Meeting reminder: check every 30s if any event starts within 5 minutes
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      for (const event of events) {
        const startTime = new Date(event.start).getTime();
        const diff = startTime - now;
        // Remind if within 5 minutes, not already reminded, and not in the past
        if (diff > 0 && diff <= 5 * 60 * 1000 && !remindedRef.current.has(event.id)) {
          remindedRef.current.add(event.id);
          markEventReminded(event.id);
          const mins = Math.ceil(diff / 60000);
          sendReminder(event.id, event.title, mins);
        }
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [events, sendReminder]);

  // Update countdown display every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Group events by date
  const grouped: Record<string, CalendarEvent[]> = {};
  for (const event of events) {
    const dateKey = formatEventDate(event.start);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }

  return (
    <div className="home-calendar">
      <div className="home-calendar-header">
        <div>
          <h2 className="home-calendar-title">
            Welcome back, {userName.split(' ')[0]}
          </h2>
          <p className="home-calendar-subtitle">
            {events.length > 0
              ? `You have ${events.length} upcoming meeting${events.length !== 1 ? 's' : ''} this week`
              : 'No upcoming meetings this week'}
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowScheduleModal(true)}
          style={{ whiteSpace: 'nowrap' }}
        >
          + Schedule Meeting
        </button>
      </div>

      {showScheduleModal && (
        <ScheduleMeetingModal
          onClose={() => setShowScheduleModal(false)}
          onCreated={() => window.location.reload()}
        />
      )}

      {/* Fathom Join & Record Section */}
      {fathom?.upcoming && (
        <div className="fathom-record-card">
          <div className="fathom-record-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.1rem' }}>🎙️</span>
              <span className="fathom-record-title">Fathom Recording</span>
              <span className="badge badge-fathom">Auto-Record</span>
            </div>
            <span className="fathom-record-time">{getTimeUntil(fathom.upcoming.startTime)}</span>
          </div>
          <p className="fathom-record-meeting">{fathom.upcoming.title}</p>
          <a
            href={fathom.upcoming.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            🎥 Join &amp; Record with Fathom
          </a>
        </div>
      )}

      {/* Last Meeting Summary from Fathom */}
      {fathom?.recent && (
        <div className="fathom-summary-card">
          <div className="fathom-summary-header">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Last Meeting
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{fathom.recent.date}</span>
          </div>
          <p className="fathom-summary-title">{fathom.recent.title}</p>
          {(fathom.recent.duration || fathom.recent.attendees) && (
            <div className="fathom-summary-stats">
              {fathom.recent.duration && (
                <span className="fathom-summary-stat">⏱️ {fathom.recent.duration >= 60 ? `${Math.floor(fathom.recent.duration / 60)}h ${fathom.recent.duration % 60}min` : `${fathom.recent.duration} min`}</span>
              )}
              {fathom.recent.attendees && (
                <span className="fathom-summary-stat">👥 {fathom.recent.attendees} attendees</span>
              )}
            </div>
          )}
          {fathom.recent.summary && (
            <p className="fathom-summary-text">
              {fathom.recent.summary.length > 150 ? fathom.recent.summary.slice(0, 150) + '...' : fathom.recent.summary}
            </p>
          )}
          {fathom.recent.keyPoints.length > 0 && (
            <div className="fathom-summary-points">
              {fathom.recent.keyPoints.slice(0, 3).map((point, i) => (
                <div key={i} className="fathom-summary-point">
                  <span className="fathom-point-dot" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {events.length === 0 && !fathom?.upcoming ? (
        <div className="home-calendar-empty">
          <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</span>
          <p>Your calendar is clear — time to focus!</p>
        </div>
      ) : (
        <div className="home-calendar-list">
          {Object.entries(grouped).map(([dateLabel, dateEvents]) => (
            <div key={dateLabel}>
              <div className="home-calendar-date-label">{dateLabel}</div>
              {dateEvents.map((event) => {
                const isNow = new Date(event.start).getTime() <= Date.now() && new Date(event.end).getTime() > Date.now();
                return (
                  <div
                    key={event.id}
                    className={`home-calendar-event ${isNow ? 'home-calendar-event-live' : ''}`}
                  >
                    <div className="home-calendar-event-time">
                      <span className="home-calendar-event-clock">
                        {formatEventTime(event.start, event.end)}
                      </span>
                      <span className={`home-calendar-event-until ${isNow ? 'home-calendar-live-badge' : ''}`}>
                        {isNow ? 'LIVE' : getTimeUntil(event.start)}
                      </span>
                    </div>
                    <div className="home-calendar-event-info">
                      <span className="home-calendar-event-title">{event.title}</span>
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="home-calendar-event-attendees">
                          {event.attendees.slice(0, 3).map((a, i) => (
                            <div key={i} className="home-calendar-attendee">
                              <span className="home-calendar-attendee-name">
                                {a.displayName || a.email.split('@')[0]}
                              </span>
                              <span className="home-calendar-attendee-email">{a.email}</span>
                              {a.companyName && (
                                <span className="home-calendar-attendee-company">{a.companyName}</span>
                              )}
                            </div>
                          ))}
                          {event.attendees.length > 3 && (
                            <span className="home-calendar-attendee-more">
                              +{event.attendees.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                      {event.description && (
                        <span className="home-calendar-event-desc">
                          {event.description.length > 80 ? event.description.slice(0, 80) + '...' : event.description}
                        </span>
                      )}
                    </div>
                    {event.meetLink && (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn ${isNow ? 'btn-primary' : 'btn-outline'} btn-sm home-calendar-join`}
                      >
                        {isNow ? '🎥 Record & Join' : 'Record & Join'}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
