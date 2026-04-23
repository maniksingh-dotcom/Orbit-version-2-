'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import AiAssistButton from './AiAssistButton';
import AddNoteModal from './AddNoteModal';
import FathomSyncButton from './FathomSyncButton';

interface Note {
  id: string;
  fathomId: string | null;
  title: string;
  content: string;
  source: string;
  addedBy: string;
  customerId: string;
  createdAt: string;
}

interface Props {
  customerId: string;
  initialNotes: Note[];
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function extractMeetingDate(content: string): string | null {
  // Extract meeting date from markdown content
  // Format: "Date: Mon, Mar 16, 2026" or similar
  const dateMatch = content.match(/Date:\s*([^|]+?)(?:\s*\||$)/);
  if (dateMatch) {
    return dateMatch[1].trim();
  }
  return null;
}

export default function NotesTab({ customerId, initialNotes }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { canDo } = useRole();

  const refreshNotes = async () => {
    try {
      const res = await fetch(`/api/notes?customerId=${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch {
      // silently fail
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        showToast('Note deleted', 'success');
      }
    } catch {
      showToast('Failed to delete note', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <FathomSyncButton customerId={customerId} onSync={refreshNotes} />
        <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="empty-state">
          <h3>No notes yet</h3>
          <p>Sync from Fathom or add a manual note to get started.</p>
        </div>
      ) : (
        <div className="notes-table">
          {/* Table Header */}
          <div className="notes-table-header">
            <div className="notes-col-title">Title</div>
            <div className="notes-col-author">Added By</div>
            <div className="notes-col-source">Source</div>
            <div className="notes-col-date">Date</div>
            <div className="notes-col-actions">Actions</div>
          </div>

          {/* Table Rows */}
          {notes.map((note) => (
            <div key={note.id}>
              <div
                className={`notes-table-row ${expandedId === note.id ? 'notes-row-expanded' : ''}`}
                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
              >
                <div className="notes-col-title">
                  <span style={{ fontWeight: 500 }}>{note.title}</span>
                </div>
                <div className="notes-col-author">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {note.addedBy}
                  </span>
                </div>
                <div className="notes-col-source">
                  <span className={`badge badge-${note.source}`}>{note.source}</span>
                </div>
                <div className="notes-col-date">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {note.source === 'fathom' ? (
                      extractMeetingDate(note.content) || timeAgo(note.createdAt)
                    ) : (
                      timeAgo(note.createdAt)
                    )}
                  </span>
                </div>
                <div className="notes-col-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(note.id);
                    }}
                    title="Delete note"
                    style={{ fontSize: '0.8rem' }}
                  >
                    &#x2715;
                  </button>
                </div>
              </div>

              {expandedId === note.id && (
                <div className="notes-expanded-content">
                  {note.source === 'fathom' ? (
                    <ReactMarkdown>{note.content}</ReactMarkdown>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div>
                  )}
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <AiAssistButton
                      text={note.content}
                      onResult={() => {}}
                      actions={["summarize", "insights", "suggest_actions"]}
                      size="md"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddNoteModal
          customerId={customerId}
          onClose={() => setShowAddModal(false)}
          onAdded={(note) => {
            setNotes((prev) => [note, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
