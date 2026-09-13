/**
 * Client-safe helpers for same-origin /api fetchers.
 * Keep this module free of next/server imports.
 *
 * Browser clients authenticate via an httpOnly session cookie minted by
 * `POST /api/auth/session` after proving CODIA_API_SECRET (unlock). Never
 * embed the API bearer in NEXT_PUBLIC_* — that would publish it to every visitor.
 * Never persist the unlock secret in sessionStorage/localStorage; keep it only
 * in memory for the current page so XSS cannot exfiltrate it after reload and
 * renewal requires a fresh unlock when the cookie expires without an in-memory
 * secret.
 *
 * Lock/unlock is broadcast across same-origin tabs via BroadcastChannel so a
 * Lock in one tab clears in-memory secrets elsewhere and cannot be undone by
 * apiFetch's 401 remint path.
 */

const SESSION_LOCK_CHANNEL = "codia-api-session";

type SessionLockMessage = { type: "lock" } | { type: "unlock" };
type SessionMutation = "lock" | "unlock";

let sessionReady: Promise<void> | null = null;
/** In-memory only — never written to Web Storage. */
let unlockSecret: string | null = null;
/**
 * Bumped on every Lock (local or broadcast) so an in-flight mint that started
 * before the lock can detect staleness and revoke the cookie it just set.
 */
let lockGeneration = 0;
/**
 * Last lock/unlock mutation observed locally or via BroadcastChannel.
 * Stale mint cleanup must only DELETE when the latest mutation is still a
 * lock — a later unlock (this tab or a peer) may have already reminted a
 * valid cookie that must not be revoked.
 */
let lastSessionMutation: SessionMutation | null = null;
let sessionLockChannel: BroadcastChannel | null | undefined;
let sessionLockListenerAttached = false;

function getSessionLockChannel(): BroadcastChannel | null {
  if (sessionLockChannel !== undefined) {
    return sessionLockChannel;
  }
  if (typeof BroadcastChannel === "undefined") {
    sessionLockChannel = null;
    return null;
  }
  try {
    sessionLockChannel = new BroadcastChannel(SESSION_LOCK_CHANNEL);
  } catch {
    sessionLockChannel = null;
  }
  return sessionLockChannel;
}

function clearLocalSessionState(): void {
  unlockSecret = null;
  sessionReady = null;
  lockGeneration += 1;
  lastSessionMutation = "lock";
}

function noteSessionUnlock(): void {
  lastSessionMutation = "unlock";
}

/**
 * Revoke a cookie produced by a stale in-flight mint only when no newer
 * unlock has superseded the lock that invalidated this attempt.
 */
async function revokeStaleMintCookie(): Promise<void> {
  if (lastSessionMutation !== "lock") {
    return;
  }
  await revokeSessionCookie();
}

function broadcastSessionLock(type: SessionLockMessage["type"]): void {
  ensureSessionLockListener();
  const channel = getSessionLockChannel();
  if (!channel) {
    return;
  }
  try {
    channel.postMessage({ type } satisfies SessionLockMessage);
  } catch (error) {
    // Channel may be closed; local lock/unlock state is already applied.
    if (typeof console !== "undefined") {
      console.warn("codia: failed to broadcast API session lock state", error);
    }
  }
}

/** Listen for Lock from other tabs so retained secrets cannot remint the cookie. */
export function ensureSessionLockListener(): void {
  if (sessionLockListenerAttached) {
    return;
  }
  const channel = getSessionLockChannel();
  if (!channel) {
    return;
  }
  channel.addEventListener("message", (event: MessageEvent<SessionLockMessage>) => {
    if (event.data?.type === "lock") {
      clearLocalSessionState();
    } else if (event.data?.type === "unlock") {
      // Peer unlock reminted the shared cookie; do not restore unlockSecret
      // (this tab may not have the secret), but mark the mutation so a stale
      // pre-lock mint does not DELETE the newer session.
      noteSessionUnlock();
    }
  });
  sessionLockListenerAttached = true;
}

ensureSessionLockListener();

/** Provide CODIA_API_SECRET once so the client can mint an httpOnly session. */
export function setApiUnlockSecret(secret: string | null): void {
  ensureSessionLockListener();
  unlockSecret = secret?.trim() || null;
  sessionReady = null;
}

export function getApiUnlockSecret(): string | null {
  return unlockSecret;
}

async function revokeSessionCookie(): Promise<void> {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("codia: failed to revoke stale API session cookie", error);
    }
  }
}

async function bootstrapSession(): Promise<void> {
  const generationAtStart = lockGeneration;
  const status = await fetch("/api/auth/session", {
    method: "GET",
    credentials: "include",
  });
  if (generationAtStart !== lockGeneration) {
    throw new Error("API session mint aborted by lock");
  }
  if (status.ok) {
    return;
  }

  const secret = getApiUnlockSecret();
  if (!secret) {
    throw new Error(
      "API session unavailable: unlock with CODIA_API_SECRET (Settings → AI Model) or send Authorization: Bearer"
    );
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (generationAtStart !== lockGeneration) {
    // Lock won the race: revoke only if no newer unlock reminted the cookie.
    await revokeStaleMintCookie();
    throw new Error("API session mint aborted by lock");
  }
  if (!response.ok) {
    throw new Error(`API session unlock failed: ${response.status}`);
  }
}

/** Ensure a server-issued session cookie is present before calling /api. */
export async function ensureApiSession(): Promise<void> {
  ensureSessionLockListener();
  if (!sessionReady) {
    sessionReady = bootstrapSession().catch((error) => {
      sessionReady = null;
      throw error;
    });
  }
  return sessionReady;
}

/**
 * Mint a session immediately with the shared secret (operator unlock).
 * Always POSTs so a typo cannot succeed via an existing cookie GET.
 * Keeps the secret in memory only (never sessionStorage) after the server
 * accepts it, so the httpOnly cookie remains the durable client credential.
 */
export async function unlockApiSession(secret: string): Promise<void> {
  ensureSessionLockListener();
  const trimmed = secret.trim();
  if (!trimmed) {
    throw new Error("API unlock secret required");
  }

  // Capture generation so a cross-tab Lock during this POST cannot be undone by
  // restoring unlockSecret/sessionReady (or by a Set-Cookie that races DELETE).
  const generationAtStart = lockGeneration;

  const response = await fetch("/api/auth/session", {
    method: "POST",
    credentials: "include",
    headers: {
      Authorization: `Bearer ${trimmed}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (generationAtStart !== lockGeneration) {
    // Lock won the race: revoke only if no newer unlock reminted the cookie.
    await revokeStaleMintCookie();
    throw new Error("API session unlock aborted by lock");
  }
  if (!response.ok) {
    throw new Error(`API session unlock failed: ${response.status}`);
  }

  unlockSecret = trimmed;
  sessionReady = Promise.resolve();
  noteSessionUnlock();
  broadcastSessionLock("unlock");
}

/**
 * Clear the httpOnly API session cookie and in-memory unlock secret.
 * Broadcasts Lock to other same-origin tabs so they drop retained secrets and
 * cannot remint the cookie after shared-machine handoff.
 */
export async function lockApiSession(): Promise<void> {
  ensureSessionLockListener();
  clearLocalSessionState();
  // Notify sibling tabs before deleting the cookie so their 401 retry cannot remint.
  broadcastSessionLock("lock");
  const response = await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`API session lock failed: ${response.status}`);
  }
}

/** Reset cached session bootstrap (tests). */
export function resetApiSessionCache(): void {
  unlockSecret = null;
  sessionReady = null;
  lockGeneration += 1;
  lastSessionMutation = null;
}

/**
 * JSON headers for same-origin /api calls.
 * Auth is the httpOnly session cookie (credentials: "include"), not a
 * public bearer secret.
 */
export function getApiAuthHeaders(
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Same-origin authenticated fetch for browser/demo clients. */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  await ensureApiSession();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body != null) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers,
  });

  // Only remint+retry when our session cookie is actually invalid. Upstream
  // providers (Kokoro/ElevenLabs/etc.) may also return 401 while the Codia
  // session remains valid — retrying those would double-hit rate limits.
  if (response.status === 401) {
    sessionReady = null;
    const sessionStatus = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    });
    if (sessionStatus.ok) {
      sessionReady = Promise.resolve();
      return response;
    }
    await ensureApiSession();
    return fetch(input, {
      ...init,
      credentials: "include",
      headers,
    });
  }

  return response;
}
