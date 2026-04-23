import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildNoteContent, buildTeamNoteContent, fetchTranscript, type FathomMeeting } from '@/lib/fathom';
import { analyzeMeeting } from '@/lib/meetingAnalyzer';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-fathom-signature');
    const webhookSecret = process.env.FATHOM_WEBHOOK_SECRET;

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await request.json();
    const eventType = body.event || body.type || 'meeting.completed';
    const meeting: FathomMeeting = body.data || body;

    if (!meeting.recording_id) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const fathomId = String(meeting.recording_id);
    const title = meeting.title || meeting.meeting_title || `Meeting on ${new Date(meeting.created_at).toLocaleDateString()}`;

    // Notify all users that Fathom is recording / has completed
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const isRecording = eventType === 'meeting.started' || eventType === 'recording.started';

    if (isRecording) {
      // Notify all users that Fathom is recording
      for (const u of allUsers) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            type: 'fathom_recording',
            message: `Fathom is recording: "${title}"`,
            link: meeting.url || meeting.share_url || null,
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    // Meeting completed — full sync
    const content = buildNoteContent(meeting);

    // Fetch full transcript from Fathom API
    // For webhooks, we can't determine the specific user, so we pass undefined
    // and it will fall back to using the API key
    const transcript = await fetchTranscript(meeting.recording_id);

    // 1. Create/update customer Note
    let matchedCustomerId: string | undefined;

    if (meeting.calendar_invitees && meeting.calendar_invitees.length > 0) {
      const inviteeEmails = meeting.calendar_invitees.map(i => i.email.toLowerCase());
      const customersWithEmails = await prisma.customer.findMany({
        where: { email: { not: null } }
      });

      const matchedCustomer = customersWithEmails.find(c =>
        c.email && inviteeEmails.includes(c.email.toLowerCase())
      );

      if (matchedCustomer) {
        matchedCustomerId = matchedCustomer.id;
      }
    }

    if (matchedCustomerId) {
      await prisma.note.upsert({
        where: { fathomId },
        create: {
          fathomId,
          title,
          content,
          source: 'fathom',
          addedBy: 'Fathom AI',
          customerId: matchedCustomerId,
        },
        update: { title, content },
      });
    }

    // 2. Create TeamNote with rich meeting content
    const systemUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

    if (systemUser) {
      const teamNoteContent = buildTeamNoteContent(meeting, transcript);

      await prisma.teamNote.create({
        data: {
          content: teamNoteContent,
          userId: systemUser.id,
          customerId: matchedCustomerId || null,
          meetingId: fathomId,
          source: 'fathom',
        },
      });

      // 3. Parse action items and create individual ActionItem records
      if (meeting.action_items) {
        const actionText = typeof meeting.action_items === 'string' ? meeting.action_items : JSON.stringify(meeting.action_items);
        const items = actionText
          .split('\n')
          .map((line: string) => line.replace(/^[-*•]\s*/, '').trim())
          .filter((line: string) => line.length > 0);

        for (const itemTitle of items) {
          await prisma.actionItem.create({
            data: {
              title: itemTitle,
              userId: systemUser.id,
            },
          });
        }
      }
    }

    // Auto-analyze meeting intelligence
    const durationMins = meeting.recording_start_time && meeting.recording_end_time
      ? Math.round((new Date(meeting.recording_end_time).getTime() - new Date(meeting.recording_start_time).getTime()) / 60000)
      : null;

    const savedMeeting = await prisma.meetingSummary.upsert({
      where: { fathomId },
      create: {
        fathomId,
        title,
        date: new Date(meeting.created_at),
        duration: durationMins,
        attendeeCount: meeting.calendar_invitees?.length || null,
        summary: content,
        customerId: matchedCustomerId || null,
        userId: systemUser?.id || null,
      },
      update: { title, summary: content },
    });

    const intelligenceResult = await analyzeMeeting(title, content, transcript);
    if (intelligenceResult) {
      await prisma.meetingIntelligence.upsert({
        where: { meetingId: savedMeeting.id },
        create: {
          meetingId: savedMeeting.id,
          customerId: matchedCustomerId || null,
          ...intelligenceResult,
        },
        update: {
          customerId: matchedCustomerId || null,
          ...intelligenceResult,
          analyzedAt: new Date(),
        },
      });
    }

    // Notify all users that meeting notes are ready
    for (const u of allUsers) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          type: 'fathom_complete',
          message: `Fathom meeting notes ready: "${title}"`,
          link: '/team',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
