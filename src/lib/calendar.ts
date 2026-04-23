import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { CalendarEvent as CalendarEventNew, CalendarEventsPage } from "@/lib/calendar-types";

export interface CalendarAttendee {
  email: string;
  displayName: string | null;
  responseStatus: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
  description: string | null;
  attendees: CalendarAttendee[];
  source: "google_calendar";
}

export async function fetchGoogleCalendarEvents(
  userId: string,
  maxResults: number = 10
): Promise<CalendarEvent[]> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account?.access_token) {
    return [];
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  oauth2Client.on("tokens", async (tokens) => {
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

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now.toISOString(),
      timeMax: oneWeekLater.toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    return events.map((event) => ({
      id: event.id || "",
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
      description: event.description || null,
      attendees: (event.attendees || []).map((a) => ({
        email: a.email || "",
        displayName: a.displayName || null,
        responseStatus: a.responseStatus || null,
      })),
      source: "google_calendar" as const,
    }));
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return [];
  }
}

export async function createGoogleCalendarEvent(
  userId: string,
  eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendeeEmails: string[];
    addMeetLink?: boolean;
  }
): Promise<{ eventId: string; meetLink: string | null }> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    throw new Error("No Google account linked");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  oauth2Client.on("tokens", async (tokens) => {
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

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees: { email: string }[];
    conferenceData?: { createRequest: { requestId: string; conferenceSolutionKey: { type: string } } };
  } = {
    summary: eventData.title,
    description: eventData.description || undefined,
    start: {
      dateTime: eventData.startTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: eventData.attendeeEmails.map((email) => ({ email })),
  };

  if (eventData.addMeetLink !== false) {
    event.conferenceData = {
      createRequest: {
        requestId: `orbit-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: eventData.addMeetLink !== false ? 1 : 0,
    sendUpdates: "all",
  });

  return {
    eventId: response.data.id || "",
    meetLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || null,
  };
}

// --- Paginated calendar fetch for Meeting History / Google Calendar tab ---

function getOAuthClientForUser(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });
  oauth2Client.on("tokens", async (tokens) => {
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
  return oauth2Client;
}

function mapEvent(event: {
  id?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
  end?: { dateTime?: string | null; date?: string | null } | null;
  hangoutLink?: string | null;
  conferenceData?: { entryPoints?: Array<{ uri?: string | null }> | null } | null;
  description?: string | null;
  attendees?: Array<{ email?: string | null; displayName?: string | null; responseStatus?: string | null }> | null;
  organizer?: { email?: string | null } | null;
}): CalendarEventNew {
  const isAllDay = !event.start?.dateTime;
  return {
    id: event.id || "",
    title: event.summary || "Untitled Event",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    isAllDay,
    meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri || null,
    description: event.description || null,
    attendees: (event.attendees || []).map((a) => ({
      email: a.email || "",
      displayName: a.displayName || null,
      responseStatus: (a.responseStatus as CalendarEventNew["attendees"][number]["responseStatus"]) || null,
    })),
    organizerEmail: event.organizer?.email || null,
  };
}

export async function fetchCalendarEventsPage(
  userId: string,
  pageToken?: string
): Promise<CalendarEventsPage> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return { events: [], nextPageToken: null };

  const oauth2Client = getOAuthClientForUser(account);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      ...(pageToken ? { pageToken } : {}),
    });

    const events = (response.data.items || []).map(mapEvent);
    return { events, nextPageToken: response.data.nextPageToken || null };
  } catch (error) {
    console.error("Google Calendar paginated fetch error:", error);
    return { events: [], nextPageToken: null };
  }
}

/**
 * Fetches all past calendar events (up to 5 pages / 250 events) server-side,
 * returns them sorted descending by start date (most recent first).
 * This avoids the client-side pagination issue where oldest events appear first.
 */
export async function fetchAllCalendarEvents(
  userId: string
): Promise<CalendarEventNew[]> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return [];

  const oauth2Client = getOAuthClientForUser(account);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const timeMin = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(); // 2 years back
    const timeMax = new Date().toISOString(); // only past events

    const allEvents: CalendarEventNew[] = [];
    let pageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 5;

    do {
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime",
        ...(pageToken ? { pageToken } : {}),
      });

      const events = (response.data.items || []).map(mapEvent);
      allEvents.push(...events);
      pageToken = response.data.nextPageToken || undefined;
      pageCount++;
    } while (pageToken && pageCount < maxPages);

    // Sort descending — most recent first
    allEvents.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    return allEvents;
  } catch (error) {
    console.error("Google Calendar full fetch error:", error);
    return [];
  }
}

export async function fetchCalendarEventById(
  userId: string,
  eventId: string
): Promise<CalendarEventNew | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return null;

  const oauth2Client = getOAuthClientForUser(account);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    const response = await calendar.events.get({
      calendarId: "primary",
      eventId,
    });
    return mapEvent(response.data);
  } catch {
    return null;
  }
}
