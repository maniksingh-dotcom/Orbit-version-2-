import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LeadsDashboard from './LeadsDashboard';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const session = await auth();
  if (!session) redirect('/login');
  return <LeadsDashboard />;
}
