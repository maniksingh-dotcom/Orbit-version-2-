import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

// API endpoint to lookup groups by name for Google Meet auto-invite
export async function GET() {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  try {
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        members: {
          select: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform to simpler structure for autocomplete
    const groupsWithEmails = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      memberEmails: group.members
        .map(m => m.customer.email)
        .filter((email): email is string => !!email),
    }));

    return NextResponse.json(groupsWithEmails);
  } catch (error) {
    console.error('Error looking up groups:', error);
    return NextResponse.json({ error: 'Failed to lookup groups' }, { status: 500 });
  }
}
