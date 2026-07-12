/**
 * Shared cookie parser.
 *
 * WHY: `parseCookies` was duplicated verbatim in `admin-auth.ts:122-130`
 * and `client-auth.ts:190-198` — same body, same shape. Centralising it
 * removes one of the most copy-pasted snippets in the codebase.
 *
 * This module is server-only — never import from a Client Component.
 */

export type CookieMap = Record<string, string>;

/**
 * Parse the `cookie` header of a Request into a plain object.
 * Returns `{}` when the header is missing or malformed.
 */
export function parseCookies(request: Request): CookieMap {
  const cookieHeader = request.headers.get("cookie") || "";
  const out: CookieMap = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = v.join("=");
  }
  return out;
}

/** Read a single cookie by name (URL-decoded). Returns null if missing. */
export function getCookie(request: Request, name: string): string | null {
  const raw = parseCookies(request)[name];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: "/";
  maxAge: number;
}

/** Build standard session-cookie options for the given max age. */
export function sessionCookieOptions(maxAgeSec: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  };
}
