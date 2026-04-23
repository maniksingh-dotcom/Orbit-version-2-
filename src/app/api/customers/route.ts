import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const companyId = request.headers.get('X-Company-Id');

  let where: Record<string, unknown>;

  if (companyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: authResult.userId! } },
    });
    where = membership ? { companyId } : { userId: authResult.userId };
  } else {
    where = { userId: authResult.userId };
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { notes: true, documents: true } },
    },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name: body.name.trim(),
        age: body.age ? parseInt(body.age, 10) : null,
        customerType: body.customerType || 'individual',
        companyId: body.companyId || null,
        companyName: body.companyName?.trim() || null,
        country: body.country?.trim() || null,
        state: body.state?.trim() || null,
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        website: body.website?.trim() || null,
        logoUrl: body.logoUrl || null,
        description: body.description?.trim() || null,
        pipelineStage: body.pipelineStage || 'new',
        leadStatus: body.leadStatus || 'warm',
        contactedVia: body.contactedVia || '',
        lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null,
        nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null,
        userId: authResult.userId,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
