'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import AiAssistButton from './AiAssistButton';
import ReactMarkdown from 'react-markdown';

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

interface BoardUser {
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
  user: BoardUser;
  attachments: Attachment[];
}

interface ActionItemType {
  id: string;
  title: string;
  completed: boolean;
  status: string;
  assigneeId: string | null;
  createdAt: string;
  user: BoardUser;
}

interface MentionUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
  email: string | null;
}

interface CustomerStub {
  id: string;
  customer: { id: string; name: string; companyName: string | null };
}

interface DealRoom {
  id: string;
  name: string;
  members: CustomerStub[];
}

interface Props {
  dealRoom: DealRoom;
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📕', docx: '📘', txt: '📝', image: '🖼️', audio: '🎵',
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

export default function DealRoomChat({ dealRoom }: Props) {
  const { showToast } = useToast();
  const { canDo, userId } = useRole();
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemType[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newAction, setNewAction] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @mention state
  const [allUsers, setAllUsers] = useState<MentionUser[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<MentionUser | null>(null);
  const actionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/team-notes?dealRoomId=${dealRoom.id}`).then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setNotes(data);
    }).catch(() => { });
    fetch(`/api/action-items?dealRoomId=${dealRoom.id}`).then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setActionItems(data);
    }).catch(() => { });
    fetch('/api/users').then(r => r.json()).then((data) => {
      if (Array.isArray(data)) setAllUsers(data);
    }).catch(() => { });
  }, [dealRoom.id]);

  const addNote = async () => {
    if (!newNote.trim() && !selectedFile) return;
    setLoadingNote(true);
    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (newNote.trim()) formData.append('content', newNote);
        formData.append('dealRoomId', dealRoom.id);
        res = await fetch('/api/team-notes/upload', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/team-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newNote, dealRoomId: dealRoom.id }),
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed');
      }
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
      setNewNote('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      showToast('Note posted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post note', 'error');
    } finally {
      setLoadingNote(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const res = await fetch(`/api/team-notes/${id}`, { method: 'DELETE' });
      if (res.ok) { setNotes(prev => prev.filter(n => n.id !== id)); showToast('Note deleted', 'success'); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  const syncFathom = async () => {
    setSyncing(true);
    try {
      let totalSynced = 0;
      if (dealRoom.members.length > 0) {
        // Sync each customer's meetings AND create TeamNotes for this group
        for (const rc of dealRoom.members) {
          const res = await fetch(`/api/fathom?customerId=${rc.id}&groupId=${dealRoom.id}`);
          if (res.ok) {
            const data = await res.json();
            totalSynced += data.synced || 0;
          }
        }
      } else {
        // No members — just sync all Fathom meetings into this group
        const res = await fetch(`/api/fathom?groupId=${dealRoom.id}`);
        if (res.ok) {
          const data = await res.json();
          totalSynced += data.synced || 0;
        }
      }
      const notesRes = await fetch(`/api/team-notes?dealRoomId=${dealRoom.id}`);
      if (notesRes.ok) {
        const data = await notesRes.json();
        if (Array.isArray(data)) setNotes(data);
      }
      showToast(`Synced ${totalSynced} meeting notes from Fathom`, 'success');
    } catch {
      showToast('Fathom sync failed', 'error');
    } finally {
      setSyncing(false);
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
          dealRoomId: dealRoom.id,
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

  const toggleAction = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) { const updated = await res.json(); setActionItems(prev => prev.map(i => i.id === id ? updated : i)); }
    } catch { showToast('Failed to update', 'error'); }
  };

  const deleteAction = async (id: string) => {
    try {
      const res = await fetch(`/api/action-items/${id}`, { method: 'DELETE' });
      if (res.ok) { setActionItems(prev => prev.filter(i => i.id !== id)); showToast('Action item removed', 'success'); }
    } catch { showToast('Failed to delete', 'error'); }
  };

  // @mention logic - don't reopen after a user has been selected
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
    // Remove the @query from input so user just types the task title
    const atIdx = newAction.lastIndexOf('@');
    const before = newAction.slice(0, atIdx).trim();
    setNewAction(before);
    setSelectedAssignee(user);
    setMentionOpen(false);
    setTimeout(() => actionInputRef.current?.focus(), 0);
  };

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(mentionFilter) || u.email?.toLowerCase().includes(mentionFilter)
  );

  const pendingItems = actionItems.filter(i => !i.completed);
  const completedItems = actionItems.filter(i => i.completed);

  return (
    <div className="deal-chat">
      {/* Header */}
      <div className="deal-chat-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="deal-chat-title">{dealRoom.name}</h2>
          <button className="btn btn-outline btn-sm" onClick={syncFathom} disabled={syncing} style={{ fontSize: '0.75rem' }}>
            {syncing ? 'Syncing...' : 'Sync Fathom'}
          </button>
        </div>
        {dealRoom.members.length > 0 && (
          <div className="deal-chat-members-row">
            {dealRoom.members.map(rc => (
              <a key={rc.id} href={`/customers/${rc.customer.id}`} className="deal-chat-member-chip">
                {rc.customer.name}
                {rc.customer.companyName && <span className="deal-chat-member-co"> - {rc.customer.companyName}</span>}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Two-column board */}
      <div className="team-board" style={{ flex: 1, minHeight: 0 }}>
        {/* Left: Notes Feed */}
        <div className="team-board-notes">
          <div className="team-section-header">
            <h2>Notes & Files</h2>
            <span className="badge badge-fathom">{notes.length}</span>
          </div>

          {/* Post note */}
          <div className="team-note-input">
            <textarea
              className="form-textarea"
              placeholder="Write a note, share an update..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              rows={3}
              style={{ minHeight: '80px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addNote(); } }}
            />
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
                <button className="btn-icon team-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach file">
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
                <h3>No notes yet</h3>
                <p>Post a note, upload a file, or sync from Fathom.</p>
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
                          <span className={`badge badge-role-${note.user.role}`} style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>{note.user.role}</span>
                        )}
                        {note.source === 'fathom' && (
                          <span className="badge badge-fathom" style={{ marginLeft: '0.375rem', fontSize: '0.65rem' }}>Fathom</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span className="team-note-time">{timeAgo(note.createdAt)}</span>
                      {note.user.id === userId && (
                        <button className="btn-icon" onClick={() => deleteNote(note.id)} title="Delete" style={{ fontSize: '0.7rem' }}>&#x2715;</button>
                      )}
                    </div>
                  </div>
                  <CollapsibleNote content={note.content} />

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

            {/* @mention dropdown */}
            {mentionOpen && filteredUsers.length > 0 && (
              <div className="mention-dropdown" onMouseDown={e => e.preventDefault()}>
                {filteredUsers.slice(0, 6).map(u => (
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
                <p>Add tasks for this deal room.</p>
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
      </div>
    </div>
  );
}
