import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  const messages = await prisma.groupMessage.findMany({
    where: { groupId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const message = await prisma.groupMessage.create({
    data: {
      content: content.trim(),
      groupId: id,
      userId: authResult.userId!,
    },
    include: {
      user: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  return NextResponse.json(message, { status: 201 });
}
