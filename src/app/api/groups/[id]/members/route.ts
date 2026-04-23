import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const { id } = await params;

  try {
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true,
                customerType: true
              },
            },
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Return list of member emails for Google Calendar invite
    const memberEmails = group.members
      .map(m => m.customer.email)
      .filter((email): email is string => !!email); // Filter out null emails

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
      },
      members: group.members.map(m => m.customer),
      memberEmails,
    });
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: 'Failed to fetch group members' }, { status: 500 });
  }
}
