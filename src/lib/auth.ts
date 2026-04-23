import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  debug: true,
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email ?? '';
      const allowed =
        email === 'singhmanik2019@gmail.com' ||
        email === 'manik_singh@ug29.mesaschool.co' ||
        email === 'int-manik.singh@emversity.com' ||
        email.endsWith('@valencegrowthpartners.com');
      if (allowed) return true;
      try {
        const invite = await prisma.pendingInvite.findFirst({ where: { email } });
        return !!invite;
      } catch {
        return false;
      }
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as unknown as Record<string, unknown>).role as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && user.email === adminEmail) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
      }
      // Process any pending invites for this email
      if (user.email && user.id) {
        const invites = await prisma.pendingInvite.findMany({
          where: { email: user.email },
        });
        if (invites.length > 0) {
          await prisma.$transaction([
            prisma.companyMember.createMany({
              data: invites.map(inv => ({
                companyId: inv.companyId,
                userId: user.id!,
                role: inv.role,
              })),
              skipDuplicates: true,
            }),
            prisma.pendingInvite.deleteMany({ where: { email: user.email! } }),
          ]);
        }
      }
    },
  },
});
