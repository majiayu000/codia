import { NextRequest, NextResponse } from "next/server";

/** Max JSON/body size for /api/** POST requests (vision base64 needs headroom). */
export const MAX_API_BODY_BYTES = 4 * 1024 * 1024; // 4 MiB

/** Sliding-window rate limit for unauthenticated abuse mitigation. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export type ApiGuardOptions = {
  /** When true, skip incrementing the rate-limit bucket (route re-entry after middleware). */
  skipRateLimit?: boolean;
  maxBodyBytes?: number;
  now?: number;
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

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
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

export function checkBodySize(
  request: NextRequest,
  maxBodyBytes: number = MAX_API_BODY_BYTES
): NextResponse | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > maxBodyBytes) {
      return tooLarge(maxBodyBytes);
    }
  }
  return null;
}

/**
 * Shared-secret + body-size + rate-limit guard for /api/** POST handlers.
 * Fail-closed when CODIA_API_SECRET is unset.
 */
export function guardApiRequest(
  request: NextRequest,
  options: ApiGuardOptions = {}
): NextResponse | null {
  const maxBodyBytes = options.maxBodyBytes ?? MAX_API_BODY_BYTES;
  const bodyBlocked = checkBodySize(request, maxBodyBytes);
  if (bodyBlocked) {
    return bodyBlocked;
  }

  const configured = getConfiguredApiSecret();
  if (!configured) {
    return unauthorized("API access not configured");
  }

  const token = extractBearerToken(request);
  if (!token || !timingSafeEqualString(token, configured)) {
    return unauthorized("Unauthorized");
  }

  if (!options.skipRateLimit) {
    const ip = getClientIp(request);
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
export { getApiAuthHeaders, getClientApiSecret } from "./apiAuthHeaders";
