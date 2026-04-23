import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function POST() {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  try {
    // Delete the user's Fathom account connection
    await prisma.fathomAccount.deleteMany({
      where: { userId: authResult.userId! },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Fathom account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Fathom account' },
      { status: 500 }
    );
  }
}
