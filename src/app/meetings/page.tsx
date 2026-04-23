import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MeetingsTabs from './MeetingsTabs';

export default async function MeetingsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return <MeetingsTabs userName={session.user?.name || 'there'} />;
}
