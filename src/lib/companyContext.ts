import { prisma } from './prisma';

// Returns the active companyId for a user.
// If requestedCompanyId provided, validates membership. Otherwise returns first membership.
// Returns null if user has no company memberships.
export async function getUserCompanyId(userId: string, requestedCompanyId?: string | null): Promise<string | null> {
  if (requestedCompanyId) {
    const membership = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId: requestedCompanyId, userId } },
    });
    return membership ? requestedCompanyId : null;
  }
  const first = await prisma.companyMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return first?.companyId ?? null;
}
