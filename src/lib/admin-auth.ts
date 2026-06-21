import { createHmac, timingSafeEqual } from "crypto";

// Admin authentication — server-side only.
//
// Required env vars (set on Vercel + in .env locally):
//   ADMIN_PASSWORD  — the admin login password (default: "odg-admin-2026")
//   ADMIN_SECRET    — a random secret used to sign session cookies (default: derived)
//
// The session is an httpOnly cookie `odg_admin` containing an HMAC-signed token.
// The token is valid for 24h. API routes call `verifyAdmin(request)` to gate access.

const COOKIE_NAME = "odg_admin";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "odg-admin-2026";
}

function getAdminSecret(): string {
  // In production, set ADMIN_SECRET to a long random string.
  // Fallback (dev only) derives from the password so dev works out of the box.
  return (
    process.env.ADMIN_SECRET ||
    "odg-dev-secret-" + getAdminPassword()
  );
}

function sign(payload: string): string {
  const sig = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function verify(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;

  // payload format: "admin:<issuedAtTs>"
  const m = payload.match(/^admin:(\d+)$/);
  if (!m) return false;
  const issuedAt = Number(m[1]);
  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > SESSION_MAX_AGE_SEC) return false; // expired

  const expectedSig = createHmac("sha256", getAdminSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyPassword(password: string): boolean {
  const expected = getAdminPassword();
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  const payload = `admin:${Math.floor(Date.now() / 1000)}`;
  return sign(payload);
}

export function verifyAdmin(request: Request): boolean {
  // In Next.js, cookies are accessible via the `cookie` header or the
  // request's cookies. For route handlers, we parse the Cookie header.
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  let raw = cookies[COOKIE_NAME];
  if (!raw) return false;
  // Browsers URL-encode cookie values (`:` → `%3A`). Decode before verifying
  // so the payload regex `^admin:(\d+)$` matches.
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // malformed encoding — treat as invalid
    return false;
  }
  return verify(raw);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_MAX_AGE = SESSION_MAX_AGE_SEC;

export function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
