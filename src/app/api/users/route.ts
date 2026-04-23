import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(_request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const users = await prisma.user.findMany({
    select: { id: true, name: true, image: true, role: true, email: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(users);
}
