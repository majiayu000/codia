import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  RATE_LIMIT_MAX_REQUESTS,
  checkRateLimit,
  extractBearerToken,
  getApiAuthHeaders,
  getClientApiSecret,
  getConfiguredApiSecret,
  guardApiRequest,
  resetRateLimitBuckets,
  timingSafeEqualString,
} from "./apiGuard";

function makeRequest(
  options: {
    authorization?: string | null;
    contentLength?: string;
    ip?: string;
  } = {}
): NextRequest {
  const headers = new Headers();
  if (options.authorization !== null && options.authorization !== undefined) {
    headers.set("authorization", options.authorization);
  }
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  if (options.ip) {
    headers.set("x-forwarded-for", options.ip);
  }
  return new NextRequest("http://localhost:3000/api/chat/openai", {
    method: "POST",
    headers,
  });
}

describe("apiGuard", () => {
  const originalSecret = process.env.CODIA_API_SECRET;
  const originalPublicSecret = process.env.NEXT_PUBLIC_CODIA_API_SECRET;

  beforeEach(() => {
    resetRateLimitBuckets();
    process.env.CODIA_API_SECRET = "test-secret-value";
    process.env.NEXT_PUBLIC_CODIA_API_SECRET = "test-secret-value";
  });

  afterEach(() => {
    resetRateLimitBuckets();
    if (originalSecret === undefined) {
      delete process.env.CODIA_API_SECRET;
    } else {
      process.env.CODIA_API_SECRET = originalSecret;
    }
    if (originalPublicSecret === undefined) {
      delete process.env.NEXT_PUBLIC_CODIA_API_SECRET;
    } else {
      process.env.NEXT_PUBLIC_CODIA_API_SECRET = originalPublicSecret;
    }
  });

  describe("timingSafeEqualString", () => {
    it("returns true for equal strings", () => {
      expect(timingSafeEqualString("abc", "abc")).toBe(true);
    });

    it("returns false for unequal strings or lengths", () => {
      expect(timingSafeEqualString("abc", "abd")).toBe(false);
      expect(timingSafeEqualString("abc", "ab")).toBe(false);
    });
  });

  describe("getConfiguredApiSecret / getClientApiSecret", () => {
    it("reads trimmed secrets", () => {
      expect(getConfiguredApiSecret({ CODIA_API_SECRET: "  abc  " })).toBe(
        "abc"
      );
      expect(
        getClientApiSecret({ NEXT_PUBLIC_CODIA_API_SECRET: " xyz " })
      ).toBe("xyz");
    });

    it("returns undefined when missing", () => {
      expect(getConfiguredApiSecret({})).toBeUndefined();
      expect(getClientApiSecret({})).toBeUndefined();
    });
  });

  describe("extractBearerToken", () => {
    it("parses Bearer tokens", () => {
      const req = makeRequest({ authorization: "Bearer my-token" });
      expect(extractBearerToken(req)).toBe("my-token");
    });

    it("returns null when missing or malformed", () => {
      expect(extractBearerToken(makeRequest({ authorization: null }))).toBe(
        null
      );
      expect(
        extractBearerToken(makeRequest({ authorization: "Basic x" }))
      ).toBe(null);
    });
  });

  describe("getApiAuthHeaders", () => {
    it("includes Authorization when public secret is set", () => {
      expect(getApiAuthHeaders()).toEqual({
        "Content-Type": "application/json",
        Authorization: "Bearer test-secret-value",
      });
    });

    it("omits Authorization when public secret is unset", () => {
      delete process.env.NEXT_PUBLIC_CODIA_API_SECRET;
      expect(getApiAuthHeaders({ "X-Custom": "1" })).toEqual({
        "Content-Type": "application/json",
        "X-Custom": "1",
      });
    });
  });

  describe("guardApiRequest", () => {
    it("returns 401 when secret config is missing", async () => {
      delete process.env.CODIA_API_SECRET;
      const res = guardApiRequest(
        makeRequest({ authorization: "Bearer test-secret-value" })
      );
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({
        error: "API access not configured",
      });
    });

    it("returns 401 when Authorization is missing", async () => {
      const res = guardApiRequest(makeRequest({ authorization: null }));
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 when token is invalid", async () => {
      const res = guardApiRequest(
        makeRequest({ authorization: "Bearer wrong-secret" })
      );
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({ error: "Unauthorized" });
    });

    it("passes when token matches CODIA_API_SECRET", () => {
      const res = guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          ip: "1.2.3.4",
        })
      );
      expect(res).toBeNull();
    });

    it("returns 413 when Content-Length exceeds limit", async () => {
      const res = guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: String(5 * 1024 * 1024),
        })
      );
      expect(res?.status).toBe(413);
      const body = await res?.json();
      expect(body.error).toMatch(/too large/i);
    });

    it("returns 429 after rate limit is exceeded", async () => {
      const auth = "Bearer test-secret-value";
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(
          guardApiRequest(makeRequest({ authorization: auth, ip: "9.9.9.9" }))
        ).toBeNull();
      }
      const blocked = guardApiRequest(
        makeRequest({ authorization: auth, ip: "9.9.9.9" })
      );
      expect(blocked?.status).toBe(429);
      expect(await blocked?.json()).toEqual({ error: "Rate limit exceeded" });
      expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    });

    it("skips rate limit when skipRateLimit is set", () => {
      const auth = "Bearer test-secret-value";
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS + 5; i++) {
        expect(
          guardApiRequest(
            makeRequest({ authorization: auth, ip: "8.8.8.8" }),
            { skipRateLimit: true }
          )
        ).toBeNull();
      }
    });
  });

  describe("checkRateLimit", () => {
    it("resets after the window", () => {
      const now = 1_000_000;
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(checkRateLimit("k", { now, max: 2, windowMs: 1000 }).allowed).toBe(
          i < 2
        );
      }
      expect(checkRateLimit("k", { now: now + 1001, max: 2, windowMs: 1000 }).allowed).toBe(
        true
      );
    });
  });
});
