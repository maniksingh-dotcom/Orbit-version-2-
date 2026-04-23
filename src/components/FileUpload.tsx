'use client';

import { useState, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

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
  onUploaded: (doc: Document) => void;
}

const ACCEPT =
  '.txt,.pdf,.docx,image/jpeg,image/png,image/gif,image/webp,.ogg,.opus,.mp3,.m4a,.wav,.webm';

export default function FileUpload({ customerId, onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFile = (f: File) => {
    setFile(f);
    setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('customerId', customerId);
      formData.append('title', title || file.name);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const doc = await res.json();
      showToast('File uploaded successfully', 'success');
      onUploaded(doc);
      setFile(null);
      setTitle('');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card">
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-color)'}`,
            borderRadius: '0.75rem',
            padding: 'var(--space-xl) var(--space-lg)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            background: dragOver ? 'var(--accent-subtle)' : 'transparent',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>📁</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Drag & drop a file here, or <span style={{ color: 'var(--accent-primary)' }}>click to browse</span>
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Supports: TXT, PDF, DOCX, Images, Audio files
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <span style={{ fontSize: '2rem' }}>
              {file.type.startsWith('image/') ? '🖼️' : file.type.startsWith('audio/') ? '🎵' : '📄'}
            </span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500 }}>{file.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              className="btn-icon"
              onClick={() => {
                setFile(null);
                setTitle('');
              }}
            >
              &#x2715;
            </button>
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Title</label>
            <input
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
            />
          </div>

          <button
            className="btn btn-primary btn-sm"
            onClick={handleUpload}
            disabled={uploading}
            style={{ width: '100%' }}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      )}
    </div>
  );
}
