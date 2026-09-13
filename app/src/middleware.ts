import { NextRequest, NextResponse } from "next/server";
import { guardApiRequest } from "@/lib/security/apiGuard";

/**
 * Enforce shared-secret auth, body size, and basic rate limits on /api/** POSTs.
 */
export function middleware(request: NextRequest) {
  if (request.method === "POST") {
    const blocked = guardApiRequest(request);
    if (blocked) {
      return blocked;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
