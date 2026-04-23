'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';

interface Document {
  id: string;
  title: string;
  filePath: string;
  fileType: string;
  mimeType: string;
  transcription: string | null;
  customerId: string;
  createdAt: string;
}

interface Props {
  document: Document;
  onClose: () => void;
  onTranscriptionSaved: (id: string, text: string) => void;
}

export default function DocumentViewer({ document: doc, onClose, onTranscriptionSaved }: Props) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const fileUrl = `/api/files/${doc.filePath}`;

  useEffect(() => {
    if (doc.fileType === 'txt') {
      fetch(fileUrl)
        .then((r) => r.text())
        .then(setTextContent)
        .catch(() => setTextContent('Failed to load file content.'));
    }
  }, [doc.fileType, fileUrl]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: doc.fileType === 'pdf' ? '900px' : '600px' }}
      >
        <div className="modal-header">
          <div>
            <h3>{doc.title}</h3>
            <span className={`badge badge-${doc.fileType}`} style={{ marginTop: '0.25rem' }}>
              {doc.fileType}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div>
          {doc.fileType === 'image' && (
            <img
              src={fileUrl}
              alt={doc.title}
              style={{ width: '100%', borderRadius: '0.5rem' }}
            />
          )}

          {doc.fileType === 'pdf' && (
            <iframe
              src={fileUrl}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
                borderRadius: '0.5rem',
                background: '#fff',
              }}
              title={doc.title}
            />
          )}

          {doc.fileType === 'txt' && (
            <div
              style={{
                padding: 'var(--space-md)',
                background: 'var(--bg-surface)',
                borderRadius: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                maxHeight: '60vh',
                overflowY: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {textContent ?? 'Loading...'}
            </div>
          )}

          {doc.fileType === 'docx' && (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
                DOCX preview is not available in browser.
              </p>
              <a
                href={fileUrl}
                download={doc.title}
                className="btn btn-primary btn-sm"
              >
                Download File
              </a>
            </div>
          )}

          {doc.fileType === 'audio' && (
            <AudioPlayer
              src={fileUrl}
              documentId={doc.id}
              transcription={doc.transcription}
            />
          )}
        </div>
      </div>
    </div>
  );
}
