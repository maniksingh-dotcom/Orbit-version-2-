import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PipelinePage from './PipelinePage';

export const dynamic = 'force-dynamic';

export default async function Pipeline() {
  const session = await auth();
  if (!session) redirect('/login');
  return <PipelinePage />;
}
