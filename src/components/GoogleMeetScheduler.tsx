'use client';

import { useState, useEffect } from 'react';

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  memberEmails: string[];
}

interface GoogleMeetSchedulerProps {
  onSchedule?: () => void;
}

export default function GoogleMeetScheduler({ onSchedule }: GoogleMeetSchedulerProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [attendees, setAttendees] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups/lookup');
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendeeChange = (value: string) => {
    setAttendees(value);

    // Show group suggestions when typing
    const lastWord = value.split(/[,\s]+/).pop()?.toLowerCase() || '';
    if (lastWord.length > 0) {
      const hasMatch = groups.some(g => g.name.toLowerCase().includes(lastWord));
      setShowGroupSuggestions(hasMatch);
    } else {
      setShowGroupSuggestions(false);
    }
  };

  const addGroupMembers = (group: Group) => {
    // Replace the group name with all member emails
    const words = attendees.split(/[,\s]+/);
    words.pop(); // Remove the partial group name

    const existingEmails = words.filter(w => w.includes('@'));
    const newEmails = group.memberEmails.filter(email => !existingEmails.includes(email));

    const combined = [...existingEmails, ...newEmails];
    setAttendees(combined.join(', '));
    setShowGroupSuggestions(false);
  };

  const handleSchedule = async () => {
    if (!title || !date || !time) {
      alert('Please fill in all required fields');
      return;
    }

    // Parse date and time
    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

    // Format for Google Calendar
    const eventData = {
      summary: title,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: attendees
        .split(/[,\s]+/)
        .filter(email => email.includes('@'))
        .map(email => ({ email: email.trim() })),
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    console.log('Creating Google Calendar event:', eventData);

    // Here you would call Google Calendar API
    // For now, we'll create a Google Calendar link
    const startFormatted = encodeURIComponent(startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
    const endFormatted = encodeURIComponent(endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
    const titleEncoded = encodeURIComponent(title);
    const emailsEncoded = encodeURIComponent(attendees);

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleEncoded}&dates=${startFormatted}/${endFormatted}&add=${emailsEncoded}&conf=1`;

    window.open(calendarUrl, '_blank');

    if (onSchedule) onSchedule();
  };

  const filteredGroups = groups.filter(g => {
    const lastWord = attendees.split(/[,\s]+/).pop()?.toLowerCase() || '';
    return g.name.toLowerCase().includes(lastWord);
  });

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Schedule Google Meet</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label className="form-label">Meeting Title *</label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Team Sync"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Time *</label>
            <input
              type="time"
              className="form-input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Duration (min)</label>
            <input
              type="number"
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="15"
              step="15"
            />
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <label className="form-label">
            Attendees (type group name or emails separated by commas)
          </label>
          <textarea
            className="form-textarea"
            value={attendees}
            onChange={(e) => handleAttendeeChange(e.target.value)}
            placeholder="Type group name (e.g., monopoly) or emails..."
            rows={3}
            style={{ fontFamily: 'inherit' }}
          />

          {showGroupSuggestions && filteredGroups.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              marginTop: '0.25rem',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 10,
            }}>
              {filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => addGroupMembers(group)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontWeight: 500 }}>{group.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {group.memberCount} members • Click to add all
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{
          padding: '0.75rem',
          background: 'var(--accent-subtle)',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          💡 <strong>Tip:</strong> Type a group name (like "monopoly") and select it from suggestions to automatically invite all group members!
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSchedule}
          disabled={!title || !date || !time}
        >
          Create Google Meet with Calendar
        </button>
      </div>
    </div>
  );
}
