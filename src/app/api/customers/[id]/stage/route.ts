import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.customer.findUnique({
    where: { id, userId: authResult.userId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.pipelineStage !== undefined) updateData.pipelineStage = body.pipelineStage;
  if (body.leadStatus !== undefined) updateData.leadStatus = body.leadStatus;
  if (body.contactedVia !== undefined) updateData.contactedVia = body.contactedVia;
  if (body.lastContactedAt !== undefined) {
    updateData.lastContactedAt = body.lastContactedAt ? new Date(body.lastContactedAt) : null;
  }
  if (body.nextFollowUpAt !== undefined) {
    updateData.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: updateData,
  });

  // Log stage change as activity
  if (body.pipelineStage !== undefined && body.pipelineStage !== existing.pipelineStage) {
    await prisma.customerActivity.create({
      data: {
        customerId: id,
        userId: authResult.userId!,
        type: 'stage_change',
        title: `Stage changed: ${existing.pipelineStage} → ${body.pipelineStage}`,
      },
    });
  }

  // Auto-transition to customer success track when WON
  if (body.pipelineStage === 'won') {
    await prisma.customer.update({
      where: { id },
      data: { customerStage: 'customer', onboardingStatus: 'not_started' },
    });
  }

  return NextResponse.json(customer);
}
