import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { fetchFathomCalls, fetchRecordingDetails, fetchTranscript } from '@/lib/fathom';
import { normalizeSummary, FathomMeeting } from '@/lib/fathom-types';

const MAX_PAGES = 8;

function extractExcerpt(text: string, query: string, contextChars = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - contextChars / 2);
  const end = Math.min(text.length, idx + query.length + contextChars / 2);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  return excerpt;
}

function transcriptToString(raw: unknown): string | null {
  const segsToStr = (segs: Array<Record<string, unknown>>): string =>
    segs.map((seg) => {
      const spk = seg.speaker;
      const speaker = typeof spk === 'string' ? spk
        : spk && typeof spk === 'object' ? ((spk as Record<string, unknown>).name as string || '')
        : '';
      return speaker ? `${speaker}: ${String(seg.text || '')}` : String(seg.text || '');
    }).join('\n');
  if (Array.isArray(raw)) return segsToStr(raw);
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.items)) return segsToStr(r.items as Array<Record<string, unknown>>);
    if (Array.isArray(r.transcript)) return segsToStr(r.transcript as Array<Record<string, unknown>>);
    if (typeof r.transcript === 'string') return r.transcript;
  }
  return null;
}

function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: Array<{
    meeting: FathomMeeting;
    matchType: 'title' | 'attendee' | 'summary' | 'transcript';
    excerpt: string;
  }> = [];

  try {
    let cursor: string | undefined;
    let page = 0;

    while (page < MAX_PAGES) {
      const response = await fetchFathomCalls(cursor, authResult.userId!);
      const meetings = response.items.filter(
        (m) => m.title !== 'Fathom Demo' && m.meeting_title !== 'Fathom Demo'
      );

      // Step 1: fast pass — check title + attendees (no extra API calls)
      const needsContentSearch: FathomMeeting[] = [];

      for (const meeting of meetings) {
        const title = meeting.title || meeting.meeting_title || '';
        const attendeeText = (meeting.calendar_invitees || [])
          .map((a) => `${a.name || ''} ${a.email || ''}`)
          .join(' ');

        if (matchesQuery(title, query)) {
          results.push({ meeting, matchType: 'title', excerpt: title });
          continue;
        }

        if (matchesQuery(attendeeText, query)) {
          const matched = (meeting.calendar_invitees || []).find(
            (a) => matchesQuery(a.name, query) || matchesQuery(a.email, query)
          );
          results.push({
            meeting,
            matchType: 'attendee',
            excerpt: matched ? `${matched.name} (${matched.email})` : attendeeText,
          });
          continue;
        }

        needsContentSearch.push(meeting);
      }

      // Step 2: content search — fetch recording details + transcript in parallel for unmatched meetings
      if (needsContentSearch.length > 0) {
        const [detailsArr, transcriptArr] = await Promise.all([
          Promise.all(
            needsContentSearch.map((m) =>
              fetchRecordingDetails(m.recording_id, authResult.userId!).catch(() => null)
            )
          ),
          Promise.all(
            needsContentSearch.map((m) =>
              fetchTranscript(m.recording_id, authResult.userId!).catch(() => null)
            )
          ),
        ]);

        for (let i = 0; i < needsContentSearch.length; i++) {
          const meeting = needsContentSearch[i];
          const details = detailsArr[i];
          const summary = normalizeSummary(details?.default_summary ?? null);

          if (summary && matchesQuery(summary, query)) {
            results.push({
              meeting,
              matchType: 'summary',
              excerpt: extractExcerpt(summary, query),
            });
            continue;
          }

          // Fathom OAuth requires separate /transcript endpoint — details.transcript is always null for OAuth users
          const transcriptStr = transcriptArr[i] || transcriptToString(details?.transcript ?? null);
          if (transcriptStr && matchesQuery(transcriptStr, query)) {
            results.push({
              meeting,
              matchType: 'transcript',
              excerpt: extractExcerpt(transcriptStr, query),
            });
          }
        }
      }

      if (!response.next_cursor) break;
      cursor = response.next_cursor;
      page++;
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
