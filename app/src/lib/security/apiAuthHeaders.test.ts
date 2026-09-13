import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  ensureApiSession,
  resetApiSessionCache,
  setApiUnlockSecret,
  unlockApiSession,
} from "./apiAuthHeaders";

describe("apiAuthHeaders session bootstrap", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    resetApiSessionCache();
    setApiUnlockSecret(null);
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    resetApiSessionCache();
    setApiUnlockSecret(null);
    vi.unstubAllGlobals();
  });

  it("reuses a valid existing session from GET", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await ensureApiSession();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/auth/session");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "GET" });
  });

  it("mints a session via authenticated POST when unlock secret is set", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    setApiUnlockSecret("test-secret-value");
    await ensureApiSession();
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer test-secret-value",
      }),
    });
  });

  it("fails closed when GET is unauthorized and no unlock secret exists", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(ensureApiSession()).rejects.toThrow(/unlock with CODIA_API_SECRET/i);
  });

  it("retries once after a 401 from the provider route", async () => {
    setApiUnlockSecret("test-secret-value");
    mockFetch
      // ensureApiSession initial GET
      .mockResolvedValueOnce({ ok: true, status: 200 })
      // first provider call → expired session
      .mockResolvedValueOnce({ ok: false, status: 401 })
      // re-bootstrap GET → expired
      .mockResolvedValueOnce({ ok: false, status: 401 })
      // re-bootstrap POST unlock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      // retried provider call
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await apiFetch("/api/chat/openai", {
      method: "POST",
      body: "{}",
    });
    expect(res.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(mockFetch.mock.calls[3][0]).toBe("/api/auth/session");
    expect(mockFetch.mock.calls[3][1]).toMatchObject({ method: "POST" });
    expect(mockFetch.mock.calls[4][0]).toBe("/api/chat/openai");
  });

  it("unlockApiSession stores secret and bootstraps", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    await unlockApiSession("test-secret-value");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
