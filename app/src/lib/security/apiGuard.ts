import { NextRequest, NextResponse } from "next/server";
import {
  API_SESSION_COOKIE,
  verifySessionToken,
} from "./apiSession";

/** Default max JSON/body size for /api/** POST requests. */
export const MAX_API_BODY_BYTES = 4 * 1024 * 1024; // 4 MiB

/**
 * Vision accepts up to 20 MiB raw images; base64 + JSON wrapper needs headroom
 * (~20 MiB * 4/3 ≈ 27 MiB). Use 32 MiB for /api/vision/**.
 */
export const MAX_VISION_API_BODY_BYTES = 32 * 1024 * 1024;

/** Sliding-window rate limit for unauthenticated abuse mitigation. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export type ApiGuardOptions = {
  /** When true, skip incrementing the rate-limit bucket (route re-entry after middleware). */
  skipRateLimit?: boolean;
  /**
   * When true, enforce body size (+ optional rate limit) without requiring
   * Bearer/session auth. Used for POST /api/auth/session unlock minting.
   */
  skipAuth?: boolean;
  maxBodyBytes?: number;
  now?: number;
  /** Override env for tests (CODIA_API_SECRET / CODIA_TRUST_PROXY). */
  env?: NodeJS.ProcessEnv;
};

/**
 * Timing-safe string compare for secrets of equal length.
 * Returns false when lengths differ (avoids leaking length via early return timing of crypto).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function getConfiguredApiSecret(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const secret = env.CODIA_API_SECRET?.trim();
  return secret || undefined;
}

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

function trustProxyEnabled(env: NodeJS.ProcessEnv): boolean {
  const value = env.CODIA_TRUST_PROXY?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

/** Vercel sets forwarding headers at the edge; Next 16 no longer exposes request.ip. */
function isVercelRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || env.VERCEL === "true";
}

function ipFromForwardingHeaders(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/**
 * Rate-limit client identity.
 * Forwarding headers are trusted when CODIA_TRUST_PROXY is enabled or when
 * running on Vercel (platform-injected X-Forwarded-For). Next.js 16 removed
 * `request.ip`, so self-hosted deployments without a trusted proxy share a
 * single non-spoofable "direct" bucket instead of trusting client headers.
 */
export function getClientIp(
  request: NextRequest,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (trustProxyEnabled(env) || isVercelRuntime(env)) {
    return ipFromForwardingHeaders(request);
  }

  return "direct";
}

/** Path-aware body limit (vision needs larger base64 payloads). */
export function maxBodyBytesForPath(pathname: string): number {
  if (pathname.startsWith("/api/vision/")) {
    return MAX_VISION_API_BODY_BYTES;
  }
  return MAX_API_BODY_BYTES;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

function tooLarge(maxBytes: number): NextResponse {
  return NextResponse.json(
    { error: `Request body too large (max ${maxBytes} bytes)` },
    { status: 413 }
  );
}

function lengthRequired(): NextResponse {
  return NextResponse.json(
    { error: "Content-Length required" },
    { status: 411 }
  );
}

function tooManyRequests(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

/**
 * In-memory fixed-window rate limiter (per process / edge isolate).
 * Suitable as a basic abuse brake, not a distributed quota.
 */
export function checkRateLimit(
  key: string,
  options: { now?: number; windowMs?: number; max?: number } = {}
): { allowed: boolean; retryAfterSec: number } {
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? RATE_LIMIT_MAX_REQUESTS;

  const existing = rateLimitBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) };
}

/** Test helper: clear rate-limit state between cases. */
export function resetRateLimitBuckets(): void {
  rateLimitBuckets.clear();
}

/**
 * Enforce Content-Length presence and max size.
 * Rejects missing/non-numeric Content-Length so chunked bodies cannot bypass the limit.
 */
export function checkBodySize(
  request: NextRequest,
  maxBodyBytes: number = MAX_API_BODY_BYTES
): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength == null || contentLength.trim() === "") {
    return lengthRequired();
  }
  const length = Number(contentLength);
  if (!Number.isFinite(length) || length < 0) {
    return lengthRequired();
  }
  if (length > maxBodyBytes) {
    return tooLarge(maxBodyBytes);
  }
  return null;
}

async function hasValidSession(
  request: NextRequest,
  secret: string,
  now: number
): Promise<boolean> {
  const token = request.cookies.get(API_SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return verifySessionToken(secret, token, now);
}

/**
 * Shared-secret / session + body-size + rate-limit guard for /api/** POST handlers.
 * Fail-closed when CODIA_API_SECRET is unset.
 * Accepts Authorization: Bearer <CODIA_API_SECRET> or a valid httpOnly session cookie.
 *
 * Auth failures use a separate rate-limit bucket (`api:authfail:<ip>`) so probing
 * is throttled without exhausting the authenticated caller quota (`api:<ip>`).
 */
export async function guardApiRequest(
  request: NextRequest,
  options: ApiGuardOptions = {}
): Promise<NextResponse | null> {
  const env = options.env ?? process.env;
  const maxBodyBytes =
    options.maxBodyBytes ?? maxBodyBytesForPath(request.nextUrl.pathname);
  const bodyBlocked = checkBodySize(request, maxBodyBytes);
  if (bodyBlocked) {
    return bodyBlocked;
  }

  const ip = getClientIp(request, env);

  if (!options.skipAuth) {
    const configured = getConfiguredApiSecret(env);
    if (!configured) {
      if (!options.skipRateLimit) {
        const { allowed, retryAfterSec } = checkRateLimit(`api:authfail:${ip}`, {
          now: options.now,
        });
        if (!allowed) {
          return tooManyRequests(retryAfterSec);
        }
      }
      return unauthorized("API access not configured");
    }

    const now = options.now ?? Date.now();
    const token = extractBearerToken(request);
    const bearerOk =
      !!token && timingSafeEqualString(token, configured);
    const sessionOk = bearerOk
      ? false
      : await hasValidSession(request, configured, now);

    if (!bearerOk && !sessionOk) {
      // Throttle credential probing before returning 401.
      if (!options.skipRateLimit) {
        const { allowed, retryAfterSec } = checkRateLimit(`api:authfail:${ip}`, {
          now: options.now,
        });
        if (!allowed) {
          return tooManyRequests(retryAfterSec);
        }
      }
      return unauthorized("Unauthorized");
    }
  }

  if (!options.skipRateLimit) {
    const { allowed, retryAfterSec } = checkRateLimit(`api:${ip}`, {
      now: options.now,
    });
    if (!allowed) {
      return tooManyRequests(retryAfterSec);
    }
  }

  return null;
}

// Re-export client helpers for convenience in server/tests.
export {
  apiFetch,
  ensureApiSession,
  getApiAuthHeaders,
  setApiUnlockSecret,
  unlockApiSession,
} from "./apiAuthHeaders";
