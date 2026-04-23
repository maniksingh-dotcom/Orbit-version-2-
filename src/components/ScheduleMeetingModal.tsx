'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface TeamUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface CustomerEntry {
  id: string;
  name: string;
  email: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  memberEmails: string[];
}

interface Attendee {
  email: string;
  name: string;
  type: 'team' | 'customer';
}

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function ScheduleMeetingModal({ onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [addMeetLink, setAddMeetLink] = useState(true);
  const [loading, setLoading] = useState(false);

  // Attendee picker
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [customers, setCustomers] = useState<CustomerEntry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedAttendees, setSelectedAttendees] = useState<Attendee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setTeamUsers).catch(() => {});
    fetch('/api/customers')
      .then(r => r.json())
      .then((data: CustomerEntry[]) => {
        setCustomers(data.filter(c => c.email));
      })
      .catch(() => {});
    fetch('/api/groups/lookup').then(r => r.json()).then(setGroups).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const filteredTeam = teamUsers.filter(u =>
    u.email &&
    !selectedAttendees.some(a => a.email === u.email) &&
    (u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c =>
    c.email &&
    !selectedAttendees.some(a => a.email === c.email) &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email!.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addAttendee = (attendee: Attendee) => {
    setSelectedAttendees(prev => [...prev, attendee]);
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const removeAttendee = (email: string) => {
    setSelectedAttendees(prev => prev.filter(a => a.email !== email));
  };

  const addGroupMembers = (group: Group) => {
    // Add all group members who aren't already invited
    const newAttendees: Attendee[] = [];

    group.memberEmails.forEach(email => {
      if (!selectedAttendees.some(a => a.email === email)) {
        // Find the customer with this email to get their name
        const customer = customers.find(c => c.email === email);
        const teamMember = teamUsers.find(u => u.email === email);

        if (customer) {
          newAttendees.push({ email, name: customer.name, type: 'customer' });
        } else if (teamMember) {
          newAttendees.push({ email, name: teamMember.name || email, type: 'team' });
        } else {
          // Fallback if email not found in either list
          newAttendees.push({ email, name: email.split('@')[0], type: 'customer' });
        }
      }
    });

    setSelectedAttendees(prev => [...prev, ...newAttendees]);
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !startTime || !endTime) return;

    setLoading(true);
    try {
      const startDateTime = new Date(`${date}T${startTime}`).toISOString();
      const endDateTime = new Date(`${date}T${endTime}`).toISOString();

      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          startTime: startDateTime,
          endTime: endDateTime,
          attendeeEmails: selectedAttendees.map(a => a.email),
          addMeetLink,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const data = await res.json();
      showToast(
        data.meetLink ? 'Meeting scheduled with Google Meet link!' : 'Meeting scheduled!',
        'success'
      );
      onCreated?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule meeting';
      console.error('Meeting scheduling error:', errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Schedule Meeting</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting agenda or notes..."
              style={{ minHeight: '80px' }}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={addMeetLink}
                onChange={(e) => setAddMeetLink(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)' }}
              />
              Add Google Meet video link
            </label>
          </div>

          {/* Attendee Picker */}
          <div className="form-group">
            <label className="form-label">Invite Attendees</label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <input
                className="form-input"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                placeholder="Search team members or customers..."
              />

              {dropdownOpen && (filteredGroups.length > 0 || filteredTeam.length > 0 || filteredCustomers.length > 0) && (
                <div className="schedule-attendee-dropdown">
                  {filteredGroups.length > 0 && (
                    <>
                      <div className="schedule-attendee-group">Groups</div>
                      {filteredGroups.slice(0, 3).map(g => (
                        <button
                          key={g.id}
                          type="button"
                          className="schedule-attendee-option"
                          onClick={() => addGroupMembers(g)}
                          style={{
                            background: 'var(--accent-subtle)',
                            borderLeft: '3px solid var(--accent-primary)'
                          }}
                        >
                          <div className="schedule-attendee-info">
                            <span className="schedule-attendee-name">{g.name}</span>
                            <span className="schedule-attendee-email">{g.memberCount} members • Click to invite all</span>
                          </div>
                          <span className="badge" style={{ fontSize: '0.6rem', background: 'var(--accent-primary)' }}>group</span>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredTeam.length > 0 && (
                    <>
                      <div className="schedule-attendee-group">Team Members</div>
                      {filteredTeam.slice(0, 5).map(u => (
                        <button
                          key={u.id}
                          type="button"
                          className="schedule-attendee-option"
                          onClick={() => addAttendee({ email: u.email!, name: u.name || u.email!, type: 'team' })}
                        >
                          <div className="schedule-attendee-info">
                            <span className="schedule-attendee-name">{u.name}</span>
                            <span className="schedule-attendee-email">{u.email}</span>
                          </div>
                          <span className="badge" style={{ fontSize: '0.6rem' }}>{u.role}</span>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredCustomers.length > 0 && (
                    <>
                      <div className="schedule-attendee-group">Customers</div>
                      {filteredCustomers.slice(0, 5).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="schedule-attendee-option"
                          onClick={() => addAttendee({ email: c.email!, name: c.name, type: 'customer' })}
                        >
                          <div className="schedule-attendee-info">
                            <span className="schedule-attendee-name">{c.name}</span>
                            <span className="schedule-attendee-email">{c.email}</span>
                          </div>
                          <span className="badge badge-customer" style={{ fontSize: '0.6rem' }}>customer</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Selected attendees chips */}
            {selectedAttendees.length > 0 && (
              <div className="schedule-attendee-chips">
                {selectedAttendees.map(a => (
                  <span key={a.email} className={`schedule-attendee-chip ${a.type === 'customer' ? 'chip-customer' : 'chip-team'}`}>
                    {a.name.split(' ')[0]}
                    <button type="button" onClick={() => removeAttendee(a.email)} className="chip-remove">&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
