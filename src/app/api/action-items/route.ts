import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const customerId = request.nextUrl.searchParams.get('customerId');
  const groupId = request.nextUrl.searchParams.get('groupId') || request.nextUrl.searchParams.get('dealRoomId'); // Support both for backward compatibility
  const companyId = request.headers.get('X-Company-Id');

  const where: Record<string, unknown> = {};
  if (customerId) where.customerId = customerId;
  if (groupId) where.groupId = groupId;

  if (companyId && !customerId && !groupId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: authResult.userId! } },
    });
    if (membership) {
      where.companyId = companyId;
    } else {
      where.userId = authResult.userId;
    }
  } else if (!customerId && !groupId) {
    where.userId = authResult.userId;
  }

  const items = await prisma.actionItem.findMany({
    where,
    orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    include: {
      user: { select: { id: true, name: true, image: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const { title, status, assigneeId, meetingId, customerId, groupId, dealRoomId, dueDate, priority, taskType, notes, reminderAt, companyId } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const resolvedStatus = status || 'todo';

  const item = await prisma.actionItem.create({
    data: {
      title: title.trim(),
      status: resolvedStatus,
      completed: resolvedStatus === 'done',
      userId: authResult.userId!,
      assigneeId: assigneeId || null,
      meetingId: meetingId || null,
      customerId: customerId || null,
      groupId: groupId || dealRoomId || null,
      companyId: companyId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      taskType: taskType || 'todo',
      notes: notes || null,
      reminderAt: reminderAt ? new Date(reminderAt) : null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      customer: { select: { id: true, name: true } },
    },
  });

  // Create notification for the assignee when @mentioned
  if (assigneeId) {
    try {
      const fromUser = await prisma.user.findUnique({
        where: { id: authResult.userId! },
        select: { name: true },
      });
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          fromId: authResult.userId!,
          type: 'mention',
          message: `${fromUser?.name || 'Someone'} assigned you a task: "${title.trim()}"`,
          link: '/tasks',
        },
      });
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  }

  return NextResponse.json(item, { status: 201 });
}
