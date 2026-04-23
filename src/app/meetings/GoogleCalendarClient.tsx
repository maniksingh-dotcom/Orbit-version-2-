'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './meetings.module.css';
import { useToast } from '@/contexts/ToastContext';
import type { CalendarEvent } from '@/lib/calendar-types';

interface SearchResult {
  event: CalendarEvent;
  matchType: 'title' | 'description' | 'transcript';
  excerpt: string;
  hasTranscript: boolean;
}

interface TranscriptData {
  content: string;
  fileName: string | null;
}

interface Attachment {
  id: string;
  eventId: string;
  publicUrl: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  createdAt: string;
  extracting?: boolean;
}

interface DetailState {
  event: CalendarEvent;
  transcript: TranscriptData | null;
  transcriptLoading: boolean;
  showUploadForm: boolean;
  uploadText: string;
  uploadFileName: string | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  attachments: Attachment[];
  attachmentsLoading: boolean;
  uploadingFile: boolean;
  uploadFileError: string | null;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={styles.highlight}>{part}</mark>
      : part
  );
}

function formatEventDate(isoString: string, isAllDay: boolean): string {
  if (!isoString) return '—';
  const d = isAllDay
    ? new Date(isoString + (isoString.length === 10 ? 'T00:00:00' : ''))
    : new Date(isoString);
  return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatEventTime(isoString: string): string {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatEventDuration(start: string, end: string, isAllDay: boolean): string | null {
  if (isAllDay) return 'All day';
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins <= 0 || mins > 1440) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

const STATUS_COLORS: Record<string, string> = {
  accepted: '#22c55e',
  declined: '#ef4444',
  tentative: '#f59e0b',
  needsAction: '#6b7280',
};

export default function GoogleCalendarClient({ userName }: { userName: string }) {
  const { showToast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(query.trim()), 500);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const fetchEvents = useCallback(async () => {
    setInitialLoading(true);
    try {
      const res = await fetch('/api/calendar/events');
      const data = await res.json();
      // Server returns pre-sorted descending list; no client-side sort needed
      setEvents(data.events || []);
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
    }
  }, []);

  const runSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/calendar/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openDetail = async (event: CalendarEvent) => {
    setDetail({
      event,
      transcript: null,
      transcriptLoading: true,
      showUploadForm: false,
      uploadText: '',
      uploadFileName: null,
      saving: false,
      saveError: null,
      saveSuccess: false,
      attachments: [],
      attachmentsLoading: true,
      uploadingFile: false,
      uploadFileError: null,
    });

    // Fetch transcript and attachments in parallel
    const [transcriptRes, attachmentsRes] = await Promise.allSettled([
      fetch(`/api/calendar/transcript?eventId=${encodeURIComponent(event.id)}`).then((r) => r.json()),
      fetch(`/api/calendar/attachments?eventId=${encodeURIComponent(event.id)}`).then((r) => r.json()),
    ]);

    setDetail((prev) => {
      if (!prev || prev.event.id !== event.id) return prev;
      return {
        ...prev,
        transcript:
          transcriptRes.status === 'fulfilled' && transcriptRes.value.transcript
            ? { content: transcriptRes.value.transcript.content, fileName: transcriptRes.value.transcript.fileName }
            : null,
        transcriptLoading: false,
        attachments:
          attachmentsRes.status === 'fulfilled' ? (attachmentsRes.value.attachments || []) : [],
        attachmentsLoading: false,
      };
    });
  };

  const saveTranscript = async () => {
    if (!detail || !detail.uploadText.trim()) return;
    setDetail((prev) => prev ? { ...prev, saving: true, saveError: null, saveSuccess: false } : null);
    try {
      const res = await fetch('/api/calendar/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: detail.event.id,
          content: detail.uploadText.trim(),
          fileName: detail.uploadFileName,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              transcript: { content: data.transcript.content, fileName: data.transcript.fileName },
              showUploadForm: false,
              uploadText: '',
              uploadFileName: null,
              saving: false,
              saveSuccess: true,
            }
          : null
      );
    } catch {
      setDetail((prev) => prev ? { ...prev, saving: false, saveError: 'Failed to save transcript.' } : null);
    }
  };

  const handleTextFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setDetail((prev) => prev ? { ...prev, uploadText: text, uploadFileName: file.name } : null);
    };
    reader.readAsText(file);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detail) return;
    // Reset input so same file can be re-uploaded
    e.target.value = '';

    setDetail((prev) => prev ? { ...prev, uploadingFile: true, uploadFileError: null } : null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('eventId', detail.event.id);
      const res = await fetch('/api/calendar/attachments', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDetail((prev) =>
        prev ? { ...prev, uploadingFile: false, attachments: [...prev.attachments, data.attachment] } : null
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setDetail((prev) => prev ? { ...prev, uploadingFile: false, uploadFileError: msg } : null);
    }
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!detail) return;
    try {
      await fetch(`/api/calendar/attachments?id=${encodeURIComponent(attachmentId)}`, { method: 'DELETE' });
      setDetail((prev) =>
        prev ? { ...prev, attachments: prev.attachments.filter((a) => a.id !== attachmentId) } : null
      );
    } catch {
      // ignore
    }
  };

  const extractPdfText = async (attachmentId: string) => {
    if (!detail) return;
    // Mark as extracting
    setDetail((prev) =>
      prev ? { ...prev, attachments: prev.attachments.map((a) => a.id === attachmentId ? { ...a, extracting: true } : a) } : null
    );
    try {
      const res = await fetch('/api/calendar/attachments/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Extraction failed');
      }
      // Refresh transcript
      const tRes = await fetch(`/api/calendar/transcript?eventId=${encodeURIComponent(detail.event.id)}`);
      const tData = await tRes.json();
      setDetail((prev) =>
        prev ? {
          ...prev,
          transcript: tData.transcript ? { content: tData.transcript.content, fileName: tData.transcript.fileName } : prev.transcript,
          attachments: prev.attachments.map((a) => a.id === attachmentId ? { ...a, extracting: false } : a),
        } : null
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PDF extraction failed';
      showToast(msg, 'error');
      setDetail((prev) =>
        prev ? { ...prev, attachments: prev.attachments.map((a) => a.id === attachmentId ? { ...a, extracting: false } : a) } : null
      );
    }
  };

  const displayEvents = searchResults !== null
    ? searchResults.map((r) => r.event)
    : events;

  return (
    <div className={styles.page}>
      {/* Lightbox */}
      {lightboxUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <img
            src={lightboxUrl}
            alt="Preview"
            className={styles.lightboxImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Google Calendar</h1>
          <p className={styles.subtitle}>All events synced via Google OAuth · Welcome, {userName.split(' ')[0]}</p>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchWrap}>
        <div className={styles.searchBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.searchIcon}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            suppressHydrationWarning
            className={styles.searchInput}
            type="text"
            placeholder="Search by event name, description, or transcript…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>
        {searching && <p className={styles.searchingText}>Searching events and transcripts…</p>}
        {searchResults !== null && !searching && (
          <p className={styles.searchingText}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{query}&quot;</p>
        )}
      </div>

      <div className={styles.layout}>
        {/* Event List */}
        <div className={styles.list}>
          {initialLoading && (
            <div className={styles.loadingWrap}>
              {[...Array(5)].map((_, i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}

          {!initialLoading && displayEvents.length === 0 && (
            <div className={styles.empty}>
              {searchResults !== null ? 'No events match your search.' : 'No calendar events found.'}
            </div>
          )}

          {displayEvents.map((event) => {
            const isPast = new Date(event.end) < new Date();
            const isActive = detail?.event.id === event.id;
            const searchResult = searchResults?.find((r) => r.event.id === event.id);
            const duration = formatEventDuration(event.start, event.end, event.isAllDay);
            const dateStr = formatEventDate(event.start, event.isAllDay);
            const timeStr = event.isAllDay ? null : formatEventTime(event.start);

            return (
              <div
                key={event.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => openDetail(event)}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>{dateStr}{timeStr ? ` · ${timeStr}` : ''}</span>
                    {duration && <span className={styles.cardDuration}>{duration}</span>}
                    <span className={isPast ? styles.cardBadgePast : styles.cardBadgeUpcoming}>
                      {isPast ? 'past' : 'upcoming'}
                    </span>
                    {searchResult && (
                      <span className={styles.matchBadge}>{searchResult.matchType}</span>
                    )}
                    {(searchResult?.hasTranscript || (!searchResult && detail?.event.id === event.id && detail.transcript)) && (
                      <span className={styles.hasTranscriptChip}>transcript</span>
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>
                    {query ? highlight(event.title, query) : event.title}
                  </h3>
                  {event.attendees.length > 0 && (
                    <div className={styles.attendees}>
                      {event.attendees.slice(0, 5).map((a) => (
                        <span key={a.email} className={styles.attendeeChip} title={a.email}>
                          {a.displayName || a.email.split('@')[0]}
                        </span>
                      ))}
                      {event.attendees.length > 5 && (
                        <span className={styles.attendeeChip}>+{event.attendees.length - 5}</span>
                      )}
                    </div>
                  )}
                  {searchResult?.excerpt && (
                    <p className={styles.excerpt}>
                      {highlight(searchResult.excerpt, query)}
                    </p>
                  )}
                </div>

                <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                  {event.meetLink && (
                    <a
                      href={event.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.actionLink}
                    >
                      Join ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {searchResults === null && events.length > 0 && (
            <div className={styles.loaderTrigger}>
              <span className={styles.endText}>— End of calendar —</span>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detail && (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <div style={{ flex: 1 }}>
                <h2 className={styles.detailTitle}>{detail.event.title}</h2>
                <p className={styles.detailMeta}>
                  {formatEventDate(detail.event.start, detail.event.isAllDay)}
                  {!detail.event.isAllDay && ` · ${formatEventTime(detail.event.start)} – ${formatEventTime(detail.event.end)}`}
                  {formatEventDuration(detail.event.start, detail.event.end, detail.event.isAllDay)
                    ? ` · ${formatEventDuration(detail.event.start, detail.event.end, detail.event.isAllDay)}`
                    : ''}
                </p>
              </div>
              <button className={styles.closeBtn} onClick={() => setDetail(null)}>✕</button>
            </div>

            <div className={styles.detailBody}>
              {/* Attendees */}
              {detail.event.attendees.length > 0 && (
                <div className={styles.detailSection}>
                  <h4 className={styles.detailSectionTitle}>Attendees</h4>
                  <div className={styles.attendees}>
                    {detail.event.attendees.map((a) => (
                      <span
                        key={a.email}
                        className={styles.attendeeChip}
                        title={`${a.email}${a.responseStatus ? ` · ${a.responseStatus}` : ''}`}
                      >
                        <span
                          className={styles.attendeeStatus}
                          style={{ background: STATUS_COLORS[a.responseStatus || ''] || '#6b7280' }}
                        />
                        {a.displayName || a.email.split('@')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {detail.event.description && (
                <div className={styles.detailSection}>
                  <h4 className={styles.detailSectionTitle}>Description</h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {query ? highlight(detail.event.description, query) : detail.event.description}
                  </p>
                </div>
              )}

              {/* Meet link */}
              {detail.event.meetLink && (
                <a
                  href={detail.event.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-block' }}
                >
                  Join Google Meet ↗
                </a>
              )}

              {/* Attachments section */}
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Photos &amp; Files</h4>

                {detail.attachmentsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={styles.spinner} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading…</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.attachmentGrid}>
                      {detail.attachments.map((att) => (
                        <div key={att.id} className={styles.attachmentItem}>
                          {att.fileType === 'image' ? (
                            <img
                              src={att.publicUrl}
                              alt={att.fileName}
                              className={styles.attachmentThumb}
                              onClick={() => setLightboxUrl(att.publicUrl)}
                            />
                          ) : (
                            <>
                              <a
                                href={att.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.attachmentPdf}
                                title={att.fileName}
                              >
                                <span className={styles.attachmentPdfIcon}>📄</span>
                                <span className={styles.attachmentName}>{att.fileName}</span>
                              </a>
                              <button
                                className={styles.addBtn}
                                style={{ fontSize: '0.68rem', padding: '2px 6px', marginTop: '4px', width: '100%' }}
                                onClick={(e) => { e.stopPropagation(); extractPdfText(att.id); }}
                                disabled={att.extracting}
                                title="Extract text from PDF so it becomes searchable"
                              >
                                {att.extracting ? 'Extracting…' : '🔍 Make searchable'}
                              </button>
                            </>
                          )}
                          {att.fileType === 'image' && (
                            <div className={styles.attachmentName}>{att.fileName}</div>
                          )}
                          <button
                            className={styles.attachmentDeleteBtn}
                            title="Remove"
                            onClick={(e) => { e.stopPropagation(); deleteAttachment(att.id); }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* Add button */}
                      <label className={styles.addAttachmentBtn} title="Add photo or PDF">
                        {detail.uploadingFile ? (
                          <div className={styles.spinner} style={{ width: 18, height: 18 }} />
                        ) : (
                          <>
                            <span>+</span>
                            <span className={styles.addAttachmentLabel}>Add file</span>
                          </>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                          style={{ display: 'none' }}
                          disabled={detail.uploadingFile}
                          onChange={handleAttachmentUpload}
                        />
                      </label>
                    </div>

                    {detail.uploadFileError && (
                      <p style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.25rem' }}>
                        {detail.uploadFileError}
                      </p>
                    )}
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                      Supports JPEG, PNG, GIF, WebP, PDF · Max 10 MB
                    </p>
                  </>
                )}
              </div>

              {/* Transcript section */}
              <div className={styles.detailSection}>
                <h4 className={styles.detailSectionTitle}>Transcript</h4>

                {detail.transcriptLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className={styles.spinner} style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading…</span>
                  </div>
                ) : detail.transcript ? (
                  <>
                    <pre className={styles.transcript}>
                      {query ? highlight(detail.transcript.content, query) : detail.transcript.content}
                    </pre>
                    {detail.transcript.fileName && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        File: {detail.transcript.fileName}
                      </p>
                    )}
                    <button
                      className={styles.uploadTranscriptBtn}
                      style={{ marginTop: '0.5rem' }}
                      onClick={() => setDetail((prev) => prev ? { ...prev, showUploadForm: !prev.showUploadForm, uploadText: prev.transcript?.content || '', saveSuccess: false } : null)}
                    >
                      {detail.showUploadForm ? 'Cancel edit' : 'Edit transcript'}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No transcript uploaded yet.{' '}
                    <button
                      className={styles.uploadTranscriptBtn}
                      onClick={() => setDetail((prev) => prev ? { ...prev, showUploadForm: true, saveSuccess: false } : null)}
                    >
                      Upload transcript
                    </button>
                  </p>
                )}

                {detail.showUploadForm && !detail.transcriptLoading && (
                  <div className={styles.uploadForm} style={{ marginTop: '0.75rem' }}>
                    <label className={styles.uploadLabel}>Paste transcript text or upload a .txt file</label>
                    <textarea
                      className={styles.uploadTextarea}
                      placeholder="Paste transcript content here…"
                      value={detail.uploadText}
                      onChange={(e) => setDetail((prev) => prev ? { ...prev, uploadText: e.target.value } : null)}
                    />
                    <input
                      type="file"
                      accept=".txt"
                      className={styles.uploadFileInput}
                      onChange={handleTextFileUpload}
                    />
                    <div className={styles.uploadActions}>
                      <button
                        className={styles.saveBtn}
                        disabled={detail.saving || !detail.uploadText.trim()}
                        onClick={saveTranscript}
                      >
                        {detail.saving ? 'Saving…' : 'Save transcript'}
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setDetail((prev) => prev ? { ...prev, showUploadForm: false, uploadText: '', uploadFileName: null, saveError: null } : null)}
                      >
                        Cancel
                      </button>
                      {detail.saveError && <span className={styles.uploadError}>{detail.saveError}</span>}
                      {detail.saveSuccess && <span className={styles.uploadSuccess}>Saved!</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
