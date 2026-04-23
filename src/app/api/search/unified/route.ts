import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';
import { fetchFathomCalls, fetchRecordingDetails, fetchTranscript } from '@/lib/fathom';
import { normalizeSummary, FathomMeeting } from '@/lib/fathom-types';

const MAX_FATHOM_PAGES = 4;

function extractExcerpt(text: string, query: string, contextChars = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 160);
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

function matches(text: string | null | undefined, q: string): boolean {
  return !!text && text.toLowerCase().includes(q.toLowerCase());
}

async function searchFathom(q: string, userId: string) {
  const results: Array<{ type: 'fathom'; meeting: FathomMeeting; matchType: string; excerpt: string }> = [];
  let cursor: string | undefined;
  let page = 0;

  while (page < MAX_FATHOM_PAGES) {
    const response = await fetchFathomCalls(cursor, userId);
    const meetings = response.items.filter(
      (m) => m.title !== 'Fathom Demo' && m.meeting_title !== 'Fathom Demo'
    );

    const needsContent: FathomMeeting[] = [];

    for (const meeting of meetings) {
      const title = meeting.title || meeting.meeting_title || '';
      const attendeeText = (meeting.calendar_invitees || []).map((a) => `${a.name || ''} ${a.email || ''}`).join(' ');

      if (matches(title, q)) {
        results.push({ type: 'fathom', meeting, matchType: 'title', excerpt: title });
        continue;
      }
      if (matches(attendeeText, q)) {
        const hit = (meeting.calendar_invitees || []).find((a) => matches(a.name, q) || matches(a.email, q));
        results.push({ type: 'fathom', meeting, matchType: 'attendee', excerpt: hit ? `${hit.name} (${hit.email})` : attendeeText });
        continue;
      }
      needsContent.push(meeting);
    }

    if (needsContent.length > 0) {
      const [detailsArr, transcriptArr] = await Promise.all([
        Promise.all(needsContent.map((m) => fetchRecordingDetails(m.recording_id, userId).catch(() => null))),
        Promise.all(needsContent.map((m) => fetchTranscript(m.recording_id, userId).catch(() => null))),
      ]);

      for (let i = 0; i < needsContent.length; i++) {
        const meeting = needsContent[i];
        const summary = normalizeSummary(detailsArr[i]?.default_summary ?? null);
        if (summary && matches(summary, q)) {
          results.push({ type: 'fathom', meeting, matchType: 'summary', excerpt: extractExcerpt(summary, q) });
          continue;
        }
        const transcriptStr = transcriptArr[i] || transcriptToString(detailsArr[i]?.transcript ?? null);
        if (transcriptStr && matches(transcriptStr, q)) {
          results.push({ type: 'fathom', meeting, matchType: 'transcript', excerpt: extractExcerpt(transcriptStr, q) });
        }
      }
    }

    if (!response.next_cursor) break;
    cursor = response.next_cursor;
    page++;
  }

  return results;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const ilike = { contains: q, mode: 'insensitive' as const };

  // Run Fathom search and DB searches in parallel
  const [fathomResults, notes, documents, manualMeetings] = await Promise.all([
    searchFathom(q, authResult.userId!).catch(() => []),

    prisma.note.findMany({
      where: { OR: [{ title: ilike }, { content: ilike }] },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    prisma.document.findMany({
      where: { OR: [{ title: ilike }, { transcription: ilike }] },
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),

    prisma.meetingSummary.findMany({
      where: {
        fathomId: null,
        OR: [{ title: ilike }, { summary: ilike }, { attendees: ilike }],
      },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 20,
    }),
  ]);

  const noteResults = notes.map((n) => ({
    type: 'note' as const,
    id: n.id,
    title: n.title,
    excerpt: extractExcerpt(n.content, q),
    customerId: n.customerId,
    customerName: n.customer?.name || '',
  }));

  const documentResults = documents.map((d) => ({
    type: 'document' as const,
    id: d.id,
    title: d.title,
    excerpt: d.transcription ? extractExcerpt(d.transcription, q) : '',
    customerId: d.customerId,
    customerName: d.customer?.name || '',
  }));

  const manualMeetingResults = manualMeetings.map((m) => ({
    type: 'manual_meeting' as const,
    meeting: {
      id: m.id,
      title: m.title,
      date: m.date.toISOString(),
      duration: m.duration,
      attendees: m.attendees,
      summary: m.summary,
      customerId: m.customerId,
      userId: m.userId,
      customer: m.customer,
      user: m.user,
    },
    excerpt: m.summary ? extractExcerpt(m.summary, q) : '',
  }));

  const results = [
    ...fathomResults,
    ...manualMeetingResults,
    ...noteResults,
    ...documentResults,
  ];

  return NextResponse.json({ results });
}
