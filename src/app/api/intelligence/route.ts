import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const companyId = request.headers.get('X-Company-Id');

  const where = companyId ? { companyId } : { userId: authResult.userId! };

  const customers = await prisma.customer.findMany({
    where: {
      ...where,
      customerStage: { in: ['lead', 'prospect', 'active'] },
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      pipelineStage: true,
      leadStatus: true,
      lastContactedAt: true,
      healthScore: true,
      riskLevel: true,
      dealValue: true,
      meetingIntelligence: {
        orderBy: { analyzedAt: 'desc' },
        take: 1,
        select: {
          sentiment: true,
          dealRisk: true,
          riskReasons: true,
          nextStepConfirmed: true,
          excitement: true,
          analyzedAt: true,
        },
      },
      meetingSummaries: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true, title: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  });

  // Compute days since last contact for each customer
  const now = Date.now();
  const enriched = customers.map((c) => {
    const daysSinceContact = c.lastContactedAt
      ? Math.floor((now - new Date(c.lastContactedAt).getTime()) / 86400000)
      : null;

    const latestIntel = c.meetingIntelligence[0] ?? null;
    const latestMeeting = c.meetingSummaries[0] ?? null;

    const effectiveRisk = latestIntel?.dealRisk ?? c.riskLevel ?? 'none';

    return {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      logoUrl: c.logoUrl,
      pipelineStage: c.pipelineStage,
      leadStatus: c.leadStatus,
      lastContactedAt: c.lastContactedAt,
      daysSinceContact,
      healthScore: c.healthScore,
      dealValue: c.dealValue,
      effectiveRisk,
      latestIntel,
      lastMeetingTitle: latestMeeting?.title ?? null,
      lastMeetingDate: latestMeeting?.date ?? null,
    };
  });

  // Sort: critical first, then high, then medium
  const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
  enriched.sort((a, b) => (riskOrder[a.effectiveRisk] ?? 5) - (riskOrder[b.effectiveRisk] ?? 5));

  return NextResponse.json(enriched);
}
