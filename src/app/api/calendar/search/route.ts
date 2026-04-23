import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';
import { fetchCalendarEventById } from '@/lib/calendar';
import type { CalendarEvent } from '@/lib/calendar-types';

const MAX_PAGES = 10;

function extractExcerpt(text: string, query: string, contextChars = 160): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - contextChars / 2);
  const end = Math.min(text.length, idx + query.length + contextChars / 2);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt += '...';
  return excerpt;
}

function matchesQuery(text: string | null | undefined, query: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

function mapRawEvent(event: {
  id?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  hangoutLink?: string | null;
  conferenceData?: { entryPoints?: Array<{ uri?: string | null }> | null } | null;
  description?: string | null;
  attendees?: Array<{ email?: string | null; displayName?: string | null; responseStatus?: string | null }> | null;
  organizer?: { email?: string | null } | null;
}): CalendarEvent {
  return {
    id: event.id || '',
    title: event.summary || 'Untitled Event',
    start: event.start?.dateTime || event.start?.date || '',
    end: event.end?.dateTime || event.end?.date || '',
    isAllDay: !event.start?.dateTime,
    meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
    description: event.description || null,
    attendees: (event.attendees || []).map((a) => ({
      email: a.email || '',
      displayName: a.displayName || null,
      responseStatus: (a.responseStatus as CalendarEvent['attendees'][number]['responseStatus']) || null,
    })),
    organizerEmail: event.organizer?.email || null,
  };
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const userId = authResult.userId!;

  // Get Google OAuth account — single session for all page fetches
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'google' },
  });

  if (!account?.access_token) {
    return NextResponse.json({ results: [] });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
          ...(tokens.expiry_date && { expires_at: Math.floor(tokens.expiry_date / 1000) }),
        },
      });
    }
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const results: Array<{
    event: CalendarEvent;
    matchType: 'title' | 'description' | 'transcript';
    excerpt: string;
    hasTranscript: boolean;
  }> = [];

  const matchedEventIds = new Set<string>();

  try {
    // Phase 1: Search event titles and descriptions — single OAuth session across all pages
    const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    let pageToken: string | undefined;
    let page = 0;

    while (page < MAX_PAGES) {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: 'startTime',
        ...(pageToken ? { pageToken } : {}),
      });

      const items = response.data.items || [];

      for (const item of items) {
        const event = mapRawEvent(item);
        if (!event.id) continue;

        if (matchesQuery(event.title, query)) {
          results.push({ event, matchType: 'title', excerpt: event.title, hasTranscript: false });
          matchedEventIds.add(event.id);
        } else if (matchesQuery(event.description, query)) {
          results.push({
            event,
            matchType: 'description',
            excerpt: extractExcerpt(event.description!, query),
            hasTranscript: false,
          });
          matchedEventIds.add(event.id);
        }
      }

      if (!response.data.nextPageToken) break;
      pageToken = response.data.nextPageToken;
      page++;
    }

    // Phase 2: Search transcript content stored in DB
    const transcriptMatches = await prisma.$queryRaw<{ eventId: string; content: string }[]>`
      SELECT "eventId", content FROM "CalendarTranscript"
      WHERE "userId" = ${userId} AND content ILIKE ${'%' + query + '%'}
    `;

    const newTranscriptEventIds = transcriptMatches
      .map((t: { eventId: string; content: string }) => t.eventId)
      .filter((id: string) => !matchedEventIds.has(id));

    const fetchedEvents = await Promise.all(
      newTranscriptEventIds.map((id: string) => fetchCalendarEventById(userId, id).catch(() => null))
    );

    for (let i = 0; i < newTranscriptEventIds.length; i++) {
      const event = fetchedEvents[i];
      if (!event) continue;
      const transcript = transcriptMatches.find((t: { eventId: string; content: string }) => t.eventId === event.id);
      results.push({
        event,
        matchType: 'transcript',
        excerpt: extractExcerpt(transcript!.content, query),
        hasTranscript: true,
      });
      matchedEventIds.add(event.id);
    }

    // Mark hasTranscript on all results
    const allMatchedIds = Array.from(matchedEventIds);
    const transcriptRows = allMatchedIds.length > 0
      ? await prisma.$queryRaw<{ eventId: string }[]>`
          SELECT "eventId" FROM "CalendarTranscript"
          WHERE "userId" = ${userId} AND "eventId" = ANY(${allMatchedIds})
        `
      : [];
    const transcriptEventIds = new Set(transcriptRows.map((t) => t.eventId));

    const finalResults = results.map((r) => ({
      ...r,
      hasTranscript: transcriptEventIds.has(r.event.id),
    }));

    return NextResponse.json({ results: finalResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Calendar Search] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
