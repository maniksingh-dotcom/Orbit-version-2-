import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: {
      id,
      userId: authResult.userId, // Ensure user owns this customer
    },
    include: {
      notes: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json(customer);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    const body = await request.json();

    // Verify user owns this customer before updating
    const existing = await prisma.customer.findUnique({
      where: { id, userId: authResult.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.age !== undefined && { age: body.age ? parseInt(body.age, 10) : null }),
        ...(body.customerType !== undefined && { customerType: body.customerType }),
        ...(body.companyName !== undefined && { companyName: body.companyName?.trim() || null }),
        ...(body.country !== undefined && { country: body.country?.trim() || null }),
        ...(body.state !== undefined && { state: body.state?.trim() || null }),
        ...(body.email !== undefined && { email: body.email?.trim() || null }),
        ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
        ...(body.website !== undefined && { website: body.website?.trim() || null }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.mandateScope !== undefined && { mandateScope: body.mandateScope?.trim() || null }),
        ...(body.mandateCompensation !== undefined && { mandateCompensation: body.mandateCompensation?.trim() || null }),
        ...(body.mandateExclusivity !== undefined && { mandateExclusivity: body.mandateExclusivity?.trim() || null }),
        ...(body.mandateLegalProtections !== undefined && { mandateLegalProtections: body.mandateLegalProtections?.trim() || null }),
        ...(body.mandateTransactionDef !== undefined && { mandateTransactionDef: body.mandateTransactionDef?.trim() || null }),
        ...(body.pipelineStage !== undefined && { pipelineStage: body.pipelineStage }),
        ...(body.leadStatus !== undefined && { leadStatus: body.leadStatus }),
        ...(body.contactedVia !== undefined && { contactedVia: body.contactedVia }),
        ...(body.lastContactedAt !== undefined && { lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : null }),
        ...(body.nextFollowUpAt !== undefined && { nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null }),
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  const existing = await prisma.customer.findUnique({
    where: { id, userId: authResult.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const body = await request.json();
  const updateData: Record<string, unknown> = {};

  if (body.healthScore !== undefined) {
    updateData.healthScore = body.healthScore != null ? parseInt(body.healthScore, 10) : null;
  }
  if (body.onboardingStatus !== undefined) updateData.onboardingStatus = body.onboardingStatus;
  if (body.renewalDate !== undefined) {
    updateData.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
  }
  if (body.riskLevel !== undefined) updateData.riskLevel = body.riskLevel;
  if (body.dealValue !== undefined) {
    updateData.dealValue = body.dealValue != null ? parseFloat(body.dealValue) : null;
  }
  if (body.qbrDate !== undefined) {
    updateData.qbrDate = body.qbrDate ? new Date(body.qbrDate) : null;
  }
  if (body.customerStage !== undefined) updateData.customerStage = body.customerStage;

  const customer = await prisma.customer.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(customer);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    // Verify user owns this customer before deleting
    const existing = await prisma.customer.findUnique({
      where: { id, userId: authResult.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Delete customer (cascades will handle related data)
    await prisma.customer.delete({ where: { id } });

    // Note: Files are in Supabase Storage, will need manual cleanup if needed
    // Could add deleteFromStorage() calls here for each document

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
