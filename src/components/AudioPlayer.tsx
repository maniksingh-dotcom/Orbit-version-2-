'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  src: string;
  documentId: string;
  transcription: string | null;
  compact?: boolean;
}

export default function AudioPlayer({ src, documentId, transcription, compact }: Props) {
  const [trans, setTrans] = useState(transcription || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const saveTranscription = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription: trans }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('Transcription saved', 'success');
      setEditing(false);
    } catch {
      showToast('Failed to save transcription', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <audio
          controls
          src={src}
          style={{ width: '100%', height: 32, marginTop: '0.5rem' }}
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div>
      <audio controls src={src} style={{ width: '100%' }} preload="metadata" />

      <div style={{ marginTop: 'var(--space-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <label className="form-label" style={{ margin: 0 }}>Transcription</label>
          {!editing && (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
              {transcription ? 'Edit' : 'Add Transcription'}
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              className="form-textarea"
              value={trans}
              onChange={(e) => setTrans(e.target.value)}
              placeholder="Paste or type the transcription here..."
              style={{ minHeight: '160px' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveTranscription} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : transcription ? (
          <div
            style={{
              padding: 'var(--space-md)',
              background: 'var(--bg-surface)',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.7,
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {transcription}
          </div>
        ) : (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>
            No transcription available. Click &ldquo;Add Transcription&rdquo; to add one.
          </p>
        )}
      </div>
    </div>
  );
}
