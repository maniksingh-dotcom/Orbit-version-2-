import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;
  const { id: customerId } = await params;

  const [activities, notes, meetings, completedTasks] = await Promise.all([
    prisma.customerActivity.findMany({
      where: { customerId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.note.findMany({
      where: { customerId },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.meetingSummary.findMany({
      where: { customerId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.actionItem.findMany({
      where: { customerId, status: 'done' },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ]);

  const feed = [
    ...activities.map((a) => ({ ...a, feedType: 'activity' as const })),
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      type: 'note',
      feedType: 'note' as const,
      title: n.title,
      description: n.content.slice(0, 120),
      createdAt: n.createdAt,
      user: n.user,
    })),
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      type: 'call',
      feedType: 'meeting' as const,
      title: m.title,
      description: m.summary?.slice(0, 120) ?? null,
      createdAt: m.date,
      user: null,
    })),
    ...completedTasks.map((t) => ({
      id: `task-${t.id}`,
      type: 'task',
      feedType: 'task' as const,
      title: `Completed: ${t.title}`,
      description: t.notes?.slice(0, 120) ?? null,
      createdAt: t.updatedAt,
      user: t.user,
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(feed);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;
  const { id: customerId } = await params;
  const body = await request.json();

  const activity = await prisma.customerActivity.create({
    data: {
      customerId,
      userId: authResult.userId!,
      type: body.type || 'note',
      title: body.title,
      description: body.description ?? null,
      metadata: body.metadata ?? null,
    },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(activity, { status: 201 });
}
