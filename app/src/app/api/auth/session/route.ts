import { NextRequest, NextResponse } from "next/server";
import {
  extractBearerToken,
  getConfiguredApiSecret,
  timingSafeEqualString,
} from "@/lib/security/apiGuard";
import {
  API_SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/security/apiSession";

export const runtime = "edge";

/**
 * Inspect an existing httpOnly API session.
 * Never mints cookies — unauthenticated callers must not obtain abuse-capable sessions.
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
    return NextResponse.json({ ok: true, authenticated: true });
  }

  return NextResponse.json(
    { ok: false, authenticated: false, error: "No valid API session" },
    { status: 401 }
  );
}

/**
 * Mint or refresh an httpOnly session cookie.
 * Requires Authorization: Bearer <CODIA_API_SECRET> (or matching JSON body.secret).
 */
export async function POST(request: NextRequest) {
  const secret = getConfiguredApiSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "API access not configured" },
      { status: 503 }
    );
  }

  const bearer = extractBearerToken(request);
  let bodySecret: string | null = null;
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { secret?: unknown };
      if (typeof body.secret === "string") {
        bodySecret = body.secret;
      }
    } catch {
      // ignore malformed JSON; bearer may still authenticate
    }
  }

  const presented = bearer || bodySecret;
  if (!presented || !timingSafeEqualString(presented, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true, refreshed: true });
  response.cookies.set(API_SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
