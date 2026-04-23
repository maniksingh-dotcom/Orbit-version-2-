import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authGuard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireRole("admin");
  if (!authResult.authorized) return authResult.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function PUT(request: NextRequest) {
  const authResult = await requireRole("admin");
  if (!authResult.authorized) return authResult.response;

  const { userId, role } = await request.json();

  if (!["admin", "manager", "employee"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (userId === authResult.userId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  return NextResponse.json(user);
}
