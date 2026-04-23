import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminCompaniesClient from '@/components/admin/AdminCompaniesClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage() {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/customers');

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { members: true, customers: true } },
      members: {
        take: 5,
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  return <AdminCompaniesClient companies={JSON.parse(JSON.stringify(companies))} />;
}
