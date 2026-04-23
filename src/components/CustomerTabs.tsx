'use client';

import { useState } from 'react';
import NotesTab from './NotesTab';
import DocumentsTab from './DocumentsTab';
import TeamBoard from './TeamBoard';
import JourneyTimeline from './JourneyTimeline';

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
  customerName: string;
  notes: Note[];
  documents: Document[];
  pipelineStage?: string;
}

export default function CustomerTabs({ customerId, customerName, notes, documents, pipelineStage = 'new' }: Props) {
  const [activeTab, setActiveTab] = useState<'journey' | 'overview' | 'notes' | 'documents' | 'team-notes'>('journey');

  const tabs = [
    { key: 'journey' as const, label: 'Journey' },
    { key: 'overview' as const, label: 'Overview' },
    { key: 'notes' as const, label: `Notes (${notes.length})` },
    { key: 'documents' as const, label: `Documents (${documents.length})` },
    { key: 'team-notes' as const, label: 'Team Notes' },
  ];

  return (
    <div>
      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'journey' && (
        <JourneyTimeline customerId={customerId} currentStage={pipelineStage} />
      )}

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1.1rem' }}>Recent Notes</h3>
            {notes.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No notes yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {notes.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--bg-surface)',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{note.title}</span>
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{note.addedBy}</span>
                        <span className={`badge badge-${note.source}`}>{note.source}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1.1rem' }}>Recent Documents</h3>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No documents yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--bg-surface)',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{doc.title}</span>
                      <span className={`badge badge-${doc.fileType}`}>{doc.fileType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && <NotesTab customerId={customerId} initialNotes={notes} />}
      {activeTab === 'documents' && <DocumentsTab customerId={customerId} initialDocuments={documents} />}
      {activeTab === 'team-notes' && <TeamBoard customerId={customerId} customerName={customerName} />}
    </div>
  );
}
