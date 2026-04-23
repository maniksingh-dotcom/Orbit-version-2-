import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';
import { fetchFathomCalls, fetchRecordingDetails, buildNoteContent, buildTeamNoteContent } from '@/lib/fathom';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const groupId = searchParams.get('groupId') || searchParams.get('dealRoomId'); // Support both for backward compatibility

  if (!customerId && !groupId) {
    return NextResponse.json({ error: 'customerId or groupId is required' }, { status: 400 });
  }

  let targetCustomerEmail: string | null = null;
  if (customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    targetCustomerEmail = customer.email;
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: authResult.userId! },
    select: { name: true, email: true }
  });

  try {
    let cursor: string | undefined;
    let synced = 0;

    do {
      const response = await fetchFathomCalls(cursor, authResult.userId!);

      for (let meeting of response.items) {
        // Skip Fathom's default demo meeting to prevent confusion
        if (meeting.title === 'Fathom Demo' || meeting.meeting_title === 'Fathom Demo') {
          continue;
        }

        // Filter meetings so that they only sync to the customer if the customer was an attendee
        if (customerId && targetCustomerEmail) {
          const isAttendee = meeting.calendar_invitees?.some(
            (inv) => inv.email.toLowerCase() === targetCustomerEmail!.toLowerCase()
          );
          if (!isAttendee) {
            continue; // Skip this meeting for this customer, they weren't invited
          }
        } else if (customerId && !targetCustomerEmail) {
          // If a customer is provided but they have no email, we can't reliably sync
          continue;
        }

        // For OAuth users, fetch full recording details to get summary/transcript
        if (!meeting.default_summary && !meeting.transcript) {
          const recordingDetails = await fetchRecordingDetails(meeting.recording_id, authResult.userId!);
          if (recordingDetails) {
            // Merge recording details into meeting object
            meeting = { ...meeting, ...recordingDetails };
          }
        }

        const fathomId = String(meeting.recording_id);
        const title = meeting.title || `Meeting on ${new Date(meeting.created_at).toLocaleDateString()}`;

        // Create/update Note for customer (if customerId provided)
        if (customerId) {
          const content = buildNoteContent(meeting, currentUser || undefined);
          await prisma.note.upsert({
            where: { fathomId },
            create: {
              fathomId,
              title,
              content,
              source: 'fathom',
              addedBy: 'Fathom AI',
              customerId,
            },
            update: { title, content },
          });

          // Also create TeamNote for this customer so it appears in Team board
          const teamContent = buildTeamNoteContent(meeting, meeting.transcript, currentUser || undefined);
          const existingTeamNote = await prisma.teamNote.findFirst({
            where: { meetingId: fathomId, customerId },
          });
          if (!existingTeamNote) {
            await prisma.teamNote.create({
              data: {
                content: teamContent,
                userId: authResult.userId!,
                customerId,
                meetingId: fathomId,
                source: 'fathom',
              },
            });
          }
        }

        // Also create TeamNote for group (if groupId provided)
        if (groupId) {
          const teamContent = buildTeamNoteContent(meeting, meeting.transcript, currentUser || undefined);
          // Check if a TeamNote with this meetingId already exists for this group
          const existing = await prisma.teamNote.findFirst({
            where: { meetingId: fathomId, groupId },
          });
          if (!existing) {
            await prisma.teamNote.create({
              data: {
                content: teamContent,
                userId: authResult.userId!,
                groupId,
                customerId: customerId || null,
                meetingId: fathomId,
                source: 'fathom',
              },
            });
          }
        }

        synced++;
        // Break after syncing the single most recent valid meeting
        if (synced >= 1) {
          break;
        }
      }

      // If we've successfully synced a meeting, stop fetching more pages
      if (synced >= 1) {
        break;
      }

      cursor = response.next_cursor || undefined;
    } while (cursor);

    return NextResponse.json({ synced });
  } catch (error) {
    console.error('Fathom sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Fathom sync failed: ${message}` }, { status: 500 });
  }
}
