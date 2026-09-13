import { NextRequest, NextResponse } from "next/server";
import { getConfiguredApiSecret } from "@/lib/security/apiGuard";
import {
  API_SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/security/apiSession";

export const runtime = "edge";

/**
 * Issue or refresh an httpOnly same-origin API session cookie.
 * The cookie is signed with server-only CODIA_API_SECRET so browser clients
 * never need a NEXT_PUBLIC bearer credential.
 */
export async function GET(request: NextRequest) {
  const secret = getConfiguredApiSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "API access not configured" },
      { status: 503 }
    );
  }

  const existing = request.cookies.get(API_SESSION_COOKIE)?.value;
  if (existing && (await verifySessionToken(secret, existing))) {
    return NextResponse.json({ ok: true, refreshed: false });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true, refreshed: true });
  response.cookies.set(API_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
