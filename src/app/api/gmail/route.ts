import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authGuard";
import { fetchCustomerEmails } from "@/lib/gmail";

export async function GET() {
  const authResult = await requireRole("employee");
  if (!authResult.authorized) return authResult.response;

  try {
    const emails = await fetchCustomerEmails(authResult.userId!);
    console.log(`Fetched ${emails.length} emails for user ${authResult.userId}`);
    return NextResponse.json(emails);
  } catch (error) {
    console.error("Gmail API route error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Failed to fetch emails",
      details: errorMessage,
      hint: "You may need to sign out and sign in again to grant Gmail permissions"
    }, { status: 500 });
  }
}
