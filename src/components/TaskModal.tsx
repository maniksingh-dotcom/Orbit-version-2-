'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface MentionUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  email: string | null;
}

interface CustomerOption {
  id: string;
  name: string;
}

interface TaskModalProps {
  defaultStatus?: string;
  companyId?: string | null;
  onClose: () => void;
  onCreated: (item: TaskItem) => void;
}

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  assigneeId: string | null;
  meetingId: string | null;
  dueDate: string | null;
  priority: string;
  taskType: string;
  notes: string | null;
  reminderAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  customer: { id: string; name: string } | null;
}

const TASK_TYPES = [
  { key: 'todo',      label: 'To-do',     icon: '☑' },
  { key: 'call',      label: 'Call',      icon: '📞' },
  { key: 'email',     label: 'Email',     icon: '✉' },
  { key: 'followup',  label: 'Follow-up', icon: '↩' },
  { key: 'meeting',   label: 'Meeting',   icon: '📅' },
];

const REMINDER_OPTIONS = [
  { label: 'No reminder',   value: '' },
  { label: '15 min before', value: '15' },
  { label: '30 min before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '2 hours before', value: '120' },
  { label: '1 day before',  value: '1440' },
];

export default function TaskModal({ defaultStatus = 'todo', companyId, onClose, onCreated }: TaskModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [reminder, setReminder] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<MentionUser | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [showAssigneeDrop, setShowAssigneeDrop] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    fetch('/api/users').then(r => r.json()).then(setAllUsers).catch(() => {});
    fetch('/api/customers').then(r => r.json()).then(setCustomers).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssigneeDrop(false);
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setShowCustomerDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const computeReminderAt = (): string | null => {
    if (!reminder || !dueDate) return null;
    const mins = parseInt(reminder, 10);
    const dateStr = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T09:00`;
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() - mins);
    return d.toISOString();
  };

  const handleSubmit = async () => {
    if (!title.trim()) { showToast('Task title is required', 'error'); return; }
    setSaving(true);
    try {
      const dueDateValue = dueDate
        ? dueTime
          ? new Date(`${dueDate}T${dueTime}`).toISOString()
          : new Date(`${dueDate}T09:00`).toISOString()
        : null;

      const body = {
        title: title.trim(),
        status: defaultStatus,
        taskType,
        priority,
        notes: notes.trim() || null,
        dueDate: dueDateValue,
        reminderAt: computeReminderAt(),
        assigneeId: selectedAssignee?.id || null,
        customerId: selectedCustomer?.id || null,
        companyId: companyId || null,
      };

      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (companyId) headers['X-Company-Id'] = companyId;
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();
      const item = await res.json();
      showToast('Task created', 'success');
      onCreated({ ...item, status: item.status || defaultStatus, taskType: taskType });
      onClose();
    } catch {
      showToast('Failed to create task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter(u =>
    !assigneeQuery ||
    u.name?.toLowerCase().includes(assigneeQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(assigneeQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(c =>
    !customerQuery || c.name.toLowerCase().includes(customerQuery.toLowerCase())
  );

  return (
    <div className="task-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="task-modal">
        {/* Header */}
        <div className="task-modal-header">
          <span className="task-modal-title">New Task</span>
          <button className="task-modal-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Title input */}
        <input
          ref={titleRef}
          className="task-modal-title-input"
          placeholder="Enter your task title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
        />

        {/* Row 1: Type, Priority, Date, Time */}
        <div className="task-modal-row">
          <div className="task-modal-field">
            <label className="task-modal-label">Task Type</label>
            <select className="task-modal-select" value={taskType} onChange={e => setTaskType(e.target.value)}>
              {TASK_TYPES.map(t => (
                <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
              ))}
            </select>
          </div>

          <div className="task-modal-field">
            <label className="task-modal-label">Priority</label>
            <select className="task-modal-select" value={priority} onChange={e => setPriority(e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">● Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="task-modal-field">
            <label className="task-modal-label">Due Date</label>
            <input
              type="date"
              className="task-modal-input"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="task-modal-field">
            <label className="task-modal-label">Time</label>
            <input
              type="time"
              className="task-modal-input"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
            />
          </div>
        </div>

        {/* Row 2: Assign to, Reminder */}
        <div className="task-modal-row">
          <div className="task-modal-field task-modal-field-grow" ref={assigneeRef}>
            <label className="task-modal-label">Assign to</label>
            <div className="task-modal-autocomplete">
              {selectedAssignee ? (
                <div className="task-modal-selected-pill">
                  {selectedAssignee.image
                    ? <img src={selectedAssignee.image} alt="" className="task-modal-pill-avatar" />
                    : <span className="task-modal-pill-avatar task-modal-pill-avatar-fallback">{selectedAssignee.name?.charAt(0) || '?'}</span>
                  }
                  <span>{selectedAssignee.name}</span>
                  <button className="task-modal-pill-remove" onClick={() => setSelectedAssignee(null)}>×</button>
                </div>
              ) : (
                <input
                  className="task-modal-input"
                  placeholder="@mention user..."
                  value={assigneeQuery}
                  onChange={e => { setAssigneeQuery(e.target.value); setShowAssigneeDrop(true); }}
                  onFocus={() => setShowAssigneeDrop(true)}
                />
              )}
              {showAssigneeDrop && !selectedAssignee && filteredUsers.length > 0 && (
                <div className="task-modal-dropdown">
                  {filteredUsers.slice(0, 6).map(u => (
                    <button
                      key={u.id}
                      className="task-modal-dropdown-item"
                      onMouseDown={e => { e.preventDefault(); setSelectedAssignee(u); setAssigneeQuery(''); setShowAssigneeDrop(false); }}
                    >
                      {u.image
                        ? <img src={u.image} alt="" className="task-modal-pill-avatar" />
                        : <span className="task-modal-pill-avatar task-modal-pill-avatar-fallback">{u.name?.charAt(0) || '?'}</span>
                      }
                      <span>{u.name}</span>
                      <span className="task-modal-dropdown-role">{u.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="task-modal-field task-modal-field-grow">
            <label className="task-modal-label">Send Reminder</label>
            <select
              className="task-modal-select"
              value={reminder}
              onChange={e => setReminder(e.target.value)}
              disabled={!dueDate}
              title={!dueDate ? 'Set a due date first' : undefined}
            >
              {REMINDER_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: Link to customer */}
        <div className="task-modal-field" ref={customerRef}>
          <label className="task-modal-label">Link to Person (optional)</label>
          <div className="task-modal-autocomplete">
            {selectedCustomer ? (
              <div className="task-modal-selected-pill">
                <span>{selectedCustomer.name}</span>
                <button className="task-modal-pill-remove" onClick={() => setSelectedCustomer(null)}>×</button>
              </div>
            ) : (
              <input
                className="task-modal-input"
                placeholder="Search customer..."
                value={customerQuery}
                onChange={e => { setCustomerQuery(e.target.value); setShowCustomerDrop(true); }}
                onFocus={() => setShowCustomerDrop(true)}
              />
            )}
            {showCustomerDrop && !selectedCustomer && filteredCustomers.length > 0 && (
              <div className="task-modal-dropdown">
                {filteredCustomers.slice(0, 6).map(c => (
                  <button
                    key={c.id}
                    className="task-modal-dropdown-item"
                    onMouseDown={e => { e.preventDefault(); setSelectedCustomer(c); setCustomerQuery(''); setShowCustomerDrop(false); }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="task-modal-field">
          <label className="task-modal-label">Notes</label>
          <textarea
            className="task-modal-textarea"
            placeholder="Add any notes..."
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {/* Footer */}
        <div className="task-modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
          >
            {saving ? 'Creating...' : 'Create Task →'}
          </button>
        </div>
      </div>
    </div>
  );
}
