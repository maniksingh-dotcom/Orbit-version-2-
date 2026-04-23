import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TeamPageLayout from '@/components/TeamPageLayout';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      _count: { select: { teamNotes: true } },
    },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="page-title">Team Board</h1>
      </div>
      <TeamPageLayout customers={JSON.parse(JSON.stringify(customers))} />
    </div>
  );
}
