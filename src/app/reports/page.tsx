import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReportsClient from '@/components/ReportsClient';
import styles from './reports.module.css';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // Import prisma directly to avoid auth cookie issues in server component
  const { prisma } = await import('@/lib/prisma');
  const userId = session.user.id;
  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const thisMonth = now.getMonth();
  const thisMonthStart = new Date(thisYear, thisMonth, 1);
  const lastMonthStart = new Date(thisYear, thisMonth - 1, 1);
  const lastMonthEnd = new Date(thisYear, thisMonth, 1);
  const thisYearStart = new Date(thisYear, 0, 1);
  const lastYearStart = new Date(lastYear, 0, 1);
  const lastYearEnd = new Date(thisYear, 0, 1);
  const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const allCustomers = await prisma.customer.findMany({
    where: { userId },
    select: { id: true, createdAt: true, leadStatus: true, pipelineStage: true },
  });

  // People growth: last 12 months
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
  for (const c of allCustomers) leadMap[c.leadStatus] = (leadMap[c.leadStatus] || 0) + 1;
  const leadBreakdown = Object.entries(leadMap).map(([status, count]) => ({ status, count }));

  // Pipeline breakdown
  const stageMap: Record<string, number> = {};
  for (const c of allCustomers) stageMap[c.pipelineStage] = (stageMap[c.pipelineStage] || 0) + 1;
  const pipelineBreakdown = Object.entries(stageMap).map(([stage, count]) => ({ stage, count }));

  // Comparison
  const thisMonthCount = allCustomers.filter(c => c.createdAt >= thisMonthStart).length;
  const lastMonthCount = allCustomers.filter(c => c.createdAt >= lastMonthStart && c.createdAt < lastMonthEnd).length;
  const percentChange = lastMonthCount === 0
    ? (thisMonthCount > 0 ? 100 : 0)
    : Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
  const thisYearCount = allCustomers.filter(c => c.createdAt >= thisYearStart).length;
  const lastYearCount = allCustomers.filter(c => c.createdAt >= lastYearStart && c.createdAt < lastYearEnd).length;

  // Year-over-year monthly
  const thisYearMonthly = monthLabels.map((month, m) => ({
    month,
    count: allCustomers.filter(c => {
      const s = new Date(thisYear, m, 1);
      const e = new Date(thisYear, m + 1, 1);
      return c.createdAt >= s && c.createdAt < e;
    }).length,
  }));
  const lastYearMonthly = monthLabels.map((month, m) => ({
    month,
    count: allCustomers.filter(c => {
      const s = new Date(lastYear, m, 1);
      const e = new Date(lastYear, m + 1, 1);
      return c.createdAt >= s && c.createdAt < e;
    }).length,
  }));

  const data = {
    peopleGrowth,
    leadBreakdown,
    pipelineBreakdown,
    comparison: {
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      percentChange,
      thisYear: thisYearCount,
      lastYear: lastYearCount,
    },
    thisYearMonthly,
    lastYearMonthly,
    currentYear: thisYear,
    lastYear,
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className={styles.header}>
        <h1 className="page-title">Reports</h1>
      </div>
      <ReportsClient data={JSON.parse(JSON.stringify(data))} />
    </div>
  );
}
