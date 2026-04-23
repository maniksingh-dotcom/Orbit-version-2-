import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();
    const { companyId, customerIds } = body as { companyId: string; customerIds: string[] };

    if (!companyId || !Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json({ error: 'companyId and customerIds are required' }, { status: 400 });
    }

    // Verify user is a member of this company
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: authResult.userId! } },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this company' }, { status: 403 });
    }

    // Only assign customers owned by this user
    await prisma.customer.updateMany({
      where: { id: { in: customerIds }, userId: authResult.userId! },
      data: { companyId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error assigning company:', error);
    return NextResponse.json({ error: 'Failed to assign company' }, { status: 500 });
  }
}
