import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SuccessClient from '@/components/SuccessClient';

export const dynamic = 'force-dynamic';

export default async function SuccessPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const customers = await prisma.customer.findMany({
    where: { userId: session.user.id, customerStage: 'customer' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      healthScore: true,
      customerStage: true,
      onboardingStatus: true,
      renewalDate: true,
      riskLevel: true,
      dealValue: true,
      qbrDate: true,
      pipelineStage: true,
      updatedAt: true,
    },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <SuccessClient customers={JSON.parse(JSON.stringify(customers))} />
    </div>
  );
}
