'use client';

import { useEffect, useCallback } from 'react';

const STORAGE_KEY = 'orbit_task_reminders';

function getRemindedTasks(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored) as { id: string; expiry: number }[];
    const now = Date.now();
    return new Set(parsed.filter(e => e.expiry > now).map(e => e.id));
  } catch {
    return new Set();
  }
}

function markTaskReminded(taskId: string) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: { id: string; expiry: number }[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();
    const valid = parsed.filter(e => e.expiry > now);
    valid.push({ id: taskId, expiry: now + 7200000 }); // 2 hour window
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
  } catch {}
}

interface ActionItemRaw {
  id: string;
  title: string;
  status: string;
  reminderAt: string | null;
  taskType: string;
  customer: { name: string } | null;
  dueDate: string | null;
}

export default function TaskReminderPoller() {
  const checkReminders = useCallback(() => {
    fetch('/api/action-items')
      .then(r => r.json())
      .then((items: ActionItemRaw[]) => {
        if (!Array.isArray(items)) return;
        const now = Date.now();
        const reminded = getRemindedTasks();

        for (const item of items) {
          if (!item.reminderAt || item.status === 'done') continue;
          const reminderTime = new Date(item.reminderAt).getTime();
          const minsUntil = (reminderTime - now) / 60000;

          // Fire if within the next 10 minutes and not already fired
          if (minsUntil > -1 && minsUntil <= 10 && !reminded.has(item.id)) {
            markTaskReminded(item.id);

            const typeEmoji = item.taskType === 'call' ? '📞' : item.taskType === 'meeting' ? '📅' : '⏰';
            const customerPart = item.customer ? ` with ${item.customer.name}` : '';
            const timePart = item.dueDate
              ? ` at ${new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : '';
            const body = `${typeEmoji} "${item.title}"${customerPart}${timePart}`;

            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Task Reminder', { body, icon: '/favicon.ico' });
            }

            // Dispatch a custom event so NotificationBell can pick it up if needed
            window.dispatchEvent(new CustomEvent('orbit:task-reminder', {
              detail: { id: `task-reminder-${item.id}`, message: body, taskId: item.id },
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return null;
}
