import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');

  if (!customerId) {
    return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
  }

  const notes = await prisma.note.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(notes);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();

    if (!body.title?.trim() || !body.content?.trim() || !body.customerId) {
      return NextResponse.json(
        { error: 'title, content, and customerId are required' },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        title: body.title.trim(),
        content: body.content.trim(),
        source: 'manual',
        addedBy: body.addedBy?.trim() || 'Admin',
        userId: authResult.userId,
        customerId: body.customerId,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
