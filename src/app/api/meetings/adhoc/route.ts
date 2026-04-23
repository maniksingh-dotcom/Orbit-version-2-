import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const meetings = await prisma.meetingSummary.findMany({
    where: { fathomId: null },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json({ meetings });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const { title, date, customerId, attendees, duration, summary } = body;

  if (!title || !date || !customerId) {
    return NextResponse.json(
      { error: 'Missing required fields: title, date, customerId' },
      { status: 400 }
    );
  }

  const meeting = await prisma.meetingSummary.create({
    data: {
      title,
      date: new Date(date),
      customerId,
      userId: authResult.userId,
      attendees: attendees || null,
      duration: duration ? parseInt(duration, 10) : null,
      summary: summary || null,
    },
    include: {
      customer: { select: { id: true, name: true } },
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ meeting }, { status: 201 });
}
