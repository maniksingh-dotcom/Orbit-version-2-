'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import AiAssistButton from './AiAssistButton';

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
  onClose: () => void;
  onAdded: (note: Note) => void;
}

export default function AddNoteModal({ customerId, onClose, onAdded }: Props) {
  const { userName } = useRole();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [addedBy, setAddedBy] = useState(userName);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, customerId, addedBy }),
      });

      if (!res.ok) throw new Error('Failed to create note');

      const note = await res.json();
      showToast('Note added', 'success');
      onAdded(note);
    } catch {
      showToast('Failed to add note', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Note</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Added By</label>
            <input
              className="form-input"
              value={addedBy}
              onChange={(e) => setAddedBy(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <textarea
              className="form-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              required
              style={{ minHeight: '200px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'flex-end', alignItems: 'center' }}>
            <AiAssistButton
              text={content}
              onResult={(result) => setContent(result)}
              actions={["rephrase", "expand"]}
              size="md"
            />
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
