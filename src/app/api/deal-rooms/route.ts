import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(_request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const groups = await prisma.group.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      members: {
        include: {
          customer: {
            select: { id: true, name: true, companyName: true, logoUrl: true, customerType: true, email: true },
          },
        },
      },
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: { name: name.trim(), description: description?.trim() || null },
    include: { members: { include: { customer: { select: { id: true, name: true, companyName: true, logoUrl: true, customerType: true, email: true } } } } },
  });

  return NextResponse.json(group, { status: 201 });
}
