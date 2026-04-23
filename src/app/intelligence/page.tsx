import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import IntelligenceDashboard from './IntelligenceDashboard';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
  const session = await auth();
  if (!session) redirect('/login');

  return <IntelligenceDashboard />;
}
