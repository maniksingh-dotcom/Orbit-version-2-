import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminCompanyDetailClient from '@/components/admin/AdminCompanyDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== 'admin') redirect('/customers');
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true, role: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      pendingInvites: {
        orderBy: { createdAt: 'asc' },
      },
      customers: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          pipelineStage: true,
          leadStatus: true,
          companyName: true,
          logoUrl: true,
          customerStage: true,
          healthScore: true,
        },
      },
      _count: { select: { members: true, customers: true } },
    },
  });

  if (!company) redirect('/admin/companies');

  return <AdminCompanyDetailClient company={JSON.parse(JSON.stringify(company))} />;
}
