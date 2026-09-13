import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  ensureApiSession,
  getApiUnlockSecret,
  lockApiSession,
  resetApiSessionCache,
  setApiUnlockSecret,
  unlockApiSession,
} from "./apiAuthHeaders";

describe("apiAuthHeaders session bootstrap", () => {
  const mockFetch = vi.fn();
  const sessionStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  beforeEach(() => {
    resetApiSessionCache();
    setApiUnlockSecret(null);
    vi.stubGlobal("fetch", mockFetch);
    vi.stubGlobal("sessionStorage", sessionStorageMock);
    mockFetch.mockReset();
    sessionStorageMock.getItem.mockReset();
    sessionStorageMock.setItem.mockReset();
    sessionStorageMock.removeItem.mockReset();
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

  it("unlockApiSession always POSTs and keeps secret in memory only after success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await unlockApiSession("test-secret-value");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/auth/session");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer test-secret-value",
      }),
    });
    expect(getApiUnlockSecret()).toBe("test-secret-value");
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    expect(sessionStorageMock.getItem).not.toHaveBeenCalled();
  });

  it("unlockApiSession does not keep secret in memory when POST fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(unlockApiSession("wrong-secret")).rejects.toThrow(
      /API session unlock failed: 401/
    );
    expect(getApiUnlockSecret()).toBeNull();
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    // Subsequent ensureApiSession should not find an unlock secret.
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    await expect(ensureApiSession()).rejects.toThrow(/unlock with CODIA_API_SECRET/i);
  });

  it("unlockApiSession does not short-circuit on an existing valid cookie", async () => {
    // Pre-existing cookie would make GET succeed; unlock must still POST.
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await unlockApiSession("fresh-secret");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: "POST" });
  });

  it("setApiUnlockSecret never writes to sessionStorage", () => {
    setApiUnlockSecret("memory-only-secret");
    expect(getApiUnlockSecret()).toBe("memory-only-secret");
    expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    setApiUnlockSecret(null);
    expect(getApiUnlockSecret()).toBeNull();
    expect(sessionStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it("lockApiSession clears in-memory secret and DELETEs the session cookie", async () => {
    setApiUnlockSecret("memory-only-secret");
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await lockApiSession();
    expect(getApiUnlockSecret()).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/auth/session");
    expect(mockFetch.mock.calls[0][1]).toMatchObject({
      method: "DELETE",
      credentials: "include",
    });
  });
});
