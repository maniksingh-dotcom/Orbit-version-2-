import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;
  const { id: companyId } = await params;

  const members = await prisma.companyMember.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('admin');
  if (!authResult.authorized) return authResult.response;
  const { id: companyId } = await params;
  const body = await request.json();

  if (!body.email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: body.email } });

  if (!user) {
    // Store a pending invite — will be processed when they sign in
    await prisma.pendingInvite.upsert({
      where: { companyId_email: { companyId, email: body.email } },
      update: { role: body.role || 'member' },
      create: { companyId, email: body.email, role: body.role || 'member' },
    });
    return NextResponse.json({ pending: true, email: body.email, role: body.role || 'member' }, { status: 201 });
  }

  const member = await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId, userId: user.id } },
    update: { role: body.role || 'member' },
    create: { companyId, userId: user.id, role: body.role || 'member' },
    include: {
      user: { select: { id: true, name: true, email: true, image: true, role: true } },
    },
  });

  return NextResponse.json(member, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('admin');
  if (!authResult.authorized) return authResult.response;
  const { id: companyId } = await params;
  const body = await request.json();

  await prisma.companyMember.delete({
    where: { companyId_userId: { companyId, userId: body.userId } },
  });

  return NextResponse.json({ ok: true });
}
