import { NextRequest, NextResponse } from 'next/server';
import { fetchUpcomingMeeting, fetchRecentCompletedMeeting, extractKeyPoints, normalizeSummary } from '@/lib/fathom';
import { fetchGoogleCalendarEvents } from '@/lib/calendar';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();
  const customerEmail = request.nextUrl.searchParams.get('customerEmail');

  try {
    const userId = session?.user?.id;
    const [upcoming, recent, allCalendarEvents] = await Promise.all([
      customerEmail ? fetchUpcomingMeeting(customerEmail, userId) : Promise.resolve(null),
      customerEmail ? fetchRecentCompletedMeeting(customerEmail, userId) : Promise.resolve(null),
      userId ? fetchGoogleCalendarEvents(userId, 15) : Promise.resolve([]),
    ]);

    // If a customer email is provided, filter calendar events to only those
    // where the customer is an attendee
    const calendarEvents = customerEmail
      ? allCalendarEvents.filter(e =>
        e.attendees.some(a => a.email.toLowerCase() === customerEmail.toLowerCase())
      )
      : allCalendarEvents.slice(0, 5);

    const result: {
      upcoming: {
        id: string;
        title: string;
        scheduled_start_time: string;
        url: string;
        source: string;
      } | null;
      previous: {
        title: string;
        date: string;
        summary: string | null;
        keyPoints: string[];
        duration: number | null;
        attendees: number | null;
      } | null;
      calendarEvents: typeof calendarEvents;
    } = {
      upcoming: null,
      previous: null,
      calendarEvents,
    };

    if (upcoming) {
      result.upcoming = {
        id: String(upcoming.recording_id),
        title: upcoming.title || upcoming.meeting_title,
        scheduled_start_time: upcoming.scheduled_start_time!,
        url: upcoming.url || upcoming.share_url,
        source: 'fathom',
      };
    }

    // If no Fathom upcoming, use nearest Google Calendar event
    if (!result.upcoming && calendarEvents.length > 0) {
      const nextEvent = calendarEvents[0];
      result.upcoming = {
        id: nextEvent.id,
        title: nextEvent.title,
        scheduled_start_time: nextEvent.start,
        url: nextEvent.meetLink || '',
        source: 'google_calendar',
      };
    }

    if (recent) {
      // Calculate duration from recording times
      let duration: number | null = null;
      if (recent.recording_start_time && recent.recording_end_time) {
        const rawMins = Math.round(
          (new Date(recent.recording_end_time).getTime() - new Date(recent.recording_start_time).getTime()) / 60000
        );
        // Sanity check: cap at 12 hours (720 min)
        duration = rawMins > 0 && rawMins <= 720 ? rawMins : null;
      }

      result.previous = {
        title: recent.title || recent.meeting_title,
        date: new Date(recent.created_at).toLocaleDateString(),
        summary: normalizeSummary(recent.default_summary),
        keyPoints: extractKeyPoints(recent),
        duration,
        attendees: recent.calendar_invitees?.length || null,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching upcoming meeting:', error);
    return NextResponse.json({ upcoming: null, previous: null, calendarEvents: [] });
  }
}
