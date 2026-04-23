import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';
import { analyzeMeeting } from '@/lib/meetingAnalyzer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    fathomId?: string;
    title?: string;
    summary?: string;
    transcript?: string;
    customerId?: string;
  };

  // Resolve the MeetingSummary — id param could be a DB id or fathomId
  let meeting = await prisma.meetingSummary.findUnique({ where: { id } });
  if (!meeting && body.fathomId) {
    meeting = await prisma.meetingSummary.findUnique({ where: { fathomId: body.fathomId } });
  }
  if (!meeting && body.fathomId) {
    // Create on the fly from provided content
    meeting = await prisma.meetingSummary.create({
      data: {
        fathomId: body.fathomId,
        title: body.title || 'Untitled Meeting',
        date: new Date(),
        summary: body.summary || null,
        customerId: body.customerId || null,
        userId: authResult.userId,
      },
    });
  }

  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }

  const summary = body.summary ?? meeting.summary;
  const transcript = body.transcript ?? null;
  const title = body.title ?? meeting.title;

  const result = await analyzeMeeting(title, summary, transcript);
  if (!result) {
    return NextResponse.json({ error: 'Analysis failed — no content or API key missing' }, { status: 422 });
  }

  const intelligence = await prisma.meetingIntelligence.upsert({
    where: { meetingId: meeting.id },
    create: {
      meetingId: meeting.id,
      customerId: body.customerId ?? meeting.customerId,
      ...result,
    },
    update: {
      customerId: body.customerId ?? meeting.customerId,
      ...result,
      analyzedAt: new Date(),
    },
  });

  return NextResponse.json(intelligence);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  // Try by meetingId (DB id) first, then by fathomId
  let intelligence = await prisma.meetingIntelligence.findUnique({
    where: { meetingId: id },
  });

  if (!intelligence) {
    const meeting = await prisma.meetingSummary.findUnique({ where: { fathomId: id } });
    if (meeting) {
      intelligence = await prisma.meetingIntelligence.findUnique({
        where: { meetingId: meeting.id },
      });
    }
  }

  return NextResponse.json(intelligence ?? null);
}
