import { timingSafeEqual } from "crypto";
import { getServerClient } from "./supabase";
import { serverEnv } from "./env";
import { signToken, verifyToken, base64urlEncode, base64urlDecode } from "./auth/jwt";
import { parseCookies, sessionCookieOptions } from "./auth/cookies";

// ============================================================
// Client portal authentication (server-side only)
// ============================================================
// TWO login methods share the same `odg_client` session cookie:
//
//   1. Phone-last-4 (legacy /client route): the client enters their
//      email + the last 4 digits of the phone we have on file.
//
//   2. Magic link (new /portal route): the client enters only their
//      email → we send a short-lived HMAC-signed link to that email
//      → clicking the link calls /api/client-portal/verify, which
//      exchanges the short-lived magic token for a long-lived
//      session cookie.
//
// Sessions are httpOnly cookies (name: `odg_client`) containing an
// HMAC-signed token. The token payload includes clientId + issuedAt.
//
// REFACTOR (refactor/total):
//   - JWT sign/verify delegated to `lib/auth/jwt.ts` (was duplicated).
//   - Cookie parsing delegated to `lib/auth/cookies.ts` (was duplicated).
//   - Secrets come from `serverEnv.CLIENT_SECRET` (validated in lib/env.ts).
//   - Magic-link tokens now carry a single-use nonce (audit §2.10):
//     once verified, the nonce is added to an in-memory replay cache
//     for the TTL window. (For multi-instance deployments, swap the
//     Map for a Vercel KV-backed store — same API.)
// ============================================================

export interface ClientSessionPayload {
  clientId: string;
  issuedAt: number;
}

export interface ClientPublicInfo {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  wilaya: string | null;
  type_client: string | null;
}

export const CLIENT_COOKIE_NAME = "odg_client";
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const CLIENT_MAGIC_TOKEN_MAX_AGE = 15 * 60; // 15 minutes

const MAGIC_PREFIX = "m";

export interface ClientMagicPayload {
  clientId: string;
  issuedAt: number;
  nonce: string;
}

// ---- Single-use nonce cache (audit §2.10) ----
// Key: nonce. Value: timestamp. GC'd lazily on each verify call.
const consumedNonces = new Map<string, number>();

function gcNonces(): void {
  const now = Date.now();
  // Keep entries for 2× the TTL to detect replays just past expiry.
  const cutoff = now - CLIENT_MAGIC_TOKEN_MAX_AGE * 2 * 1000;
  for (const [k, t] of consumedNonces) {
    if (t < cutoff) consumedNonces.delete(k);
  }
}

function clientSecret(): string {
  return serverEnv.CLIENT_SECRET;
}

// ---- Session token signing (delegated to lib/auth/jwt.ts) ----
export function createClientSessionToken(clientId: string): string {
  const payload = base64urlEncode(
    JSON.stringify({ clientId, issuedAt: Math.floor(Date.now() / 1000) })
  );
  return signToken(payload, clientSecret());
}

function decodeClientPayload(payload: string): ClientSessionPayload | null {
  try {
    const data = JSON.parse(base64urlDecode(payload)) as ClientSessionPayload;
    if (!data.clientId) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - (data.issuedAt || 0) > CLIENT_SESSION_MAX_AGE) return null;
    return data;
  } catch {
    return null;
  }
}

// ---- Magic-link tokens (single-use via nonce) ----
export function createClientMagicToken(clientId: string): string {
  const json = JSON.stringify({
    cid: clientId,
    iat: Math.floor(Date.now() / 1000),
    nonce: randomNonce(),
  });
  // The MAGIC_PREFIX is INSIDE the signed payload, so an attacker
  // cannot strip it without invalidating the signature.
  const payload = MAGIC_PREFIX + base64urlEncode(json);
  return signToken(payload, clientSecret());
}

function randomNonce(): string {
  // 16 random bytes hex = 32 chars. Sufficient collision resistance
  // for a 15-min TTL.
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function verifyClientMagicToken(
  token: string | undefined | null
): ClientMagicPayload | null {
  const decoded = verifyToken(
    token,
    clientSecret(),
    (payload: string): ClientMagicPayload | null => {
      if (!payload.startsWith(MAGIC_PREFIX)) return null;
      try {
        const json = base64urlDecode(payload.slice(MAGIC_PREFIX.length));
        const data = JSON.parse(json) as {
          cid?: string;
          iat?: number;
          nonce?: string;
        };
        if (!data.cid || !data.nonce) return null;
        const now = Math.floor(Date.now() / 1000);
        if (now - (data.iat || 0) > CLIENT_MAGIC_TOKEN_MAX_AGE) return null;
        return {
          clientId: data.cid,
          issuedAt: data.iat || 0,
          nonce: data.nonce,
        };
      } catch {
        return null;
      }
    }
  );
  if (!decoded) return null;

  // Single-use: reject if the nonce has already been consumed.
  gcNonces();
  if (consumedNonces.has(decoded.nonce)) {
    return null;
  }
  consumedNonces.set(decoded.nonce, Date.now());
  return decoded;
}

// ---- Cookie helpers ----
export function getClientCookieOptions() {
  return sessionCookieOptions(CLIENT_SESSION_MAX_AGE);
}

// ---- Request verification ----
/**
 * Verify the client session cookie. Returns the SessionPayload
 * (with clientId) if valid, otherwise null.
 */
export function verifyClientSession(request: Request): ClientSessionPayload | null {
  const cookies = parseCookies(request);
  return verifyToken(cookies[CLIENT_COOKIE_NAME], clientSecret(), decodeClientPayload);
}

/**
 * Normalize a phone number to its last 4 digits (digits only).
 * "0540 12 34 56" → "3456". Returns "" if the input has fewer than
 * 4 digits total.
 */
export function last4Digits(input: string): string {
  const digits = (input || "").replace(/\D+/g, "");
  if (digits.length < 4) return "";
  return digits.slice(-4);
}

/**
 * Look up a client by email. Returns the public-safe fields (no
 * `notes`, no `commercial_id`). Returns null if the table is missing
 * or the email is unknown.
 */
export async function findClientByEmail(
  email: string
): Promise<ClientPublicInfo | null> {
  let client;
  try {
    client = getServerClient();
  } catch {
    return null;
  }
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("clients")
      .select("id, nom, email, telephone, wilaya, type_client")
      .eq("email", email.toLowerCase().trim())
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as ClientPublicInfo;
  } catch {
    return null;
  }
}

/**
 * Authenticate a client by email + last-4 digits of their phone.
 *
 * Returns `{ client, token }` on success, null on failure.
 *
 * NOTE: the 4-digit space (10 000 codes) is small — pair this with
 * rate limiting (`enforceLimit` from `lib/auth/rate-limit.ts`) on
 * the /api/client/login route.
 */
export async function authenticateClient(
  email: string,
  phoneLast4: string
): Promise<{ client: ClientPublicInfo; token: string } | null> {
  const code = last4Digits(phoneLast4);
  if (!code) return null;
  const client = await findClientByEmail(email);
  if (!client) return null;
  const storedLast4 = last4Digits(client.telephone || "");
  if (!storedLast4) return null;
  // Constant-time compare (both 4-char hex-ish strings).
  const a = Buffer.from(code);
  const b = Buffer.from(storedLast4);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const token = createClientSessionToken(client.id);
  return { client, token };
}
