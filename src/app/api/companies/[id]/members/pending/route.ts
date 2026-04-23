import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('admin');
  if (!authResult.authorized) return authResult.response;
  const { id: companyId } = await params;
  const email = request.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  await prisma.pendingInvite.deleteMany({ where: { companyId, email } });
  return NextResponse.json({ ok: true });
}
