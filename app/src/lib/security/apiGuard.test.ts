import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MAX_API_BODY_BYTES,
  MAX_VISION_API_BODY_BYTES,
  RATE_LIMIT_MAX_REQUESTS,
  checkBodySize,
  checkRateLimit,
  extractBearerToken,
  getApiAuthHeaders,
  getClientIp,
  getConfiguredApiSecret,
  guardApiRequest,
  maxBodyBytesForPath,
  resetRateLimitBuckets,
  timingSafeEqualString,
} from "./apiGuard";
import { API_SESSION_COOKIE, createSessionToken } from "./apiSession";

function makeRequest(
  options: {
    authorization?: string | null;
    contentLength?: string | null;
    ip?: string;
    cookie?: string;
    path?: string;
  } = {}
): NextRequest {
  const headers = new Headers();
  if (options.authorization !== null && options.authorization !== undefined) {
    headers.set("authorization", options.authorization);
  }
  if (options.contentLength !== null && options.contentLength !== undefined) {
    headers.set("content-length", options.contentLength);
  }
  if (options.ip) {
    headers.set("x-forwarded-for", options.ip);
  }
  if (options.cookie) {
    headers.set("cookie", `${API_SESSION_COOKIE}=${options.cookie}`);
  }
  const path = options.path ?? "/api/chat/openai";
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers,
  });
}

describe("apiGuard", () => {
  const originalSecret = process.env.CODIA_API_SECRET;
  const originalTrustProxy = process.env.CODIA_TRUST_PROXY;

  beforeEach(() => {
    resetRateLimitBuckets();
    process.env.CODIA_API_SECRET = "test-secret-value";
    delete process.env.CODIA_TRUST_PROXY;
  });

  afterEach(() => {
    resetRateLimitBuckets();
    if (originalSecret === undefined) {
      delete process.env.CODIA_API_SECRET;
    } else {
      process.env.CODIA_API_SECRET = originalSecret;
    }
    if (originalTrustProxy === undefined) {
      delete process.env.CODIA_TRUST_PROXY;
    } else {
      process.env.CODIA_TRUST_PROXY = originalTrustProxy;
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

  describe("getConfiguredApiSecret", () => {
    it("reads trimmed secrets", () => {
      expect(getConfiguredApiSecret({ CODIA_API_SECRET: "  abc  " })).toBe(
        "abc"
      );
    });

    it("returns undefined when missing", () => {
      expect(getConfiguredApiSecret({})).toBeUndefined();
    });
  });

  describe("extractBearerToken", () => {
    it("parses Bearer tokens", () => {
      const req = makeRequest({
        authorization: "Bearer my-token",
        contentLength: "10",
      });
      expect(extractBearerToken(req)).toBe("my-token");
    });

    it("returns null when missing or malformed", () => {
      expect(
        extractBearerToken(
          makeRequest({ authorization: null, contentLength: "10" })
        )
      ).toBe(null);
      expect(
        extractBearerToken(
          makeRequest({ authorization: "Basic x", contentLength: "10" })
        )
      ).toBe(null);
    });
  });

  describe("getApiAuthHeaders", () => {
    it("returns JSON content type without embedding a public bearer", () => {
      expect(getApiAuthHeaders()).toEqual({
        "Content-Type": "application/json",
      });
      expect(getApiAuthHeaders({ "X-Custom": "1" })).toEqual({
        "Content-Type": "application/json",
        "X-Custom": "1",
      });
    });
  });

  describe("getClientIp / trust proxy", () => {
    it("ignores spoofable forwarded headers unless CODIA_TRUST_PROXY is set", () => {
      const req = makeRequest({
        authorization: "Bearer test-secret-value",
        contentLength: "10",
        ip: "9.9.9.9",
      });
      expect(getClientIp(req, {})).toBe("direct");
      expect(getClientIp(req, { CODIA_TRUST_PROXY: "true" })).toBe("9.9.9.9");
    });

    it("trusts Vercel forwarding headers when VERCEL=1", () => {
      const req = makeRequest({
        authorization: "Bearer test-secret-value",
        contentLength: "10",
        ip: "203.0.113.10",
      });
      expect(getClientIp(req, { VERCEL: "1" })).toBe("203.0.113.10");
    });

    it("does not use removed NextRequest.ip; falls back to direct", () => {
      const req = makeRequest({
        authorization: "Bearer test-secret-value",
        contentLength: "10",
      });
      Object.defineProperty(req, "ip", {
        value: "10.0.0.1",
        configurable: true,
      });
      expect(getClientIp(req, {})).toBe("direct");
    });
  });

  describe("maxBodyBytesForPath", () => {
    it("uses a larger limit for vision routes", () => {
      expect(maxBodyBytesForPath("/api/chat/openai")).toBe(MAX_API_BODY_BYTES);
      expect(maxBodyBytesForPath("/api/vision/analyze")).toBe(
        MAX_VISION_API_BODY_BYTES
      );
    });
  });

  describe("checkBodySize", () => {
    it("rejects missing Content-Length", async () => {
      const res = checkBodySize(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: null,
        })
      );
      expect(res?.status).toBe(411);
      expect(await res?.json()).toEqual({ error: "Content-Length required" });
    });
  });

  describe("guardApiRequest", () => {
    it("returns 401 when secret config is missing", async () => {
      delete process.env.CODIA_API_SECRET;
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: "10",
        })
      );
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({
        error: "API access not configured",
      });
    });

    it("returns 401 when Authorization and session are missing", async () => {
      const res = await guardApiRequest(
        makeRequest({ authorization: null, contentLength: "10" })
      );
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 when token is invalid", async () => {
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer wrong-secret",
          contentLength: "10",
        })
      );
      expect(res?.status).toBe(401);
      expect(await res?.json()).toEqual({ error: "Unauthorized" });
    });

    it("rate-limits auth failures before exhausting authenticated quota", async () => {
      const env = {
        CODIA_API_SECRET: "test-secret-value",
        CODIA_TRUST_PROXY: "true",
      };
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const res = await guardApiRequest(
          makeRequest({
            authorization: "Bearer wrong-secret",
            contentLength: "10",
            ip: "203.0.113.50",
          }),
          { env }
        );
        expect(res?.status).toBe(401);
      }
      const throttled = await guardApiRequest(
        makeRequest({
          authorization: null,
          contentLength: "10",
          ip: "203.0.113.50",
        }),
        { env }
      );
      expect(throttled?.status).toBe(429);

      // Authenticated callers still have a full separate quota.
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(
          await guardApiRequest(
            makeRequest({
              authorization: "Bearer test-secret-value",
              contentLength: "10",
              ip: "203.0.113.50",
            }),
            { env }
          )
        ).toBeNull();
      }
      const authBlocked = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: "10",
          ip: "203.0.113.50",
        }),
        { env }
      );
      expect(authBlocked?.status).toBe(429);
    });

    it("passes when token matches CODIA_API_SECRET", async () => {
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: "10",
          ip: "1.2.3.4",
        })
      );
      expect(res).toBeNull();
    });

    it("passes when a valid session cookie is present", async () => {
      const token = await createSessionToken("test-secret-value");
      const res = await guardApiRequest(
        makeRequest({
          authorization: null,
          contentLength: "10",
          cookie: token,
        })
      );
      expect(res).toBeNull();
    });

    it("returns 411 when Content-Length is absent", async () => {
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: null,
        })
      );
      expect(res?.status).toBe(411);
    });

    it("returns 413 when Content-Length exceeds limit", async () => {
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: String(5 * 1024 * 1024),
        })
      );
      expect(res?.status).toBe(413);
      const body = await res?.json();
      expect(body.error).toMatch(/too large/i);
    });

    it("allows larger vision bodies under the vision limit", async () => {
      const res = await guardApiRequest(
        makeRequest({
          authorization: "Bearer test-secret-value",
          contentLength: String(20 * 1024 * 1024),
          path: "/api/vision/analyze",
        })
      );
      expect(res).toBeNull();
    });

    it("returns 429 after rate limit is exceeded", async () => {
      const auth = "Bearer test-secret-value";
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        expect(
          await guardApiRequest(
            makeRequest({
              authorization: auth,
              contentLength: "10",
              ip: "9.9.9.9",
            }),
            { env: { CODIA_API_SECRET: "test-secret-value", CODIA_TRUST_PROXY: "true" } }
          )
        ).toBeNull();
      }
      const blocked = await guardApiRequest(
        makeRequest({
          authorization: auth,
          contentLength: "10",
          ip: "9.9.9.9",
        }),
        { env: { CODIA_API_SECRET: "test-secret-value", CODIA_TRUST_PROXY: "true" } }
      );
      expect(blocked?.status).toBe(429);
      expect(await blocked?.json()).toEqual({ error: "Rate limit exceeded" });
      expect(blocked?.headers.get("Retry-After")).toBeTruthy();
    });

    it("skips rate limit when skipRateLimit is set", async () => {
      const auth = "Bearer test-secret-value";
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS + 5; i++) {
        expect(
          await guardApiRequest(
            makeRequest({
              authorization: auth,
              contentLength: "10",
              ip: "8.8.8.8",
            }),
            {
              skipRateLimit: true,
              env: { CODIA_API_SECRET: "test-secret-value", CODIA_TRUST_PROXY: "true" },
            }
          )
        ).toBeNull();
      }
    });

    it("skipAuth still enforces body size without requiring credentials", async () => {
      const oversized = await guardApiRequest(
        makeRequest({
          authorization: null,
          contentLength: String(5 * 1024 * 1024),
          path: "/api/auth/session",
        }),
        { skipAuth: true }
      );
      expect(oversized?.status).toBe(413);

      const missingLength = await guardApiRequest(
        makeRequest({
          authorization: null,
          contentLength: null,
          path: "/api/auth/session",
        }),
        { skipAuth: true }
      );
      expect(missingLength?.status).toBe(411);

      const ok = await guardApiRequest(
        makeRequest({
          authorization: null,
          contentLength: "2",
          path: "/api/auth/session",
        }),
        { skipAuth: true }
      );
      expect(ok).toBeNull();
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
      expect(
        checkRateLimit("k", { now: now + 1001, max: 2, windowMs: 1000 }).allowed
      ).toBe(true);
    });
  });
});
