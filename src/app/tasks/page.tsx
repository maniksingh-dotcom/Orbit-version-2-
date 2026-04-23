import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import KanbanBoard from '@/components/KanbanBoard';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
      </div>
      <KanbanBoard />
    </div>
  );
}
