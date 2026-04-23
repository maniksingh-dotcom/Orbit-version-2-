import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      customers: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          pipelineStage: true,
          leadStatus: true,
          companyName: true,
          logoUrl: true,
          customerStage: true,
          healthScore: true,
        },
      },
      _count: { select: { members: true, customers: true } },
    },
  });

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Non-admin must be a member
  if (authResult.userRole !== 'admin') {
    const isMember = company.members.some((m) => m.userId === authResult.userId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(company);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;
  const body = await request.json();

  const company = await prisma.company.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name.trim() }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
    },
  });

  return NextResponse.json(company);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('admin');
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;

  await prisma.company.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
