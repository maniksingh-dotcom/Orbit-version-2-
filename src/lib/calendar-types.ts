// Shared Google Calendar types — no server-side imports, safe for client components

export interface CalendarAttendee {
  email: string;
  displayName: string | null;
  responseStatus: 'accepted' | 'declined' | 'tentative' | 'needsAction' | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;       // ISO 8601 datetime or date string
  end: string;         // ISO 8601 datetime or date string
  isAllDay: boolean;
  meetLink: string | null;
  description: string | null;
  attendees: CalendarAttendee[];
  organizerEmail: string | null;
}

export interface CalendarEventsPage {
  events: CalendarEvent[];
  nextPageToken: string | null;
}
