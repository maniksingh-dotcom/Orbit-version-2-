import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';
import { DEFAULT_PIPELINE_STAGES } from '@/lib/defaultPipelineStages';

const SOURCE_LABELS: Record<string, string> = {
  email: 'Email', phone: 'Phone', whatsapp: 'WhatsApp',
  fb: 'FB Lead', insta: 'Instagram', website: 'Website', '': 'Unknown',
};

function periodToDate(period: string): Date | null {
  const now = new Date();
  if (period === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
  return null;
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '30d';
  const since = periodToDate(period);

  const companyId = request.headers.get('X-Company-Id');

  let scopeWhere: Record<string, unknown>;
  if (companyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: authResult.userId! } },
    });
    scopeWhere = membership ? { companyId } : { userId: authResult.userId };
  } else {
    scopeWhere = { userId: authResult.userId };
  }

  // Load custom pipeline stages for this scope
  const stageWhere = companyId && scopeWhere.companyId
    ? { companyId }
    : { userId: authResult.userId, companyId: null };
  const customStages = await prisma.pipelineStage.findMany({
    where: stageWhere,
    orderBy: { order: 'asc' },
  });
  const stages = customStages.length > 0 ? customStages : DEFAULT_PIPELINE_STAGES;
  const pipelineOrder = stages.filter(s => !s.isWon && !s.isLost).map(s => s.key);
  const wonKeys = stages.filter(s => s.isWon).map(s => s.key);
  const lostKeys = stages.filter(s => s.isLost).map(s => s.key);
  const stageLabels: Record<string, string> = Object.fromEntries(stages.map(s => [s.key, s.label]));

  const timeWhere = since ? { createdAt: { gte: since } } : {};

  const customers = await prisma.customer.findMany({
    where: { ...scopeWhere, ...timeWhere },
    select: {
      id: true,
      name: true,
      companyName: true,
      pipelineStage: true,
      leadStatus: true,
      nextFollowUpAt: true,
      lastContactedAt: true,
      contactedVia: true,
      dealValue: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const now = new Date();

  // ── Summary ──────────────────────────────────────────────────────────────────
  const wonCount = customers.filter(c => wonKeys.includes(c.pipelineStage)).length;
  const lostCount = customers.filter(c => lostKeys.includes(c.pipelineStage)).length;
  const closedCount = wonCount + lostCount;
  const winRate = closedCount > 0 ? wonCount / closedCount : 0;

  const pipelineValue = customers
    .filter(c => !wonKeys.includes(c.pipelineStage) && !lostKeys.includes(c.pipelineStage) && c.dealValue)
    .reduce((sum, c) => sum + (c.dealValue ?? 0), 0);

  const hotLeads = customers.filter(c => c.leadStatus === 'hot').length;

  // ── Funnel ───────────────────────────────────────────────────────────────────
  const stageCounts: Record<string, { count: number; value: number }> = {};
  for (const stage of stages) {
    stageCounts[stage.key] = { count: 0, value: 0 };
  }
  for (const c of customers) {
    if (stageCounts[c.pipelineStage]) {
      stageCounts[c.pipelineStage].count++;
      stageCounts[c.pipelineStage].value += c.dealValue ?? 0;
    }
  }

  const funnel = pipelineOrder.map((stage, i) => {
    const nextStage = pipelineOrder[i + 1];
    const thisCount = stageCounts[stage]?.count ?? 0;
    const nextCount = nextStage ? (stageCounts[nextStage]?.count ?? 0) : null;
    const conversionToNext = thisCount > 0 && nextCount !== null
      ? Math.round((nextCount / thisCount) * 100)
      : null;
    return {
      stage,
      label: stageLabels[stage] ?? stage,
      count: thisCount,
      value: stageCounts[stage]?.value ?? 0,
      conversionToNext,
    };
  });

  // Add won stages to funnel
  for (const key of wonKeys) {
    funnel.push({
      stage: key,
      label: stageLabels[key] ?? key,
      count: stageCounts[key]?.count ?? 0,
      value: stageCounts[key]?.value ?? 0,
      conversionToNext: null,
    });
  }

  // ── Overdue follow-ups ───────────────────────────────────────────────────────
  const overdueFollowUps = customers
    .filter(c => c.nextFollowUpAt && new Date(c.nextFollowUpAt) < now)
    .map(c => ({
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      nextFollowUpAt: c.nextFollowUpAt!.toISOString(),
      daysOverdue: Math.floor((now.getTime() - new Date(c.nextFollowUpAt!).getTime()) / 86400000),
      leadStatus: c.leadStatus,
      pipelineStage: c.pipelineStage,
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 20);

  // ── Velocity ─────────────────────────────────────────────────────────────────
  const wonLeads = customers.filter(c => wonKeys.includes(c.pipelineStage));
  const avgDaysToClose = wonLeads.length > 0
    ? Math.round(
        wonLeads.reduce((sum, c) => {
          return sum + (c.updatedAt.getTime() - c.createdAt.getTime()) / 86400000;
        }, 0) / wonLeads.length
      )
    : null;

  const avgCycle = avgDaysToClose ?? 30;
  const stageCount = pipelineOrder.length;
  const avgDaysPerStage: Record<string, number> = {};
  pipelineOrder.forEach(stage => {
    avgDaysPerStage[stage] = Math.round(avgCycle / stageCount);
  });

  // ── Lead sources ─────────────────────────────────────────────────────────────
  const sourceMap: Record<string, { count: number; wonCount: number }> = {};
  for (const c of customers) {
    const src = c.contactedVia || '';
    if (!sourceMap[src]) sourceMap[src] = { count: 0, wonCount: 0 };
    sourceMap[src].count++;
    if (wonKeys.includes(c.pipelineStage)) sourceMap[src].wonCount++;
  }

  const sources = Object.entries(sourceMap)
    .map(([source, data]) => ({
      source,
      label: SOURCE_LABELS[source] ?? source,
      count: data.count,
      wonCount: data.wonCount,
      winRate: data.count > 0 ? Math.round((data.wonCount / data.count) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Deals by stage (top 8 per active stage) ─────────────────────────────────
  const dealsByStage: Record<string, { id: string; name: string; companyName: string | null; dealValue: number | null; leadStatus: string }[]> = {};
  for (const stage of pipelineOrder) {
    dealsByStage[stage] = customers
      .filter(c => c.pipelineStage === stage)
      .slice(0, 8)
      .map(c => ({
        id: c.id,
        name: c.name,
        companyName: c.companyName,
        dealValue: c.dealValue,
        leadStatus: c.leadStatus,
      }));
  }

  return NextResponse.json({
    summary: {
      totalLeads: customers.length,
      hotLeads,
      winRate: Math.round(winRate * 100),
      pipelineValue,
    },
    funnel,
    overdueFollowUps,
    velocity: {
      avgDaysToClose,
      winRate: Math.round(winRate * 100),
      wonCount,
      lostCount,
      avgDaysPerStage,
    },
    sources,
    dealsByStage,
  });
}
