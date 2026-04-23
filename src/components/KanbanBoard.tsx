'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useCompany } from '@/contexts/CompanyContext';
import TaskModal, { type TaskItem } from './TaskModal';

interface KanbanUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface KanbanCustomer {
  id: string;
  name: string;
}

interface ActionItem {
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
  user: KanbanUser;
  customer: KanbanCustomer | null;
}

interface MentionUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  email: string | null;
}

const COLUMNS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review',      label: 'Review' },
  { key: 'done',        label: 'Done' },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high:   '#f59e0b',
  medium: '#3C95D6',
  low:    '#64748b',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  high:   'High',
  medium: 'Medium',
  low:    'Low',
};

const TASK_TYPE_ICONS: Record<string, string> = {
  todo:     '☑',
  call:     '📞',
  email:    '✉',
  followup: '↩',
  meeting:  '📅',
};

const COL_COLORS: Record<string, string> = {
  todo: '#475569',
  in_progress: 'var(--accent-primary)',
  review: '#f59e0b',
  done: '#22c55e',
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate: string): string {
  const d = new Date(dueDate);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function KanbanBoard() {
  const { showToast } = useToast();
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);

  // Task modal state
  const [modalCol, setModalCol] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  useEffect(() => {
    const headers: HeadersInit = {};
    if (activeCompany?.id) headers['X-Company-Id'] = activeCompany.id;
    fetch('/api/action-items', { headers })
      .then(r => r.json())
      .then((data: ActionItem[]) => {
        const migrated = data.map(item => ({
          ...item,
          status:   item.status || (item.completed ? 'done' : 'todo'),
          priority: item.priority || 'medium',
          taskType: item.taskType || 'todo',
        }));
        setItems(migrated);
      })
      .catch(() => {});
  }, [activeCompany?.id]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setItems(prev => prev.map(i => i.id === id ? { ...updated, status: updated.status || status } : i));
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const handleTaskCreated = (item: TaskItem) => {
    setItems(prev => [...prev, {
      ...item,
      status:   item.status || 'todo',
      priority: item.priority || 'medium',
      taskType: item.taskType || 'todo',
    } as ActionItem]);
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
        showToast('Task removed', 'success');
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('kanbanItemId', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const itemId = e.dataTransfer.getData('kanbanItemId');
    if (!itemId) return;
    const item = items.find(i => i.id === itemId);
    if (item && item.status !== status) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status, completed: status === 'done' } : i));
      updateStatus(itemId, status);
    }
  };

  const getAssigneeName = (assigneeId: string | null) => {
    if (!assigneeId) return null;
    const user = allUsers.find(u => u.id === assigneeId);
    return user?.name?.split(' ')[0] || null;
  };

  // suppress unused variable warning
  void PRIORITY_LABELS;

  return (
    <>
      <div className="kanban-board">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.status === col.key);
          return (
            <div
              key={col.key}
              className={`kanban-column${dragOverCol === col.key ? ' kanban-cards-over' : ''}`}
              data-status={col.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="kanban-column-header">
                <div className="kanban-column-header-left">
                  <span className="kanban-column-dot" style={{ background: COL_COLORS[col.key] }} />
                  <span className="kanban-column-title">{col.label}</span>
                </div>
                <span className="kanban-column-count">{colItems.length}</span>
              </div>

              <div className="kanban-cards">
                {colItems.map(item => {
                  const overdue = item.status !== 'done' && isOverdue(item.dueDate);
                  const assigneeName = getAssigneeName(item.assigneeId);
                  return (
                    <div
                      key={item.id}
                      className={`kanban-card${overdue ? ' kanban-card-overdue' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                    >
                      {/* Priority left bar */}
                      <div className="kanban-priority-bar" style={{ background: PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium }} />

                      {/* Card body */}
                      <div className="kanban-card-body">
                        {/* Top row: priority dot + type pill + due date */}
                        <div className="kanban-card-top">
                          <span
                            className="kanban-priority-dot"
                            style={{ background: PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium }}
                            title={PRIORITY_LABELS[item.priority]}
                          />
                          {item.taskType && (
                            <span className="kanban-type-pill">
                              {TASK_TYPE_ICONS[item.taskType] || TASK_TYPE_ICONS.todo} {item.taskType === 'todo' ? 'Task' : item.taskType.charAt(0).toUpperCase() + item.taskType.slice(1)}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className={`kanban-due-chip${overdue ? ' kanban-due-overdue' : ''}`}>
                              {formatDueDate(item.dueDate)}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <p className="kanban-card-title">{item.title}</p>

                        {/* Notes preview */}
                        {item.notes && <p className="kanban-card-notes-preview">{item.notes}</p>}

                        {/* Footer: customer + assignee avatar + delete */}
                        <div className="kanban-card-footer">
                          <div className="kanban-card-footer-left">
                            {item.customer && (
                              <span className="kanban-customer-chip">{item.customer.name}</span>
                            )}
                          </div>
                          <div className="kanban-card-footer-right">
                            <div className="kanban-assignee-avatar" title={assigneeName || item.user.name || ''}>
                              {(assigneeName || item.user.name?.split(' ')[0] || '?').charAt(0).toUpperCase()}
                            </div>
                            <button
                              className="kanban-delete-btn btn-icon"
                              onClick={() => deleteTask(item.id)}
                              title="Delete task"
                            >
                              &#x2715;
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="kanban-add-btn"
                onClick={() => setModalCol(col.key)}
              >
                + Add Task
              </button>
            </div>
          );
        })}
      </div>

      {modalCol && (
        <TaskModal
          defaultStatus={modalCol}
          companyId={activeCompany?.id}
          onClose={() => setModalCol(null)}
          onCreated={handleTaskCreated}
        />
      )}
    </>
  );
}
