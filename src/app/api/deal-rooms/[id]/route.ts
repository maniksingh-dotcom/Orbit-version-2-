import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    await prisma.group.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;
  const body = await request.json();

  // Add or remove a customer from a group
  if (body.action === 'add' && body.customerId) {
    try {
      await prisma.groupMember.create({
        data: { groupId: id, customerId: body.customerId },
      });
      const updated = await prisma.group.findUnique({
        where: { id },
        include: { members: { include: { customer: { select: { id: true, name: true, companyName: true, logoUrl: true, customerType: true, email: true } } } } },
      });
      return NextResponse.json(updated);
    } catch {
      // Unique constraint violation — already in group
      return NextResponse.json({ error: 'Customer already in this group' }, { status: 409 });
    }
  }

  if (body.action === 'remove' && body.customerId) {
    await prisma.groupMember.deleteMany({
      where: { groupId: id, customerId: body.customerId },
    });
    const updated = await prisma.group.findUnique({
      where: { id },
      include: { members: { include: { customer: { select: { id: true, name: true, companyName: true, logoUrl: true, customerType: true, email: true } } } } },
    });
    return NextResponse.json(updated);
  }

  if (body.name !== undefined) {
    const updated = await prisma.group.update({
      where: { id },
      data: { name: body.name.trim(), description: body.description?.trim() || null },
      include: { members: { include: { customer: { select: { id: true, name: true, companyName: true, logoUrl: true, customerType: true, email: true } } } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
