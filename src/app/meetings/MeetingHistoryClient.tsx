'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import styles from './meetings.module.css';
import { FathomMeeting, normalizeSummary } from '@/lib/fathom-types';
import AddMeetingModal, { AdhocMeeting } from '@/components/AddMeetingModal';
import MeetingIntelligenceCard from '@/components/MeetingIntelligenceCard';

// ── Types ─────────────────────────────────────────────────────────────────────

type MeetingEntry =
  | { type: 'fathom'; data: FathomMeeting }
  | { type: 'manual'; data: AdhocMeeting };

type UnifiedSearchResult =
  | { type: 'fathom'; meeting: FathomMeeting; matchType: string; excerpt: string }
  | { type: 'note'; id: string; title: string; excerpt: string; customerId: string; customerName: string }
  | { type: 'document'; id: string; title: string; excerpt: string; customerId: string; customerName: string }
  | { type: 'manual_meeting'; meeting: AdhocMeeting; excerpt: string };

interface FathomDetailState {
  meeting: FathomMeeting;
  summary: string | null;
  transcript: string | null;
  loading: boolean;
  transcriptLoading: boolean;
}

type Detail =
  | { type: 'fathom'; state: FathomDetailState }
  | { type: 'manual'; meeting: AdhocMeeting };

// ── Helpers ───────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className={styles.highlight}>{part}</mark>
      : part
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDuration(meeting: FathomMeeting): string | null {
  if (!meeting.recording_start_time || !meeting.recording_end_time) return null;
  const mins = Math.round(
    (new Date(meeting.recording_end_time).getTime() - new Date(meeting.recording_start_time).getTime()) / 60000
  );
  if (mins <= 0 || mins > 720) return null;
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function formatMins(mins: number): string {
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function getMeetingDate(entry: MeetingEntry): number {
  if (entry.type === 'fathom') {
    return entry.data.created_at ? new Date(entry.data.created_at).getTime() : 0;
  }
  return new Date(entry.data.date).getTime();
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MeetingHistoryClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [fathomMeetings, setFathomMeetings] = useState<FathomMeeting[]>([]);
  const [adhocMeetings, setAdhocMeetings] = useState<AdhocMeeting[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnifiedSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [addStatus, setAddStatus] = useState<Record<number, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Fathom + adhoc on mount
  useEffect(() => {
    fetchHistory(undefined, true);
    fetchAdhoc();
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || searchResults !== null) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchHistory(nextCursor, false);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, searchResults]);

  // Search debounce
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimer.current = setTimeout(() => runSearch(query.trim()), 500);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const fetchHistory = useCallback(async (cursor?: string, reset = false) => {
    if (reset) setInitialLoading(true);
    else setLoadingMore(true);
    try {
      const url = cursor ? `/api/meetings/history?cursor=${cursor}` : '/api/meetings/history';
      const res = await fetch(url);
      const data = await res.json();
      setFathomMeetings((prev) => reset ? data.items : [...prev, ...data.items]);
      setNextCursor(data.next_cursor || null);
    } catch {
      // ignore
    } finally {
      setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchAdhoc = async () => {
    try {
      const res = await fetch('/api/meetings/adhoc');
      const data = await res.json();
      setAdhocMeetings(data.meetings || []);
    } catch {
      // ignore
    }
  };

  const runSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(`/api/search/unified?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openFathomDetail = async (meeting: FathomMeeting) => {
    setDetail({ type: 'fathom', state: { meeting, summary: null, transcript: null, loading: true, transcriptLoading: false } });

    try {
      const res = await fetch(`/api/meetings/${meeting.recording_id}`);
      const data = await res.json();
      const summary = normalizeSummary(data.default_summary);
      setDetail({ type: 'fathom', state: { meeting: { ...meeting, ...data }, summary, transcript: null, loading: false, transcriptLoading: true } });

      fetch(`/api/meetings/${meeting.recording_id}?transcript=1`)
        .then((r) => r.json())
        .then((t) => {
          setDetail((prev) =>
            prev?.type === 'fathom' && prev.state.meeting.recording_id === meeting.recording_id
              ? { type: 'fathom', state: { ...prev.state, transcript: t.transcript || null, transcriptLoading: false } }
              : prev
          );
        })
        .catch(() => {
          setDetail((prev) =>
            prev?.type === 'fathom' && prev.state.meeting.recording_id === meeting.recording_id
              ? { type: 'fathom', state: { ...prev.state, transcriptLoading: false } }
              : prev
          );
        });
    } catch {
      setDetail((prev) => prev?.type === 'fathom' ? { type: 'fathom', state: { ...prev.state, loading: false, transcriptLoading: false } } : null);
    }
  };

  const addParticipants = async (meeting: FathomMeeting) => {
    const participants = (meeting.calendar_invitees || []).map((p) => ({ name: p.name, email: p.email }));
    if (!participants.length) return;
    setAddStatus((prev) => ({ ...prev, [meeting.recording_id]: 'loading' }));
    try {
      const res = await fetch('/api/meetings/add-participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants }),
      });
      const data = await res.json();
      const msg = [
        data.created?.length ? `Added: ${data.created.join(', ')}` : '',
        data.existing?.length ? `Already in People: ${data.existing.join(', ')}` : '',
        data.dealRoomsCreated?.length ? `Deal room created: ${data.dealRoomsCreated.join(', ')}` : '',
      ].filter(Boolean).join(' · ');
      setAddStatus((prev) => ({ ...prev, [meeting.recording_id]: msg || 'Done' }));
    } catch {
      setAddStatus((prev) => ({ ...prev, [meeting.recording_id]: 'Error — try again' }));
    }
  };

  // Merged + sorted list (newest first)
  const mergedMeetings: MeetingEntry[] = [
    ...fathomMeetings.map((m): MeetingEntry => ({ type: 'fathom', data: m })),
    ...adhocMeetings.map((m): MeetingEntry => ({ type: 'manual', data: m })),
  ].sort((a, b) => getMeetingDate(b) - getMeetingDate(a));

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meeting History</h1>
          <p className={styles.subtitle}>Fathom recordings & manually logged meetings · Welcome, {userName.split(' ')[0]}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Log Meeting
        </button>
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
            placeholder="Search meetings, notes, and documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className={styles.clearBtn} onClick={() => setQuery('')}>✕</button>
          )}
        </div>
        {searching && <p className={styles.searchingText}>Searching meetings, notes, and documents…</p>}
        {searchResults !== null && !searching && (
          <p className={styles.searchingText}>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{query}&quot;</p>
        )}
      </div>

      <div className={styles.layout}>
        {/* List */}
        <div className={styles.list}>
          {initialLoading && (
            <div className={styles.loadingWrap}>
              {[...Array(5)].map((_, i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}

          {/* ── Unified search results ── */}
          {searchResults !== null && !searching && searchResults.map((result, idx) => {
            if (result.type === 'fathom') {
              const m = result.meeting;
              const title = m.title || m.meeting_title || 'Untitled Meeting';
              const isActive = detail?.type === 'fathom' && detail.state.meeting.recording_id === m.recording_id;
              return (
                <div
                  key={`fathom-${m.recording_id}`}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  onClick={() => openFathomDetail(m)}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDate}>{m.created_at ? formatDate(m.created_at) : '—'}</span>
                      {formatDuration(m) && <span className={styles.cardDuration}>{formatDuration(m)}</span>}
                      <span className={styles.matchBadge} style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>Fathom · {result.matchType}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{highlight(title, query)}</h3>
                    {result.excerpt && <p className={styles.excerpt}>{highlight(result.excerpt, query)}</p>}
                  </div>
                </div>
              );
            }

            if (result.type === 'note') {
              return (
                <div
                  key={`note-${result.id}-${idx}`}
                  className={styles.card}
                  onClick={() => router.push(`/customers/${result.customerId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardMeta}>
                      <span className={styles.matchBadge} style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>Note</span>
                      <span className={styles.cardDate} style={{ marginLeft: 4 }}>Customer: {result.customerName}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{highlight(result.title, query)}</h3>
                    {result.excerpt && <p className={styles.excerpt}>{highlight(result.excerpt, query)}</p>}
                  </div>
                </div>
              );
            }

            if (result.type === 'document') {
              return (
                <div
                  key={`doc-${result.id}-${idx}`}
                  className={styles.card}
                  onClick={() => router.push(`/customers/${result.customerId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardMeta}>
                      <span className={styles.matchBadge} style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Document</span>
                      <span className={styles.cardDate} style={{ marginLeft: 4 }}>Customer: {result.customerName}</span>
                    </div>
                    <h3 className={styles.cardTitle}>{highlight(result.title, query)}</h3>
                    {result.excerpt && <p className={styles.excerpt}>{highlight(result.excerpt, query)}</p>}
                  </div>
                </div>
              );
            }

            if (result.type === 'manual_meeting') {
              const m = result.meeting;
              const isActive = detail?.type === 'manual' && detail.meeting.id === m.id;
              return (
                <div
                  key={`manual-${m.id}`}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  onClick={() => setDetail({ type: 'manual', meeting: m })}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDate}>{formatDate(m.date)}</span>
                      <span className={styles.matchBadge} style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>Manual</span>
                    </div>
                    <h3 className={styles.cardTitle}>{highlight(m.title, query)}</h3>
                    {m.customer && <span className={styles.cardDate}>{m.customer.name}</span>}
                    {result.excerpt && <p className={styles.excerpt}>{highlight(result.excerpt, query)}</p>}
                  </div>
                </div>
              );
            }

            return null;
          })}

          {searchResults !== null && !searching && searchResults.length === 0 && (
            <div className={styles.empty}>No results found for &quot;{query}&quot;</div>
          )}

          {/* ── Normal merged list ── */}
          {searchResults === null && !initialLoading && mergedMeetings.length === 0 && (
            <div className={styles.empty}>No meetings found.</div>
          )}

          {searchResults === null && mergedMeetings.map((entry) => {
            if (entry.type === 'fathom') {
              const meeting = entry.data;
              const title = meeting.title || meeting.meeting_title || 'Untitled Meeting';
              const date = meeting.created_at ? formatDate(meeting.created_at) : '—';
              const duration = formatDuration(meeting);
              const attendees = meeting.calendar_invitees || [];
              const isActive = detail?.type === 'fathom' && detail.state.meeting.recording_id === meeting.recording_id;

              return (
                <div
                  key={`fathom-${meeting.recording_id}`}
                  className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                  onClick={() => openFathomDetail(meeting)}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardMeta}>
                      <span className={styles.cardDate}>{date}</span>
                      {duration && <span className={styles.cardDuration}>{duration}</span>}
                      <span className={styles.matchBadge} style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}>Fathom</span>
                    </div>
                    <h3 className={styles.cardTitle}>{title}</h3>
                    {attendees.length > 0 && (
                      <div className={styles.attendees}>
                        {attendees.slice(0, 5).map((a) => (
                          <span key={a.email} className={styles.attendeeChip} title={a.email}>
                            {a.name || a.email.split('@')[0]}
                          </span>
                        ))}
                        {attendees.length > 5 && (
                          <span className={styles.attendeeChip}>+{attendees.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                    {meeting.share_url || meeting.url ? (
                      <a href={meeting.share_url || meeting.url} target="_blank" rel="noopener noreferrer" className={styles.actionLink}>
                        Fathom ↗
                      </a>
                    ) : null}
                    {attendees.length > 0 && (
                      <button
                        className={styles.addBtn}
                        onClick={() => addParticipants(meeting)}
                        disabled={addStatus[meeting.recording_id] === 'loading'}
                      >
                        + Add all to People
                      </button>
                    )}
                    {addStatus[meeting.recording_id] && addStatus[meeting.recording_id] !== 'loading' && (
                      <span className={styles.addMsg}>{addStatus[meeting.recording_id]}</span>
                    )}
                  </div>
                </div>
              );
            }

            // Manual meeting card
            const m = entry.data;
            const isActive = detail?.type === 'manual' && detail.meeting.id === m.id;
            return (
              <div
                key={`manual-${m.id}`}
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
                onClick={() => setDetail({ type: 'manual', meeting: m })}
              >
                <div className={styles.cardTop}>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>{formatDate(m.date)}</span>
                    {m.duration && <span className={styles.cardDuration}>{formatMins(m.duration)}</span>}
                    <span className={styles.matchBadge} style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>Manual</span>
                  </div>
                  <h3 className={styles.cardTitle}>{m.title}</h3>
                  {m.customer && (
                    <div className={styles.attendees}>
                      <span className={styles.attendeeChip}>{m.customer.name}</span>
                    </div>
                  )}
                  {m.attendees && (
                    <div className={styles.attendees}>
                      {m.attendees.split(',').map((a) => (
                        <span key={a.trim()} className={styles.attendeeChip}>{a.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Infinite scroll trigger (Fathom only) */}
          {searchResults === null && (
            <div ref={loaderRef} className={styles.loaderTrigger}>
              {loadingMore && <div className={styles.spinner} />}
              {!loadingMore && nextCursor && <span className={styles.loadMoreHint}>Scroll for more Fathom meetings</span>}
              {!nextCursor && fathomMeetings.length > 0 && (
                <span className={styles.endText}>— End of history —</span>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detail && (
          <div className={styles.detail}>
            {/* Fathom detail */}
            {detail.type === 'fathom' && (() => {
              const { state } = detail;
              return (
                <>
                  <div className={styles.detailHeader}>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.detailTitle}>
                        {state.meeting.title || state.meeting.meeting_title || 'Untitled Meeting'}
                      </h2>
                      <p className={styles.detailMeta}>
                        {state.meeting.created_at ? formatDate(state.meeting.created_at) : ''}
                        {formatDuration(state.meeting) ? ` · ${formatDuration(state.meeting)}` : ''}
                        {(state.meeting.calendar_invitees?.length || 0) > 0
                          ? ` · ${state.meeting.calendar_invitees!.length} attendees`
                          : ''}
                      </p>
                    </div>
                    <button className={styles.closeBtn} onClick={() => setDetail(null)}>✕</button>
                  </div>

                  {state.loading ? (
                    <div className={styles.detailLoading}>
                      <div className={styles.spinner} />
                      <p>Loading summary and transcript…</p>
                    </div>
                  ) : (
                    <div className={styles.detailBody}>
                      {(state.meeting.calendar_invitees?.length || 0) > 0 && (
                        <div className={styles.detailSection}>
                          <h4 className={styles.detailSectionTitle}>Attendees</h4>
                          <div className={styles.attendees}>
                            {state.meeting.calendar_invitees!.map((a) => (
                              <span key={a.email} className={styles.attendeeChip} title={a.email}>
                                {a.name || a.email}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {state.summary && (
                        <div className={styles.detailSection}>
                          <h4 className={styles.detailSectionTitle}>Summary</h4>
                          <div className={styles.markdownWrap}>
                            <ReactMarkdown>{state.summary}</ReactMarkdown>
                          </div>
                          <MeetingIntelligenceCard
                            meetingId={String(state.meeting.recording_id)}
                            fathomId={String(state.meeting.recording_id)}
                            title={state.meeting.title || state.meeting.meeting_title || 'Untitled Meeting'}
                            summary={state.summary}
                            transcript={state.transcript || undefined}
                          />
                        </div>
                      )}

                      {state.transcriptLoading ? (
                        <div className={styles.detailSection}>
                          <h4 className={styles.detailSectionTitle}>Transcript</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                            <div className={styles.spinner} style={{ width: 16, height: 16 }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Loading transcript…</span>
                          </div>
                        </div>
                      ) : state.transcript ? (
                        <div className={styles.detailSection}>
                          <h4 className={styles.detailSectionTitle}>Transcript</h4>
                          <pre className={styles.transcript}>
                            {query ? highlight(state.transcript, query) : state.transcript}
                          </pre>
                        </div>
                      ) : null}

                      {!state.summary && !state.transcriptLoading && !state.transcript && (
                        <p className={styles.processing}>This meeting is still processing. Try again in a few minutes.</p>
                      )}

                      {(state.meeting.share_url || state.meeting.url) && (
                        <a
                          href={state.meeting.share_url || state.meeting.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ marginTop: '1rem', display: 'inline-block' }}
                        >
                          Open in Fathom ↗
                        </a>
                      )}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Manual meeting detail */}
            {detail.type === 'manual' && (() => {
              const m = detail.meeting;
              return (
                <>
                  <div className={styles.detailHeader}>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.detailTitle}>{m.title}</h2>
                      <p className={styles.detailMeta}>
                        {formatDate(m.date)}
                        {m.duration ? ` · ${formatMins(m.duration)}` : ''}
                        {m.customer ? ` · ${m.customer.name}` : ''}
                      </p>
                    </div>
                    <button className={styles.closeBtn} onClick={() => setDetail(null)}>✕</button>
                  </div>
                  <div className={styles.detailBody}>
                    {m.attendees && (
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Attendees</h4>
                        <div className={styles.attendees}>
                          {m.attendees.split(',').map((a) => (
                            <span key={a.trim()} className={styles.attendeeChip}>{a.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.summary && (
                      <div className={styles.detailSection}>
                        <h4 className={styles.detailSectionTitle}>Notes</h4>
                        <pre className={styles.transcript} style={{ whiteSpace: 'pre-wrap' }}>{m.summary}</pre>
                      </div>
                    )}
                    {!m.summary && !m.attendees && (
                      <p className={styles.processing}>No notes recorded for this meeting.</p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddMeetingModal
          onClose={() => setShowAddModal(false)}
          onAdded={(newMeeting) => {
            setAdhocMeetings((prev) => [newMeeting, ...prev]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
