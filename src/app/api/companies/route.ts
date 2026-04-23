import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/authGuard';

export async function GET() {
  const authResult = await requireRole('employee');
  if (!authResult.authorized) return authResult.response;

  let companies;

  if (authResult.userRole === 'admin') {
    companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { members: true, customers: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, image: true, email: true } },
          },
        },
      },
    });
  } else {
    const memberships = await prisma.companyMember.findMany({
      where: { userId: authResult.userId },
      include: {
        company: {
          include: {
            _count: { select: { members: true, customers: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, image: true, email: true } },
              },
            },
          },
        },
      },
    });
    companies = memberships.map((m) => m.company);
  }

  return NextResponse.json(companies);
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole('admin');
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Company name required' }, { status: 400 });
  }

  const company = await prisma.company.create({
    data: {
      name: body.name.trim(),
      logoUrl: body.logoUrl || null,
      createdById: authResult.userId!,
      members: {
        create: { userId: authResult.userId!, role: 'owner' },
      },
    },
    include: {
      _count: { select: { members: true, customers: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(company, { status: 201 });
}
