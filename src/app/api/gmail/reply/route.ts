import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authGuard";
import { sendGmailReply } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  const { messageId, threadId, to, subject, body } = await req.json();

  if (!messageId || !threadId || !to || !body) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const success = await sendGmailReply(authResult.userId!, threadId, messageId, to, subject || "", body);

  if (!success) {
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
