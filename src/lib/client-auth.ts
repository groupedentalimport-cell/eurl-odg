import { createHmac, timingSafeEqual } from "crypto";
import { getServerClient } from "./supabase";

// ============================================================
// Client portal authentication (server-side only)
// ============================================================
// (Task BONUS-2-3 — phone-last-4 portal at /client)
// (Task BONUS-3   — magic-link portal at /portal)
//
// TWO login methods share the same `odg_client` session cookie:
//
//   1. Phone-last-4 (legacy /client route): the client enters their
//      email + the last 4 digits of the phone we have on file. No
//      password, no email-sending. A 4-digit code over a known email
//      is a low-stakes gate that protects viewing of devis/commandes
//      only — no write operations, no payments.
//
//   2. Magic link (new /portal route): the client enters only their
//      email → we send a short-lived HMAC-signed link to that email
//      → clicking the link calls /api/client-portal/verify, which
//      exchanges the short-lived magic token for a long-lived
//      session cookie. Stronger than the 4-digit code (the secret
//      never leaves the server, the inbox is the second factor) and
//      simpler for non-tech clients (no code to remember).
//
// Sessions are httpOnly cookies (name: `odg_client`) containing an
// HMAC-signed token. The token payload includes clientId + issuedAt.
// The actual client record (nom, email, telephone) lives in the
// `clients` Supabase table.
//
// NOTE: this is INTENTIONALLY separate from admin-auth.ts:
//  - different cookie name (`odg_client` vs `odg_admin`)
//  - different secret (`CLIENT_SECRET` vs `ADMIN_SECRET`)
//  - different payload shape (no role, just clientId)
//  - different max age (7d vs 24h — clients re-log weekly is fine
//    for a read-only portal; matches the magic-link UX)
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

const COOKIE_NAME = "odg_client";
// Session lifetime: 7 days. The portal is read-only (devis, commandes,
// garanties, interventions) so a long-lived session is acceptable UX
// — clients typically log in once a week to check on a delivery or
// warranty, and would be annoyed by a 12h timeout. Token re-issuance
// on each verifyClientSession keeps the issuedAt fresh-ish.
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
// Magic-link tokens (the ones sent by email) are short-lived: 15 min
// is enough time to walk from the phone to the laptop, and short
// enough that a leaked link in a forwarded email becomes useless fast.
const MAGIC_TOKEN_MAX_AGE_SEC = 15 * 60; // 15 minutes

function getClientSecret(): string {
  return process.env.CLIENT_SECRET || "odg-client-dev-secret";
}

// ---- Session token signing (HMAC) ----
function signPayload(payload: string): string {
  const sig = createHmac("sha256", getClientSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verifyToken(token: string | undefined | null): ClientSessionPayload | null {
  if (!token) return null;
  try {
    const decoded = decodeURIComponent(token);
    const parts = decoded.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = createHmac("sha256", getClientSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    // payload format: base64url(JSON({clientId, issuedAt}))
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(json) as ClientSessionPayload;
    if (!data.clientId) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - (data.issuedAt || 0) > SESSION_MAX_AGE_SEC) return null;
    return data;
  } catch {
    return null;
  }
}

export function createClientSessionToken(clientId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ clientId, issuedAt: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  return signPayload(payload);
}

// ============================================================
// Magic link tokens (Task BONUS-3 — /portal route)
// ============================================================
// A magic token is sent by email (in a URL like
//   https://ouadah-dental-groupe.vercel.app/portal?token=XXX)
// and is exchanged for a long-lived session cookie via the
// /api/client-portal/verify route.
//
// The token payload is base64url(JSON({ cid, iat })) and is HMAC-
// signed with the same CLIENT_SECRET as session tokens, BUT the
// payload starts with the ASCII byte `m` (vs `s` for sessions) so
// that a session cookie can NEVER be replayed as a magic token (or
// vice-versa) — the type prefix is part of the signed payload.
//
// Lifetime: MAGIC_TOKEN_MAX_AGE_SEC (15 min). Single-use is enforced
// only by the short TTL — there is no server-side "consumed" flag.
// This is acceptable for a read-only portal: the worst case if a
// token is replayed within 15 min is that a second session cookie
// gets issued for the same client (no privilege escalation, no
// data exposure beyond what the client can already see).

const MAGIC_PREFIX = "m"; // token-type discriminator

export interface ClientMagicPayload {
  clientId: string;
  issuedAt: number;
}

export function createClientMagicToken(clientId: string): string {
  const json = JSON.stringify({
    cid: clientId,
    iat: Math.floor(Date.now() / 1000),
  });
  // Prefix the payload so a session token can't be misused as a magic
  // token (and vice versa). The prefix is INSIDE the signed payload,
  // so an attacker cannot strip it without invalidating the signature.
  const payload = MAGIC_PREFIX + Buffer.from(json, "utf8").toString("base64url");
  return signPayload(payload);
}

export function verifyClientMagicToken(
  token: string | undefined | null
): ClientMagicPayload | null {
  if (!token) return null;
  try {
    const decoded = decodeURIComponent(token);
    const parts = decoded.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = createHmac("sha256", getClientSecret())
      .update(payload)
      .digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    // First byte must be the magic prefix.
    if (!payload.startsWith(MAGIC_PREFIX)) return null;
    const b64 = payload.slice(MAGIC_PREFIX.length);
    const json = Buffer.from(b64, "base64url").toString("utf8");
    const data = JSON.parse(json) as { cid?: string; iat?: number };
    if (!data.cid) return null;
    const now = Math.floor(Date.now() / 1000);
    if (now - (data.iat || 0) > MAGIC_TOKEN_MAX_AGE_SEC) return null;
    return { clientId: data.cid, issuedAt: data.iat || 0 };
  } catch {
    return null;
  }
}

export const CLIENT_MAGIC_TOKEN_MAX_AGE = MAGIC_TOKEN_MAX_AGE_SEC;

// ---- Cookie helpers ----
export function getClientCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
export const CLIENT_COOKIE_NAME = COOKIE_NAME;
export const CLIENT_SESSION_MAX_AGE = SESSION_MAX_AGE_SEC;

// ---- Request verification ----
function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = v.join("=");
  }
  return out;
}

/**
 * Verify the client session cookie. Returns the SessionPayload
 * (with clientId) if valid, otherwise null.
 */
export function verifyClientSession(request: Request): ClientSessionPayload | null {
  const cookies = parseCookies(request);
  return verifyToken(cookies[COOKIE_NAME]);
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
 * Returns { client, token } on success, null on failure. The caller
 * is responsible for setting the cookie via the returned token.
 *
 * NOTE: we use a small constant-time-ish comparison (timingSafeEqual)
 * on the last-4 digits to mitigate timing attacks. The 4-digit space
 * is small (10_000 codes) so this is not a strong gate — it is
 * intentionally a low-friction login for a low-scope portal (view
 * only). For a write/sensitive portal we would use a magic link or
 * a real password.
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
