import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest, maxBodyBytesForPath } from "@/lib/security/apiGuard";

/**
 * Enforce shared-secret/session auth, body size, and basic rate limits on /api/** POSTs.
 * Skips /api/auth/session — that route authenticates minting with CODIA_API_SECRET itself.
 */
export async function middleware(request: NextRequest) {
  if (
    request.method === "POST" &&
    !request.nextUrl.pathname.startsWith("/api/auth/session")
  ) {
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
