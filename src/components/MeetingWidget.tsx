'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import AiAssistButton from './AiAssistButton';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
  description: string | null;
  attendees?: { email: string; displayName: string | null }[];
  source: 'google_calendar';
}

interface MeetingData {
  upcoming: {
    id: string;
    title: string;
    scheduled_start_time: string;
    url: string;
    source: string;
  } | null;
  previous: {
    title: string;
    date: string;
    summary: string | null;
    keyPoints: string[];
    duration: number | null;
    attendees: number | null;
  } | null;
  calendarEvents: CalendarEvent[];
}

interface Props {
  customerId: string;
  customerEmail?: string | null;
}

function formatCountdown(targetDate: string): string {
  const now = Date.now();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return 'Starting now';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `IN ${days}D ${hours}H`;
  if (hours > 0) return `IN ${hours}H ${minutes}M`;
  return `IN ${minutes} MIN`;
}

function formatEventTime(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const startTime = s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dateStr}, ${startTime} - ${endTime}`;
}

export default function MeetingWidget({ customerId, customerEmail }: Props) {
  const [data, setData] = useState<MeetingData | null>(null);
  const [countdown, setCountdown] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({ customerId });
        if (customerEmail) params.set('customerEmail', customerEmail);
        const res = await fetch(`/api/fathom/upcoming?${params.toString()}`);
        if (res.ok) {
          const meetingData = await res.json();
          setData(meetingData);
          if (meetingData.upcoming?.scheduled_start_time) {
            setCountdown(formatCountdown(meetingData.upcoming.scheduled_start_time));
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, customerEmail]);

  // Update countdown every minute
  useEffect(() => {
    if (!data?.upcoming?.scheduled_start_time) return;

    const interval = setInterval(() => {
      setCountdown(formatCountdown(data.upcoming!.scheduled_start_time));
    }, 60000);

    return () => clearInterval(interval);
  }, [data]);

  if (loading) {
    return (
      <div className="meeting-widget" style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading meeting info...</p>
      </div>
    );
  }

  const hasCalendarEvents = data?.calendarEvents && data.calendarEvents.length > 0;

  if (!data?.upcoming && !data?.previous && !hasCalendarEvents) {
    return (
      <div className="meeting-widget" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No upcoming meetings scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="meeting-widget">
      {/* Header */}
      <div className="meeting-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            {data?.upcoming ? `Next Up: ${data.upcoming.title}` : 'Meetings & Calendar'}
          </h3>
          {data?.upcoming?.source && (
            <span className={`badge ${data.upcoming.source === 'fathom' ? 'badge-fathom' : 'badge-calendar'}`}>
              {data.upcoming.source === 'fathom' ? 'Fathom' : 'Calendar'}
            </span>
          )}
        </div>
        {data?.upcoming && (
          <span className="meeting-countdown">{countdown}</span>
        )}
      </div>

      {/* Body: Previous Call + Key Points */}
      {data?.previous && (
        <div className="meeting-body">
          {/* Meeting Stats */}
          {(data.previous.duration || data.previous.attendees) && (
            <div className="meeting-stats">
              {data.previous.duration && (
                <div className="meeting-stat">
                  <span className="meeting-stat-icon">⏱️</span>
                  <div>
                    <span className="meeting-stat-value">{data.previous.duration! >= 60 ? `${Math.floor(data.previous.duration! / 60)}h ${data.previous.duration! % 60}min` : `${data.previous.duration} min`}</span>
                    <span className="meeting-stat-label">Duration</span>
                  </div>
                </div>
              )}
              {data.previous.attendees && (
                <div className="meeting-stat">
                  <span className="meeting-stat-icon">👥</span>
                  <div>
                    <span className="meeting-stat-value">{data.previous.attendees}</span>
                    <span className="meeting-stat-label">Attendees</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="meeting-section">
            <h4>Previous Call Summary ({data.previous.date})</h4>
            <div className="markdown-body">
              {data.previous.summary ? (
                <ReactMarkdown>{data.previous.summary}</ReactMarkdown>
              ) : (
                'No summary available for the previous call.'
              )}
            </div>
          </div>

          <div className="meeting-section">
            <h4>Key Takeaways</h4>
            {data.previous.keyPoints.length > 0 ? (
              <ul>
                {data.previous.keyPoints.map((point, i) => {
                  // Remove markdown headings from key points
                  const cleanPoint = point.replace(/^#+\s*/, '').trim();
                  return cleanPoint ? <li key={i}>{cleanPoint}</li> : null;
                })}
              </ul>
            ) : (
              <p>No key points recorded.</p>
            )}
            {(data.previous.summary || data.previous.keyPoints.length > 0) && (
              <div style={{ marginTop: '0.5rem' }}>
                <AiAssistButton
                  text={`Summary: ${data.previous.summary || ''}\n\nKey Points:\n${data.previous.keyPoints.join('\n')}`}
                  onResult={() => { }}
                  actions={["insights", "suggest_actions"]}
                  size="md"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Button */}
      {data?.upcoming?.url && (
        <a
          href={data.upcoming.url}
          target="_blank"
          rel="noopener noreferrer"
          className="meeting-join-btn"
        >
          🎥 Join Meeting & Auto-Record
        </a>
      )}

      {/* Google Calendar Events */}
      {hasCalendarEvents && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h4 style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-sm)',
          }}>
            Upcoming Calendar Events
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {data!.calendarEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{event.title}</span>
                    <span className="badge badge-calendar">Calendar</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {formatEventTime(event.start, event.end)}
                  </span>
                </div>
                {event.meetLink && (
                  <a
                    href={event.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ marginLeft: 'var(--space-md)', whiteSpace: 'nowrap' }}
                  >
                    Join
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
