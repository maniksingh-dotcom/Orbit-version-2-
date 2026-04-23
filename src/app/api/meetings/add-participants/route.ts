import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/authGuard';
import { prisma } from '@/lib/prisma';

interface Participant {
  name: string;
  email: string;
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const participants: Participant[] = body.participants || [];

  if (!participants.length) {
    return NextResponse.json({ error: 'No participants provided' }, { status: 400 });
  }

  const created: string[] = [];
  const existing: string[] = [];

  // Create or find customers for each participant
  const customerIds: string[] = [];
  for (const p of participants) {
    if (!p.email) continue;

    const existingCustomer = await prisma.customer.findFirst({
      where: { email: p.email.toLowerCase() },
    });

    if (existingCustomer) {
      existing.push(p.name || p.email);
      customerIds.push(existingCustomer.id);
    } else {
      const newCustomer = await prisma.customer.create({
        data: {
          name: p.name || p.email.split('@')[0],
          email: p.email.toLowerCase(),
          customerType: 'individual',
          userId: authResult.userId!,
        },
      });
      created.push(p.name || p.email);
      customerIds.push(newCustomer.id);
    }
  }

  // Auto-create DealRoom grouped by domain if multiple participants share a domain
  const domainGroups: Record<string, { participants: Participant[]; customerIds: string[] }> = {};
  participants.forEach((p, i) => {
    if (!p.email) return;
    const domain = p.email.split('@')[1];
    // Skip common personal/generic domains
    const skipDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'];
    if (!domain || skipDomains.includes(domain.toLowerCase())) return;
    if (!domainGroups[domain]) domainGroups[domain] = { participants: [], customerIds: [] };
    domainGroups[domain].participants.push(p);
    domainGroups[domain].customerIds.push(customerIds[i]);
  });

  const dealRoomsCreated: string[] = [];
  for (const [domain, group] of Object.entries(domainGroups)) {
    if (group.participants.length < 1) continue;
    // Name after domain (e.g. "quickly.com" → "Quickly")
    const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);

    // Check if a Group with this name already exists
    const existingRoom = await prisma.group.findFirst({
      where: { name: { equals: companyName, mode: 'insensitive' } },
    });

    if (!existingRoom) {
      const room = await prisma.group.create({
        data: {
          name: companyName,
          description: `Auto-created from meeting participants at ${domain}`,
          members: {
            create: group.customerIds.map((cId) => ({ customerId: cId })),
          },
        },
      });
      dealRoomsCreated.push(room.name);
    } else {
      // Add customers to existing group if not already there
      for (const cId of group.customerIds) {
        const alreadyIn = await prisma.groupMember.findFirst({
          where: { groupId: existingRoom.id, customerId: cId },
        });
        if (!alreadyIn) {
          await prisma.groupMember.create({
            data: { groupId: existingRoom.id, customerId: cId },
          });
        }
      }
    }
  }

  return NextResponse.json({
    created,
    existing,
    dealRoomsCreated,
    total: customerIds.length,
  });
}
