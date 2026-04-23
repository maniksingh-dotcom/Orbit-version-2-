import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const userId = authResult.userId!;
  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const thisMonth = now.getMonth(); // 0-indexed
  const thisMonthStart = new Date(thisYear, thisMonth, 1);
  const lastMonthStart = new Date(thisYear, thisMonth - 1, 1);
  const lastMonthEnd = new Date(thisYear, thisMonth, 1);
  const thisYearStart = new Date(thisYear, 0, 1);
  const lastYearStart = new Date(lastYear, 0, 1);
  const lastYearEnd = new Date(thisYear, 0, 1);

  // All customers for this user
  const allCustomers = await prisma.customer.findMany({
    where: { userId },
    select: { id: true, createdAt: true, leadStatus: true, pipelineStage: true },
  });

  // People growth: count per month for the past 12 months
  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const peopleGrowth: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(thisYear, thisMonth - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = allCustomers.filter(c => c.createdAt >= start && c.createdAt < end).length;
    peopleGrowth.push({ month: monthLabels[d.getMonth()], count });
  }

  // Lead breakdown
  const leadMap: Record<string, number> = {};
  for (const c of allCustomers) {
    leadMap[c.leadStatus] = (leadMap[c.leadStatus] || 0) + 1;
  }
  const leadBreakdown = Object.entries(leadMap).map(([status, count]) => ({ status, count }));

  // Pipeline breakdown
  const stageMap: Record<string, number> = {};
  for (const c of allCustomers) {
    stageMap[c.pipelineStage] = (stageMap[c.pipelineStage] || 0) + 1;
  }
  const pipelineBreakdown = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

  // Month comparison
  const thisMonthCount = allCustomers.filter(c => c.createdAt >= thisMonthStart).length;
  const lastMonthCount = allCustomers.filter(c => c.createdAt >= lastMonthStart && c.createdAt < lastMonthEnd).length;
  const percentChange = lastMonthCount === 0
    ? (thisMonthCount > 0 ? 100 : 0)
    : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);

  // Year comparison: monthly totals for this year and last year
  const thisYearMonthly: { month: string; count: number }[] = [];
  const lastYearMonthly: { month: string; count: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const tyStart = new Date(thisYear, m, 1);
    const tyEnd = new Date(thisYear, m + 1, 1);
    const lyStart = new Date(lastYear, m, 1);
    const lyEnd = new Date(lastYear, m + 1, 1);
    thisYearMonthly.push({
      month: monthLabels[m],
      count: allCustomers.filter(c => c.createdAt >= tyStart && c.createdAt < tyEnd).length,
    });
    lastYearMonthly.push({
      month: monthLabels[m],
      count: allCustomers.filter(c => c.createdAt >= lyStart && c.createdAt < lyEnd).length,
    });
  }

  const thisYearTotal = allCustomers.filter(c => c.createdAt >= thisYearStart).length;
  const lastYearTotal = allCustomers.filter(c => c.createdAt >= lastYearStart && c.createdAt < lastYearEnd).length;

  return NextResponse.json({
    peopleGrowth,
    leadBreakdown,
    pipelineBreakdown,
    comparison: {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      percentChange,
      thisYear: thisYearTotal,
      lastYear: lastYearTotal,
    },
    thisYearMonthly,
    lastYearMonthly,
    currentYear: thisYear,
    lastYear,
  });
}
