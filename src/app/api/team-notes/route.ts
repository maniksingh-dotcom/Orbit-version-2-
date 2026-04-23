import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const customerId = request.nextUrl.searchParams.get('customerId');
    const groupId = request.nextUrl.searchParams.get('groupId') || request.nextUrl.searchParams.get('dealRoomId'); // Support both for backward compatibility

    const where: { customerId?: string; groupId?: string } = {};
    if (customerId) where.customerId = customerId;
    if (groupId) where.groupId = groupId;

    const notes = await prisma.teamNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        attachments: true,
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Team notes GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const { content, meetingId, customerId, groupId, dealRoomId } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const note = await prisma.teamNote.create({
      data: {
        content: content.trim(),
        userId: authResult.userId!,
        meetingId: meetingId || null,
        customerId: customerId || null,
        groupId: groupId || dealRoomId || null, // Support both for backward compatibility
      },
      include: {
        user: { select: { id: true, name: true, image: true, role: true } },
        attachments: true,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Team notes POST error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
