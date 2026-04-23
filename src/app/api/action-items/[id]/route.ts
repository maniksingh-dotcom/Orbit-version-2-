import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  const prevItem = await prisma.actionItem.findUnique({ where: { id } });

  if (body.completed !== undefined) {
    updateData.completed = body.completed;
    if (body.completed) updateData.status = 'done';
  }
  if (body.status !== undefined) {
    updateData.status = body.status;
    updateData.completed = body.status === 'done';
  }
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.taskType !== undefined) updateData.taskType = body.taskType;
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.reminderAt !== undefined) {
    updateData.reminderAt = body.reminderAt ? new Date(body.reminderAt) : null;
  }

  const item = await prisma.actionItem.update({
    where: { id },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, image: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  // Notify task creator when status changes to done
  const newStatus = body.status || (body.completed ? 'done' : null);
  if (newStatus === 'done' && prevItem && prevItem.status !== 'done' && prevItem.userId !== authResult.userId) {
    try {
      const assignee = await prisma.user.findUnique({
        where: { id: authResult.userId! },
        select: { name: true },
      });
      await prisma.notification.create({
        data: {
          userId: prevItem.userId,
          fromId: authResult.userId!,
          type: 'task_done',
          message: `${assignee?.name || 'Someone'} completed: "${prevItem.title}"`,
          link: '/tasks',
        },
      });
    } catch {
      // non-critical
    }
  }

  return NextResponse.json(item);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  await prisma.actionItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
