'use client';

import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useRole } from '@/hooks/useRole';
import FileUpload from './FileUpload';
import AudioPlayer from './AudioPlayer';
import DocumentViewer from './DocumentViewer';

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
  customerId: string;
  initialDocuments: Document[];
}

const FILE_TYPE_ICONS: Record<string, string> = {
  txt: '📝',
  pdf: '📕',
  docx: '📘',
  image: '🖼️',
  audio: '🎵',
};

export default function DocumentsTab({ customerId, initialDocuments }: Props) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [showUpload, setShowUpload] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const { showToast } = useToast();
  const { canDo } = useRole();

  const deleteDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        showToast('Document deleted', 'success');
      }
    } catch {
      showToast('Failed to delete document', 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel Upload' : '+ Upload Document'}
        </button>
      </div>

      {showUpload && (
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <FileUpload
            customerId={customerId}
            onUploaded={(doc) => {
              setDocuments((prev) => [doc, ...prev]);
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="empty-state">
          <h3>No documents yet</h3>
          <p>Upload files to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card" style={{ padding: 'var(--space-md)' }}>
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => setViewingDoc(doc)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                  <span style={{ fontSize: '1.5rem' }}>{FILE_TYPE_ICONS[doc.fileType] || '📄'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {doc.title}
                    </h4>
                    <span className={`badge badge-${doc.fileType}`}>{doc.fileType}</span>
                  </div>
                </div>

                {doc.fileType === 'image' && (
                  <img
                    src={`/api/files/${doc.filePath}`}
                    alt={doc.title}
                    style={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: '0.5rem',
                      marginBottom: 'var(--space-sm)',
                    }}
                  />
                )}

                {doc.fileType === 'audio' && (
                  <AudioPlayer
                    src={`/api/files/${doc.filePath}`}
                    documentId={doc.id}
                    transcription={doc.transcription}
                    compact
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                <button
                  className="btn-icon"
                  onClick={() => deleteDocument(doc.id)}
                  title="Delete"
                  style={{ fontSize: '0.8rem' }}
                >
                  &#x2715;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onTranscriptionSaved={(id, text) => {
            setDocuments((prev) =>
              prev.map((d) => (d.id === id ? { ...d, transcription: text } : d))
            );
          }}
        />
      )}
    </div>
  );
}
