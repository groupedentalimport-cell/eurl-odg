import { createHmac, timingSafeEqual } from "crypto";
import { getServerClient } from "./supabase";

// ============================================================
// Client portal authentication (server-side only)
// ============================================================
// (Task BONUS-2-3)
//
// Clients log in with their email + the last 4 digits of the phone
// number we have on file. No password, no email-sending — simple,
// works on Vercel, and matches the security level of a typical
// Algerian small-business CRM (a 4-digit code over a known email is
// a low-stakes gate that protects viewing of devis/commandes only —
// no write operations, no payments).
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
//  - different max age (12h vs 24h — clients should re-log more often)
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
const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12h

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
