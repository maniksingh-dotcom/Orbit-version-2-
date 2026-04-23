'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface NotificationFrom {
  id: string;
  name: string | null;
  image: string | null;
}

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  from: NotificationFrom | null;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  meetLink: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const REMINDER_STORAGE_KEY = 'orbit_notif_reminders';

function getRemindedMeetings(): Set<string> {
  try {
    const stored = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as { id: string; expiry: number }[];
    const now = Date.now();
    const valid = parsed.filter(e => e.expiry > now);
    return new Set(valid.map(e => e.id));
  } catch {
    return new Set();
  }
}

function markMeetingReminded(eventId: string) {
  try {
    const stored = localStorage.getItem(REMINDER_STORAGE_KEY);
    const parsed: { id: string; expiry: number }[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const valid = parsed.filter(e => e.expiry > now);
    valid.push({ id: eventId, expiry: now + 3600000 }); // expire after 1 hour
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(valid));
  } catch {}
}

// Type icon based on notification type
function getNotifIcon(type: string): string {
  switch (type) {
    case 'mention': return '@';
    case 'fathom_recording': return 'R';
    case 'fathom_complete': return 'F';
    case 'meeting_reminder': return 'M';
    default: return '?';
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [meetingReminders, setMeetingReminders] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Combine server notifications + local meeting reminders
  const allNotifications = [...meetingReminders.filter(r => !r.read), ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then((data: NotificationItem[]) => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(() => {});
  }, []);

  // Check calendar for upcoming meeting reminders
  const checkMeetingReminders = useCallback(() => {
    fetch('/api/calendar/events')
      .then(r => r.json())
      .then((events: CalendarEvent[]) => {
        if (!Array.isArray(events)) return;
        const now = Date.now();
        const reminded = getRemindedMeetings();
        const newReminders: NotificationItem[] = [];

        for (const ev of events) {
          const start = new Date(ev.start).getTime();
          const minsUntil = (start - now) / 60000;

          // Remind 10 minutes before
          if (minsUntil > 0 && minsUntil <= 10 && !reminded.has(ev.id)) {
            markMeetingReminded(ev.id);
            const minsText = Math.ceil(minsUntil);
            newReminders.push({
              id: `reminder-${ev.id}`,
              type: 'meeting_reminder',
              message: `Meeting "${ev.title}" starts in ${minsText} min`,
              link: ev.meetLink,
              read: false,
              createdAt: new Date().toISOString(),
              from: null,
            });

            // Also request browser notification
            if (Notification.permission === 'granted') {
              new Notification(`Meeting in ${minsText} min`, {
                body: ev.title,
                icon: '/favicon.ico',
              });
            }
          }
        }

        if (newReminders.length > 0) {
          setMeetingReminders(prev => [...newReminders, ...prev]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    checkMeetingReminders();

    // Request browser notification permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      checkMeetingReminders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, checkMeetingReminders]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setMeetingReminders(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = 420;
      const viewportHeight = window.innerHeight;
      // Align top with the bell button, but clamp so dropdown doesn't go off screen
      const top = Math.min(rect.top, viewportHeight - dropdownHeight - 8);
      setDropdownPos({
        top: Math.max(8, top),
        left: rect.right + 8,
      });
    }
    setOpen(!open);
    if (!open && unreadCount > 0) {
      markAllRead();
    }
  };

  const handleClick = (notif: NotificationItem) => {
    if (notif.link) {
      window.location.href = notif.link;
    }
    setOpen(false);
  };

  return (
    <div className="notification-bell" ref={ref}>
      <button ref={btnRef} className="notification-bell-btn" onClick={handleOpen} title="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div
          className="notification-dropdown"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            right: 'unset',
            zIndex: 9999,
          }}
        >
          <div className="notification-dropdown-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-list">
            {allNotifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              allNotifications.map(notif => (
                <button
                  key={notif.id}
                  className={`notification-item ${!notif.read ? 'notification-unread' : ''}`}
                  onClick={() => handleClick(notif)}
                >
                  <div className="notification-item-content">
                    {notif.from?.image ? (
                      <img src={notif.from.image} alt="" className="notification-avatar" />
                    ) : (
                      <div className="notification-avatar notification-avatar-fallback" data-type={notif.type}>
                        {notif.from?.name?.charAt(0)?.toUpperCase() || getNotifIcon(notif.type)}
                      </div>
                    )}
                    <div className="notification-text">
                      <p className="notification-message">{notif.message}</p>
                      <span className="notification-time">{timeAgo(notif.createdAt)}</span>
                    </div>
                  </div>
                  {!notif.read && <span className="notification-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
