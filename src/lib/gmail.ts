import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  customerName: string | null;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  hasReply?: boolean;
  replies?: Array<{
    body: string;
    subject: string;
    createdAt: string;
  }>;
}

function decodeBase64(encoded: string): string {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractEmailBody(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown[] }> | null;
}): string {
  if (!payload) return "";

  // Direct body (text/plain or text/html)
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    // Strip HTML tags for plain text display
    return decodeBase64(payload.body.data)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // Multipart: prefer text/plain
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64(textPart.body.data);

    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      return decodeBase64(htmlPart.body.data)
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const nested = extractEmailBody(part as Parameters<typeof extractEmailBody>[0]);
      if (nested) return nested;
    }
  }

  return "";
}

function parseFromHeader(from: string): { name: string; email: string } {
  // Format: "Name <email@example.com>" or just "email@example.com"
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
  }
  return { name: from.trim(), email: from.trim() };
}

function getOAuthClient(account: {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
          ...(tokens.expiry_date && {
            expires_at: Math.floor(tokens.expiry_date / 1000),
          }),
        },
      });
    }
  });

  return oauth2Client;
}

export async function fetchCustomerEmails(userId: string): Promise<GmailMessage[]> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) {
    console.log(`[Gmail] No Google account found for user ${userId}`);
    return [];
  }

  // Get all customer emails from the DB
  const customers = await prisma.customer.findMany({
    where: { email: { not: null } },
    select: { name: true, email: true },
  });

  console.log(`[Gmail] Found ${customers.length} customers with emails:`, customers.map(c => c.email));

  if (customers.length === 0) {
    console.log(`[Gmail] No customers with email addresses found`);
    return [];
  }

  const oauth2Client = getOAuthClient(account);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Build query: recent emails FROM any customer email address (last 90 days)
  const fromQuery = customers
    .map((c) => `from:${c.email}`)
    .join(" OR ");

  // Limit to last 90 days so only recent emails show
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const afterDate = `${ninetyDaysAgo.getFullYear()}/${String(ninetyDaysAgo.getMonth() + 1).padStart(2, "0")}/${String(ninetyDaysAgo.getDate()).padStart(2, "0")}`;
  const query = `(${fromQuery}) after:${afterDate}`;
  console.log(`[Gmail] Search query:`, query);

  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 20,
    });

    const messages = listRes.data.messages || [];
    console.log(`[Gmail] Found ${messages.length} messages matching query`);
    if (messages.length === 0) return [];

    // Fetch each message in parallel
    const results = await Promise.all(
      messages.map(async (msg) => {
        try {
          const detail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id!,
            format: "full",
          });

          const headers = detail.data.payload?.headers || [];
          const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "(no subject)";
          const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
          const date = headers.find((h) => h.name?.toLowerCase() === "date")?.value || "";

          const { name: fromName, email: fromEmail } = parseFromHeader(from);

          // Match to a customer
          const customer = customers.find(
            (c) => c.email?.toLowerCase() === fromEmail.toLowerCase()
          );

          const body = extractEmailBody(detail.data.payload as Parameters<typeof extractEmailBody>[0]);
          const isRead = !(detail.data.labelIds || []).includes("UNREAD");

          // Fetch replies from database
          const replies = await prisma.emailReply.findMany({
            where: { emailMessageId: msg.id! },
            orderBy: { createdAt: 'asc' },
            select: {
              body: true,
              subject: true,
              createdAt: true,
            },
          });

          return {
            id: msg.id!,
            threadId: detail.data.threadId || msg.id!,
            subject,
            from: fromName,
            fromEmail,
            customerName: customer?.name || null,
            snippet: detail.data.snippet || "",
            body,
            date,
            isRead,
            hasReply: replies.length > 0,
            replies: replies.map(r => ({
              body: r.body,
              subject: r.subject,
              createdAt: r.createdAt.toISOString(),
            })),
          } as GmailMessage;
        } catch (err) {
          console.error('Error processing Gmail message:', err);
          return null;
        }
      })
    );

    return results.filter((m): m is GmailMessage => m !== null);
  } catch (error) {
    console.error("Gmail API error:", error);
    return [];
  }
}

export async function sendGmailReply(
  userId: string,
  threadId: string,
  originalMessageId: string,
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account?.access_token) return false;

  const oauth2Client = getOAuthClient(account);
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  // Get sender's email from profile
  try {
    const profile = await gmail.users.getProfile({ userId: "me" });
    const senderEmail = profile.data.emailAddress || "";

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    const emailLines = [
      `From: ${senderEmail}`,
      `To: ${to}`,
      `Subject: ${replySubject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ];

    const raw = Buffer.from(emailLines.join("\r\n"))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw,
        threadId,
      },
    });

    // Save the reply to database
    if (response.data.id) {
      await prisma.emailReply.create({
        data: {
          emailThreadId: threadId,
          emailMessageId: originalMessageId,
          to,
          subject: replySubject,
          body,
          userId,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("Gmail send error:", error);
    return false;
  }
}
