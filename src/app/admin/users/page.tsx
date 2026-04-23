import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserManagement from "@/components/UserManagement";

export default async function UsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") redirect("/customers");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="container" style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-xl)' }}>
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
      </div>
      <UserManagement users={JSON.parse(JSON.stringify(users))} currentUserId={session.user.id} />
    </div>
  );
}
