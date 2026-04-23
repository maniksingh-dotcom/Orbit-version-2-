import { useSession } from "next-auth/react";
import type { Role } from "@/lib/authGuard";

const ROLE_HIERARCHY: Record<Role, number> = {
  employee: 1,
  admin: 2,
};

export function useRole() {
  const { data: session } = useSession();
  const role = (session?.user?.role || "employee") as Role;

  return {
    role,
    isAdmin: role === "admin",
    canDo: (minimumRole: Role) => ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimumRole],
    userName: session?.user?.name || "Unknown",
    userId: session?.user?.id,
  };
}
