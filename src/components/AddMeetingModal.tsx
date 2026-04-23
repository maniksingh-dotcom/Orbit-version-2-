'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface Customer {
  id: string;
  name: string;
}

export interface AdhocMeeting {
  id: string;
  title: string;
  date: string;
  duration: number | null;
  attendees: string | null;
  summary: string | null;
  customerId: string | null;
  userId: string | null;
  customer: { id: string; name: string } | null;
  user: { id: string; name: string } | null;
}

interface Props {
  onClose: () => void;
  onAdded: (meeting: AdhocMeeting) => void;
}

export default function AddMeetingModal({ onClose, onAdded }: Props) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [attendees, setAttendees] = useState('');
  const [duration, setDuration] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then((data: Customer[]) => setCustomers(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/meetings/adhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, customerId, attendees, duration, summary }),
      });
      if (!res.ok) throw new Error('Failed to create meeting');
      const data = await res.json();
      showToast('Meeting logged', 'success');
      onAdded(data.meeting);
    } catch {
      showToast('Failed to log meeting', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Log Ad Hoc Meeting</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select
              className="form-input"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select a customer…</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              className="form-input"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 60"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Attendees</label>
              <input
                className="form-input"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="Names or emails, comma-separated"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Summary</label>
            <textarea
              className="form-textarea"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What was discussed? Any key decisions or action items?"
              style={{ minHeight: '120px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving…' : 'Log Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
