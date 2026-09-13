import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest, maxBodyBytesForPath } from "@/lib/security/apiGuard";

/**
 * Enforce shared-secret/session auth, body size, and basic rate limits on /api/** POSTs.
 * Excludes /api/auth/session (cookie bootstrap is GET-only).
 */
export async function middleware(request: NextRequest) {
  if (request.method === "POST") {
    const blocked = await guardApiRequest(request, {
      maxBodyBytes: maxBodyBytesForPath(request.nextUrl.pathname),
    });
    if (blocked) {
      return blocked;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
