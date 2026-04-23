import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PeoplePageLayout from '@/components/PeoplePageLayout';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const session = await auth();
  if (!session) redirect('/login');

  // All employees can add customers
  const canAddCustomer = true;

  const customers = await prisma.customer.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      customerType: true,
      country: true,
      state: true,
      email: true,
      phone: true,
      description: true,
      pipelineStage: true,
      leadStatus: true,
      contactedVia: true,
      lastContactedAt: true,
      nextFollowUpAt: true,
      _count: { select: { notes: true, documents: true } },
    },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <PeoplePageLayout
        customers={JSON.parse(JSON.stringify(customers))}
        canAddCustomer={canAddCustomer}
      />
    </div>
  );
}
