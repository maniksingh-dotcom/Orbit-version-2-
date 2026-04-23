import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  const note = await prisma.teamNote.findUnique({ where: { id } });
  if (!note) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Only the author can delete their own note
  if (note.userId !== authResult.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.teamNote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
