import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest, maxBodyBytesForPath } from "@/lib/security/apiGuard";

/**
 * Enforce shared-secret/session auth, body size, and basic rate limits on /api/** POSTs.
 * POST /api/auth/session still gets body-size + pre-auth rate-limit checks, but skips
 * bearer/session auth so unlock can mint a cookie. Unlock attempts use the separate
 * `api:preauth:<ip>` bucket (see guardApiRequest) and do not consume authenticated quota.
 */
export async function middleware(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isSessionUnlock = pathname.startsWith("/api/auth/session");
  const blocked = await guardApiRequest(request, {
    maxBodyBytes: maxBodyBytesForPath(pathname),
    skipAuth: isSessionUnlock,
  });
  if (blocked) {
    return blocked;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
