'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import AiAssistButton from './AiAssistButton';
import ReactMarkdown from 'react-markdown';
import ConfirmDialog from './ConfirmDialog';

function CollapsibleNote({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 400;

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="team-note-content"
        style={{
          fontSize: '0.9rem',
          lineHeight: 1.6,
          marginTop: 'var(--space-sm)',
          maxHeight: !expanded && isLong ? '150px' : 'none',
          overflow: 'hidden',
        }}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
      {!expanded && isLong && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(transparent, var(--glass-bg))',
            pointerEvents: 'none',
          }}
        />
      )}
      {isLong && (
        <button
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          style={{
            display: 'block',
            margin: 'var(--space-sm) auto 0',
            fontSize: '0.75rem',
            padding: '0.25rem 0.5rem',
            color: 'var(--accent-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '9999px',
          }}
        >
          {expanded ? '▲ Show Less' : '▼ Show More'}
        </button>
      )}
    </div>
  );
}

interface TeamUser {
  id: string;
  name: string | null;
  image: string | null;
  role?: string;
}

interface Attachment {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  mimeType: string;
}

interface TeamNote {
  id: string;
  content: string;
  meetingId: string | null;
  source: string;
  createdAt: string;
  user: TeamUser;
  attachments: Attachment[];
}

interface ActionItemType {
  id: string;
  title: string;
  completed: boolean;
  assigneeId: string | null;
  meetingId: string | null;
  createdAt: string;
  user: TeamUser;
}

interface Props {
  customerId?: string;
  customerName?: string;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📕',
  docx: '📘',
  txt: '📝',
  image: '🖼️',
  audio: '🎵',
};

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

interface MentionUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  email: string | null;
}

export default function TeamBoard({ customerId, customerName }: Props) {
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemType[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const { canDo, userId } = useRole();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // @mention state
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<MentionUser | null>(null);

  const queryParam = customerId ? `?customerId=${customerId}` : '';

  useEffect(() => {
    fetch(`/api/team-notes${queryParam}`).then(r => r.json()).then(setNotes).catch(() => { });
    fetch(`/api/action-items${queryParam}`).then(r => r.json()).then(setActionItems).catch(() => { });
    fetch('/api/users').then(r => r.json()).then(setAllUsers).catch(() => { });
  }, [queryParam]);

  const addNote = async () => {
    if (!newNote.trim() && !selectedFile) return;
    setLoadingNote(true);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (newNote.trim()) formData.append('content', newNote);
        if (customerId) formData.append('customerId', customerId);
        res = await fetch('/api/team-notes/upload', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/team-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newNote, customerId: customerId || undefined }),
        });
      }
      if (!res.ok) throw new Error('Failed');
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
      setNewNote('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Note posted', 'success');
    } catch {
      showToast('Failed to post note', 'error');
    } finally {
      setLoadingNote(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/team-notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.id !== id));
        showToast('Note deleted', 'success');
        setDeleteConfirmId(null);
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const addActionItem = async () => {
    if (!newAction.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/action-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newAction,
          customerId: customerId || undefined,
          assigneeId: selectedAssignee?.id || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const item = await res.json();
      setActionItems(prev => [item, ...prev]);
      setNewAction('');
      setSelectedAssignee(null);
      showToast('Action item added', 'success');
    } catch {
      showToast('Failed to add action item', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleActionInput = (value: string) => {
    setNewAction(value);
    if (selectedAssignee) {
      setMentionOpen(false);
      return;
    }
    const atIdx = value.lastIndexOf('@');
    if (atIdx >= 0) {
      const afterAt = value.slice(atIdx + 1);
      if (afterAt.indexOf(' ') === -1) {
        setMentionFilter(afterAt.toLowerCase());
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
  };

  const selectMention = (user: MentionUser) => {
    const atIdx = newAction.lastIndexOf('@');
    const before = newAction.slice(0, atIdx).trim();
    setNewAction(before);
    setSelectedAssignee(user);
    setMentionOpen(false);
    setTimeout(() => actionInputRef.current?.focus(), 0);
  };

  const filteredMentionUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(mentionFilter) || u.email?.toLowerCase().includes(mentionFilter)
  );

  const toggleAction = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActionItems(prev => prev.map(i => i.id === id ? updated : i));
      }
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const deleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionItems(prev => prev.filter(i => i.id !== id));
        showToast('Action item removed', 'success');
      }
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const pendingItems = actionItems.filter(i => !i.completed);
  const completedItems = actionItems.filter(i => i.completed);

  const label = customerName || 'Team';
  const notePlaceholder = customerId
    ? `Share a note about ${customerName || 'this customer'}...`
    : 'Share a note with the team...';
  const emptyNoteTitle = customerId ? `No notes for ${customerName || 'this customer'} yet` : 'No team notes yet';
  const emptyNoteDesc = customerId ? 'Be the first to add a note for this customer.' : 'Be the first to share a note with the team.';
  const emptyActionDesc = customerId ? `Add tasks related to ${customerName || 'this customer'}.` : 'Add tasks for the team to track.';

  return (
    <div className="team-board">
      {/* Left: Notes Feed */}
      <div className="team-board-notes">
        <div className="team-section-header">
          <h2>{label} Notes</h2>
          <span className="badge badge-fathom">{notes.length}</span>
        </div>

        {/* Post new note */}
        <div className="team-note-input">
          <textarea
            className="form-textarea"
            placeholder={notePlaceholder}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            style={{ minHeight: '80px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
          />

          {/* Selected file preview */}
          {selectedFile && (
            <div className="team-file-preview">
              <span>{FILE_ICONS[selectedFile.type.startsWith('image') ? 'image' : selectedFile.type.startsWith('audio') ? 'audio' : 'txt'] || '📎'}</span>
              <span className="team-file-name">{selectedFile.name}</span>
              <span className="team-file-size">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
              <button className="btn-icon" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ fontSize: '0.7rem' }}>&#x2715;</button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Shift+Enter for new line</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/*,audio/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) setSelectedFile(e.target.files[0]); }}
              />
              <button
                className="btn-icon team-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file"
              >
                📎
              </button>
            </div>
            <AiAssistButton
              text={newNote}
              onResult={(result) => setNewNote(result)}
              actions={["rephrase", "expand"]}
            />
            <button className="btn btn-primary btn-sm" onClick={addNote} disabled={loadingNote || (!newNote.trim() && !selectedFile)}>
              {loadingNote ? 'Posting...' : selectedFile ? 'Upload & Post' : 'Post Note'}
            </button>
          </div>
        </div>

        {/* Notes feed */}
        <div className="team-notes-feed">
          {notes.length === 0 ? (
            <div className="empty-state">
              <h3>{emptyNoteTitle}</h3>
              <p>{emptyNoteDesc}</p>
            </div>
          ) : (
            notes.map(note => (
              <div key={note.id} className={`team-note-card ${note.source === 'fathom' ? 'team-note-fathom' : ''}`}>
                <div className="team-note-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {note.user.image ? (
                      <img src={note.user.image} alt="" className="team-note-avatar" />
                    ) : (
                      <div className="team-note-avatar team-note-avatar-fallback">
                        {note.user.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <span className="team-note-author">{note.user.name}</span>
                      {note.user.role && (
                        <span className={`badge badge-role-${note.user.role}`} style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>
                          {note.user.role}
                        </span>
                      )}
                      {note.source === 'fathom' && (
                        <span className="badge badge-fathom" style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>
                          Fathom
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span className="team-note-time">{timeAgo(note.createdAt)}</span>
                    {note.user.id === userId && (
                      <button className="btn-icon" onClick={() => setDeleteConfirmId(note.id)} title="Delete" style={{ fontSize: '0.7rem' }}>
                        &#x2715;
                      </button>
                    )}
                  </div>
                </div>
                <CollapsibleNote content={note.content} />

                {/* Attachments */}
                {note.attachments && note.attachments.length > 0 && (
                  <div className="team-note-attachments">
                    {note.attachments.map(att => (
                      <div key={att.id} className="team-attachment">
                        {att.fileType === 'image' ? (
                          <a href={`/api/files/${att.filePath}`} target="_blank" rel="noopener noreferrer">
                            <img src={`/api/files/${att.filePath}`} alt={att.fileName} className="team-attachment-image" />
                          </a>
                        ) : att.fileType === 'audio' ? (
                          <div className="team-attachment-audio">
                            <span style={{ fontSize: '0.8rem' }}>{FILE_ICONS.audio} {att.fileName}</span>
                            <audio controls style={{ width: '100%', height: '32px', marginTop: '0.25rem' }}>
                              <source src={`/api/files/${att.filePath}`} type={att.mimeType} />
                            </audio>
                          </div>
                        ) : (
                          <a href={`/api/files/${att.filePath}`} target="_blank" rel="noopener noreferrer" className="team-attachment-file">
                            <span>{FILE_ICONS[att.fileType] || '📎'}</span>
                            <span className="team-attachment-name">{att.fileName}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Action Items */}
      <div className="team-board-actions">
        <div className="team-section-header">
          <h2>Action Items</h2>
          <span className="badge badge-manual">{pendingItems.length} pending</span>
        </div>

        <div className="team-action-input" style={{ position: 'relative' }}>
          <input
            ref={actionInputRef}
            className="form-input"
            placeholder="Add action item... (type @ to assign)"
            value={newAction}
            onChange={e => handleActionInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !mentionOpen) addActionItem(); if (e.key === 'Escape') setMentionOpen(false); }}
          />
          <button className="btn btn-primary btn-sm" onClick={addActionItem} disabled={loadingAction || !newAction.trim()}>
            +
          </button>

          {mentionOpen && filteredMentionUsers.length > 0 && (
            <div className="mention-dropdown" onMouseDown={e => e.preventDefault()}>
              {filteredMentionUsers.slice(0, 6).map(u => (
                <button key={u.id} className="mention-option" onClick={() => selectMention(u)}>
                  {u.image ? (
                    <img src={u.image} alt="" className="mention-avatar" />
                  ) : (
                    <div className="mention-avatar mention-avatar-fallback">{u.name?.charAt(0)?.toUpperCase() || '?'}</div>
                  )}
                  <div>
                    <span className="mention-name">{u.name}</span>
                    <span className="mention-role">{u.role}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedAssignee && (
            <div className="mention-selected">
              Assigned to: <strong>{selectedAssignee.name}</strong>
              <button className="btn-icon" onClick={() => setSelectedAssignee(null)} style={{ fontSize: '0.6rem', marginLeft: '0.25rem' }}>&#x2715;</button>
            </div>
          )}
        </div>

        <div className="team-action-list">
          {pendingItems.length === 0 && completedItems.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <h3>No action items</h3>
              <p>{emptyActionDesc}</p>
            </div>
          ) : (
            <>
              {pendingItems.map(item => (
                <div key={item.id} className="team-action-item">
                  <label className="team-action-check">
                    <input type="checkbox" checked={false} onChange={() => toggleAction(item.id, true)} />
                    <span className="team-action-title">{item.title}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="team-action-meta">{item.user.name?.split(' ')[0]} &middot; {timeAgo(item.createdAt)}</span>
                    <button className="btn-icon" onClick={() => deleteAction(item.id)} style={{ fontSize: '0.65rem', padding: '0.25rem' }}>&#x2715;</button>
                  </div>
                </div>
              ))}
              {completedItems.length > 0 && (
                <>
                  <div className="team-action-divider"><span>Completed ({completedItems.length})</span></div>
                  {completedItems.map(item => (
                    <div key={item.id} className="team-action-item team-action-done">
                      <label className="team-action-check">
                        <input type="checkbox" checked={true} onChange={() => toggleAction(item.id, false)} />
                        <span className="team-action-title">{item.title}</span>
                      </label>
                      <span className="team-action-meta">{item.user.name?.split(' ')[0]}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {deleteConfirmId && (
        <ConfirmDialog
          title="Delete Note"
          message="Are you sure you want to delete this message? This action cannot be undone."
          onConfirm={() => deleteNote(deleteConfirmId)}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
