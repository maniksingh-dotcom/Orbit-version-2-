import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authGuard";
import { createGoogleCalendarEvent, fetchAllCalendarEvents } from "@/lib/calendar";

export async function GET(_request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const events = await fetchAllCalendarEvents(authResult.userId!);
    return NextResponse.json({ events, nextPageToken: null });
  } catch (error) {
    console.error("Calendar events error:", error);
    return NextResponse.json({ events: [], nextPageToken: null });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { title, description, startTime, endTime, attendeeEmails, addMeetLink } = await req.json();

  if (!title || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Missing required fields: title, startTime, endTime" },
      { status: 400 }
    );
  }

  try {
    const result = await createGoogleCalendarEvent(authResult.userId, {
      title,
      description,
      startTime,
      endTime,
      attendeeEmails: attendeeEmails || [],
      addMeetLink: addMeetLink !== false,
    });
    console.log("Calendar event created successfully:", result.eventId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create calendar event error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error details:", {
      userId: authResult.userId,
      title,
      startTime,
      endTime,
      attendeeCount: attendeeEmails?.length || 0,
      errorMessage,
    });
    return NextResponse.json(
      { error: `Failed to create calendar event: ${errorMessage}` },
      { status: 500 }
    );
  }
}
