import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function PATCH() {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  await prisma.notification.updateMany({
    where: { userId: authResult.userId!, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
