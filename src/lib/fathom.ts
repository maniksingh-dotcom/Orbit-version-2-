import { prisma } from '@/lib/prisma';
export type { FathomMeeting } from '@/lib/fathom-types';
export { normalizeSummary } from '@/lib/fathom-types';
import type { FathomMeeting } from '@/lib/fathom-types';
import { normalizeSummary } from '@/lib/fathom-types';

const FATHOM_BASE_URL = 'https://api.fathom.ai/external/v1';

export interface FathomListResponse {
  items: FathomMeeting[];
  next_cursor: string | null;
  limit: number;
}

// Helper to get headers for API calls - supports both OAuth and API key
async function getHeaders(userId?: string): Promise<Record<string, string>> {
  // If userId is provided, try to use their OAuth token first
  if (userId) {
    const fathomAccount = await prisma.fathomAccount.findUnique({
      where: { userId },
    });

    if (fathomAccount) {
      // Check if token is expired
      if (fathomAccount.expiresAt && fathomAccount.expiresAt < new Date()) {
        // Token expired - attempt refresh if refresh token exists
        if (fathomAccount.refreshToken) {
          const refreshed = await refreshFathomToken(userId, fathomAccount.refreshToken);
          if (refreshed) {
            return {
              'Authorization': `Bearer ${refreshed.accessToken}`,
            };
          }
        }
        // If refresh failed or no refresh token, fall back to API key
      } else {
        // Valid token exists
        return {
          'Authorization': `Bearer ${fathomAccount.accessToken}`,
        };
      }
    }
  }

  // Fallback to API key (for backward compatibility or if OAuth not set up)
  const apiKey = process.env.FATHOM_API_KEY;
  if (!apiKey) throw new Error('FATHOM_API_KEY not configured and no user OAuth token available');
  return {
    'X-Api-Key': apiKey,
  };
}

// Refresh Fathom OAuth token
async function refreshFathomToken(userId: string, refreshToken: string): Promise<{ accessToken: string } | null> {
  try {
    const response = await fetch('https://fathom.video/external/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.FATHOM_OAUTH_CLIENT_ID!,
        client_secret: process.env.FATHOM_OAUTH_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Fathom token:', await response.text());
      return null;
    }

    const tokenData = await response.json();
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    // Update stored token
    await prisma.fathomAccount.update({
      where: { userId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt,
      },
    });

    return { accessToken: tokenData.access_token };
  } catch (error) {
    console.error('Error refreshing Fathom token:', error);
    return null;
  }
}

export async function fetchFathomCalls(cursor?: string, userId?: string): Promise<FathomListResponse> {
  const url = new URL(`${FATHOM_BASE_URL}/meetings`);

  // Check if we're using OAuth (userId provided and has OAuth token)
  let isUsingOAuth = false;
  if (userId) {
    const fathomAccount = await prisma.fathomAccount.findUnique({
      where: { userId },
      select: { id: true },
    });
    isUsingOAuth = !!fathomAccount;
  }

  // OAuth users cannot request summary/transcript in /meetings endpoint
  // They must use /recordings endpoint instead
  if (!isUsingOAuth) {
    url.searchParams.set('include_summary', 'true');
    url.searchParams.set('include_action_items', 'true');
  }

  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetch(url.toString(), {
    headers: await getHeaders(userId),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fathom API error ${response.status}: ${text}`);
  }

  return response.json();
}

export async function fetchUpcomingMeeting(customerEmail?: string | null, userId?: string): Promise<FathomMeeting | null> {
  try {
    const url = new URL(`${FATHOM_BASE_URL}/meetings`);
    const response = await fetch(url.toString(), {
      headers: await getHeaders(userId),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data: FathomListResponse = await response.json();
    const now = new Date();

    let upcoming = data.items
      .filter((m) => m.scheduled_start_time && new Date(m.scheduled_start_time) > now);

    if (customerEmail) {
      upcoming = upcoming.filter((m) =>
        m.calendar_invitees?.some(
          (inv) => inv.email.toLowerCase() === customerEmail.toLowerCase()
        )
      );
    }

    upcoming.sort((a, b) =>
      new Date(a.scheduled_start_time!).getTime() - new Date(b.scheduled_start_time!).getTime()
    );

    return upcoming[0] || null;
  } catch {
    return null;
  }
}

export async function fetchRecentCompletedMeeting(customerEmail?: string | null, userId?: string): Promise<FathomMeeting | null> {
  try {
    const url = new URL(`${FATHOM_BASE_URL}/meetings`);
    url.searchParams.set('include_summary', 'true');
    url.searchParams.set('include_action_items', 'true');
    const response = await fetch(url.toString(), {
      headers: await getHeaders(userId),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data: FathomListResponse = await response.json();
    const now = new Date();

    let completed = data.items
      .filter((m) => m.recording_end_time || (m.created_at && new Date(m.created_at) < now));

    if (customerEmail) {
      completed = completed.filter((m) =>
        m.calendar_invitees?.some(
          (inv) => inv.email.toLowerCase() === customerEmail.toLowerCase()
        )
      );
    }

    completed.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return completed[0] || null;
  } catch {
    return null;
  }
}

// Fetch recording details with summary and transcript for OAuth users
export async function fetchRecordingDetails(recordingId: number, userId?: string): Promise<Partial<FathomMeeting> | null> {
  try {
    const url = new URL(`${FATHOM_BASE_URL}/recordings/${recordingId}`);
    // Request summary, transcript, and action items
    url.searchParams.set('include_summary', 'true');
    url.searchParams.set('include_transcript', 'true');
    url.searchParams.set('include_action_items', 'true');

    const response = await fetch(url.toString(), {
      headers: await getHeaders(userId),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch recording ${recordingId}:`, response.status, await response.text());
      return null;
    }

    const data = await response.json();
    console.log(`[Fathom] Fetched recording ${recordingId} with summary:`, !!data.default_summary, 'transcript:', !!data.transcript);
    return data;
  } catch (error) {
    console.error(`Error fetching recording ${recordingId}:`, error);
    return null;
  }
}

export async function fetchTranscript(recordingId: number, userId?: string): Promise<string | null> {
  try {
    const url = `${FATHOM_BASE_URL}/recordings/${recordingId}/transcript`;
    const response = await fetch(url, {
      headers: await getHeaders(userId),
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Helper to convert a segments array to a plain string
    const segmentsToString = (segs: Array<{ speaker?: unknown; text?: string }>): string =>
      segs.map((seg) => {
        const spk = seg.speaker;
        const speakerStr = typeof spk === 'string' ? spk
          : spk && typeof spk === 'object' ? ((spk as Record<string, unknown>).name as string || '')
          : '';
        return speakerStr ? `${speakerStr}: ${seg.text || ''}` : (seg.text || '');
      }).join('\n');

    // Fathom returns transcript as array of segments at top level
    if (Array.isArray(data)) return segmentsToString(data);

    // Or as { transcript: [...] }
    if (Array.isArray(data?.transcript)) return segmentsToString(data.transcript);

    // Or as { items: [...] }
    if (Array.isArray(data?.items)) return segmentsToString(data.items);

    if (typeof data === 'string') return data;
    if (typeof data?.transcript === 'string') return data.transcript;
    return null;
  } catch {
    return null;
  }
}

// Helper: check if action_items has real content (not null, not empty array, not empty string)
function hasActionItems(items: string | unknown[] | null | undefined): string | null {
  if (!items) return null;
  if (Array.isArray(items)) {
    if (items.length === 0) return null;
    const lines = items.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = obj.text ?? obj.title ?? obj.description ?? obj.name ?? obj.content;
        if (typeof text === 'string' && text.trim()) return text.trim();
        return null; // skip — don't render [object Object]
      }
      return String(item);
    }).filter(Boolean) as string[];
    return lines.length > 0 ? lines.join('\n') : null;
  }
  if (typeof items === 'string' && items.trim()) return items;
  return null;
}

// Helper: format meeting metadata line
function buildMetaLine(meeting: FathomMeeting, currentUser?: { name?: string | null }): string {
  const meta: string[] = [];
  // Meeting date
  const dateStr = meeting.created_at
    ? new Date(meeting.created_at).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  if (dateStr) meta.push(`Date: ${dateStr}`);
  // Duration
  if (meeting.recording_start_time && meeting.recording_end_time) {
    const rawMins = Math.round(
      (new Date(meeting.recording_end_time).getTime() - new Date(meeting.recording_start_time).getTime()) / 60000
    );
    if (rawMins > 0 && rawMins <= 720) {
      const durationStr = rawMins >= 60 ? `${Math.floor(rawMins / 60)}h ${rawMins % 60}min` : `${rawMins} min`;
      meta.push(`Duration: ${durationStr}`);
    }
  }
  // Attendees
  if (meeting.calendar_invitees?.length) {
    const names = meeting.calendar_invitees.map(a => {
      let n = a.name || a.email;
      if (currentUser?.name && (n.toLowerCase().includes('ai team') || n.toLowerCase().includes('bot') || n.toLowerCase() === 'fathom ai')) {
        return currentUser.name;
      }
      return n;
    }).join(', ');
    meta.push(`Attendees (${meeting.calendar_invitees.length}): ${names}`);
  }
  // Recorded by
  if (meeting.recorded_by?.name) {
    let recorder = meeting.recorded_by.name;
    if (currentUser?.name && (recorder.toLowerCase().includes('ai team') || recorder.toLowerCase().includes('bot') || recorder.toLowerCase() === 'fathom ai')) {
      recorder = currentUser.name;
    }
    meta.push(`Recorded by: ${recorder}`);
  }
  return meta.join(' | ');
}

export function buildTeamNoteContent(meeting: FathomMeeting, transcript?: string | null, currentUser?: { name?: string | null }): string {
  const parts: string[] = [];

  const title = meeting.title || meeting.meeting_title;
  parts.push(`## Meeting: ${title}`);

  const metaLine = buildMetaLine(meeting, currentUser);
  if (metaLine) parts.push(metaLine);

  const summary = normalizeSummary(meeting.default_summary);
  if (summary) {
    parts.push(`\n### Summary\n${summary}`);
  }

  const actionText = hasActionItems(meeting.action_items);
  if (actionText) {
    parts.push(`\n### Action Items\n${actionText}`);
  }

  const transcriptText = transcript || meeting.transcript;
  if (transcriptText) {
    parts.push(`\n### Transcript\n${transcriptText}`);
  }

  if (!summary && !actionText && !transcriptText) {
    parts.push('\n_Meeting recording is currently processing. Summary and key takeaways will appear once Fathom finishes processing the recording. Please try syncing again in a few minutes._');
  }

  return parts.join('\n');
}

export function extractKeyPoints(meeting: FathomMeeting): string[] {
  const points: string[] = [];

  const actionText = hasActionItems(meeting.action_items);
  if (actionText) {
    const items = actionText.split('\n').filter((line: string) => line.trim());
    points.push(...items.slice(0, 5));
  }

  const summary = normalizeSummary(meeting.default_summary);
  if (points.length === 0 && summary) {
    // Parse markdown to extract actual content, not headings
    const lines = summary.split('\n').filter((line: string) => line.trim());
    const contentLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip markdown headings (lines starting with #)
      if (trimmed.startsWith('#')) continue;
      // Skip empty lines
      if (!trimmed) continue;
      // Skip URLs in parentheses
      if (trimmed.startsWith('(http')) continue;

      // Add bullet points and regular sentences
      if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
        contentLines.push(trimmed.replace(/^[*\-]\s*/, '').trim());
      } else {
        // For regular text, split by sentences
        const sentences = trimmed.split(/[.!?]+/).filter((s: string) => s.trim());
        contentLines.push(...sentences.map((s: string) => s.trim()));
      }
    }

    // Return up to 5 key points
    points.push(...contentLines.slice(0, 5).filter(p => p.length > 10));
  }

  return points;
}

export function buildNoteContent(meeting: FathomMeeting, currentUser?: { name?: string | null }): string {
  const parts: string[] = [];

  // Always include meeting metadata
  const title = meeting.title || meeting.meeting_title;
  parts.push(`## ${title}`);

  const metaLine = buildMetaLine(meeting, currentUser);
  if (metaLine) parts.push(metaLine);

  const summary = normalizeSummary(meeting.default_summary);
  if (summary) {
    parts.push('### Summary\n' + summary);
  }

  const actionText = hasActionItems(meeting.action_items);
  if (actionText) {
    parts.push('### Action Items\n' + actionText);
  }

  if (meeting.transcript) {
    parts.push('### Transcript\n' + meeting.transcript);
  }

  if (!summary && !actionText && !meeting.transcript) {
    parts.push('_Meeting recording is currently processing. Summary and key takeaways will appear once Fathom finishes processing the recording. Please try syncing again in a few minutes._');
  }

  return parts.join('\n\n');
}
