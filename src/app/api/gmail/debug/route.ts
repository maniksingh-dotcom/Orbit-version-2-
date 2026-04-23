import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authGuard";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

export async function GET() {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const account = await prisma.account.findFirst({
    where: { userId: authResult.userId!, provider: "google" },
    select: {
      id: true,
      scope: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });

  const customers = await prisma.customer.findMany({
    select: { name: true, email: true },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No access token", account: null, customers });
  }

  // Try a quick Gmail API call
  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    const testQuery = await gmail.users.messages.list({
      userId: "me",
      maxResults: 5,
    });

    return NextResponse.json({
      accountScope: account.scope,
      tokenExpiresAt: account.expires_at,
      hasAccessToken: !!account.access_token,
      hasRefreshToken: !!account.refresh_token,
      gmailProfile: profile.data.emailAddress,
      totalMessages: profile.data.messagesTotal,
      recentMessages: testQuery.data.messages?.length || 0,
      customers,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      error: String(err),
      accountScope: account.scope,
      hasAccessToken: !!account.access_token,
      customers,
    });
  }
}
