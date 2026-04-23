import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export type Role = "admin" | "employee";

const ROLE_HIERARCHY: Record<Role, number> = {
  employee: 1,
  admin: 2,
};

export async function requireRole(minimumRole: Role = "employee") {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = (session.user.role || "employee") as Role;
  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    authorized: true as const,
    session,
    userId: session.user.id,
    userRole,
  };
}
