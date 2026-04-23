import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET() {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const notifications = await prisma.notification.findMany({
    where: { userId: authResult.userId! },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      from: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(notifications);
}
