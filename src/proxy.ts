import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // Check for auth session cookie (set by NextAuth)
  const sessionCookie =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    // For API routes, return 401
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/customers/:path*",
    "/admin/:path*",
    "/team",
    "/tasks",
    "/meetings",
    "/meetings/:path*",
    "/api/meetings/:path*",
    "/api/customers/:path*",
    "/api/notes/:path*",
    "/api/documents/:path*",
    "/api/upload/:path*",
    "/api/fathom/upcoming",
    "/api/calendar/:path*",
    "/api/admin/:path*",
    "/api/team-notes/:path*",
    "/api/action-items/:path*",
    "/api/deal-rooms/:path*",
    "/api/users",
    "/api/notifications",
    "/api/notifications/:path*",
    "/api/gmail",
    "/api/gmail/:path*",
    "/api/gmail/debug",
    "/api/ai",
  ],
};
